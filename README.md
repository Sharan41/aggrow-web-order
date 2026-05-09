# AG Grow Web Order System

A 3-role web ordering application that replicates the AG Grow Excel order form as
an interactive web UI, routes each order through a Customer → Head Office → Factory
workflow, and sends in-app + email notifications on every handoff.

## Architecture overview

| Layer      | Tech                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| Database   | PostgreSQL 16 (prod), SQLite (local dev / tests)                           |
| Backend    | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, Passlib/bcrypt, JWT, fastapi-mail |
| Frontend   | React 18 + TypeScript, Vite, Tailwind, TanStack Query, React Router         |
| Auth       | Email + password → JWT access + refresh. Role enum: CUSTOMER / HEAD_OFFICE / FACTORY. The auth layer is isolated (`app/core/security.py`) so Google / Microsoft SSO can plug in later without touching routes. |
| Notifications | Stored in `notifications` table + polled by frontend bell + async SMTP via `fastapi-mail` (toggle `MAIL_ENABLED`) |

### Workflow state machine

```
DRAFT
  └─(customer submit)──► SUBMITTED_TO_HO
                           ├─(ho reject)──► REJECTED (terminal)
                           └─(ho edit + forward)──► HO_FORWARDED
                                                    └─(factory respond)──► COMPLETED (terminal)
```

- On **SUBMITTED_TO_HO** → all active Head Office users get a notification + email.
- On **HO_FORWARDED** → all active Factory users get a notification + email.
- On **COMPLETED** (after factory response) → the originating Customer **and** all
  Head Office users get a notification + email.
- On **REJECTED** → the originating Customer is notified.

### Data model

A single `order_items` row stores all three actors' views so nothing is duplicated:

```
order_items(product_id, size_label,
            customer_qty,         -- what the customer requested
            ho_qty,               -- what the Head Office approved / edited
            factory_available,    -- true/false set by Factory
            factory_item_note)    -- Factory's reason when not available
```

Catalog is modeled to match the Excel's grouped layout:

```
categories
  └── packing_groups (column_headers JSONB, e.g. ["30ml","50ml","100ml","1ltr"])
        └── products
              └── product_packings (the "X" cells from the Excel)
```

### Factory view rule

Factory only ever sees rows/columns where `ho_qty > 0`, exactly as specified
(the UI filters rows and columns; the backend also enforces it in
`factory_respond`).

## Local setup (no Docker)

Requirements: Python 3.11+, Node 18+, Postgres (or use SQLite).

```bash
# 1) Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # SQLite is the default — no Postgres required locally

alembic upgrade head
python -m app.db.seed "../AG - ORDER FORM excel.xlsx"
python -m app.db.bootstrap_admin admin@aggrow.local "ChangeMe123!" "Site Admin"

uvicorn app.main:app --reload --port 8000
```

```bash
# 2) Frontend
cd frontend
npm install
npm run dev      # serves at http://localhost:5173, proxies /api -> :8000
```

Log in as `admin@aggrow.local / ChangeMe123!` (Head Office). From **Users &
Branches** you can create the Customer and Factory accounts for your teams.

## Docker setup

```bash
cp backend/.env.example backend/.env
docker compose up --build
# backend http://localhost:8000 · frontend http://localhost:5173

# inside backend container (first run only):
docker compose exec backend python -m app.db.seed "/app/AG - ORDER FORM excel.xlsx"
docker compose exec backend python -m app.db.bootstrap_admin admin@aggrow.local "ChangeMe123!" "Site Admin"
```

## API surface (served at `http://localhost:8000`)

- `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `GET /catalog` (any user) · `POST/PATCH/DELETE /catalog/{categories|packing-groups|products}` (Head Office only)
- `GET/POST /branches`, `GET/POST/PATCH /users` (Head Office only)
- Orders:
  - `POST /orders` (Customer) · `PATCH /orders/{id}` (Customer, DRAFT only) · `POST /orders/{id}/submit`
  - `PATCH /orders/{id}/ho` · `POST /orders/{id}/forward` · `POST /orders/{id}/reject` (Head Office)
  - `POST /orders/{id}/respond` (Factory)
  - `GET /orders` role-scoped · `GET /orders/{id}` · `GET /orders/kpis` (Head Office)
- `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`

Swagger UI: <http://localhost:8000/docs>.

## Troubleshooting

### `password authentication failed for user "aggrow"`

Your `backend/.env` is pointing at PostgreSQL with user/password **aggrow**, but your local Postgres does not have that role or password.

**Fix A (simplest):** Open `backend/.env` and set:

```
DATABASE_URL=sqlite:///./aggrow.db
```

Then run `alembic upgrade head` and seed again.

**Fix B:** Keep Postgres but update `DATABASE_URL` to a user and database that actually exist on your machine (often your macOS username with peer/trust auth, or whatever you created in pgAdmin).

**Fix C:** Run `docker compose up db` from this repo so Postgres matches `aggrow:aggrow`, then use the Postgres URL from `.env.example` comments.

### `POST /auth/login` returns **422 Unprocessable Content**

Common causes:

1. **Wrong body shape for the endpoint**
   - **`/auth/login`** expects **JSON**: `{ "email": "...", "password": "..." }` with `Content-Type: application/json`. The React app uses this.
   - **Swagger “Authorize”** sends **form** data (`username` + `password`). That hits **`POST /auth/login/form`** — put your **email** in **username**.

2. **`.local` emails (e.g. `admin@aggrow.local`)** — older pydantic `EmailStr` rejected these; the API now accepts them via a relaxed validator.

```bash
# JSON login (matches frontend / curl JSON)
curl -s http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aggrow.local","password":"YourPassword!"}'

# Form login (matches Swagger / OAuth2 tools)
curl -s http://127.0.0.1:8000/auth/login/form \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@aggrow.local&password=YourPassword!"
```

## Tests

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Covers: auth & refresh, role guards, three-way workflow happy path, the
factory-filter enforcement, and the reject flow.

## Customizing the catalog

Two ways:

1. **Head Office → Catalog page** lets admins add/remove categories, packing
   groups, products, and toggle the `X` (available) matrix.
2. Re-run the seeder after updating the Excel: it overwrites the catalog tables.
   Existing orders reference products by id, so re-seeding will either reuse
   ids or cascade — for a live system prefer the UI, and use the seeder only
   for the initial load.

## Project structure

```
AG GROW WEB ORDER/
├── AG - ORDER FORM excel.xlsx        # source catalog (seeded)
├── ag grow web order form.pdf        # reference
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── core/         # config, db, security, role-guard deps
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic request/response
│   │   ├── api/          # auth / users / catalog / orders / notifications
│   │   ├── services/     # order_workflow, notification fan-out, email, excel parser
│   │   └── db/           # seed + bootstrap_admin
│   ├── alembic/          # migrations
│   ├── tests/
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/          # axios client + typed endpoint modules
        ├── auth/         # AuthContext + RoleRoute
        ├── components/   # OrderFormTable, NotificationBell, AppLayout, StatusBadge
        ├── pages/
        │   ├── customer/
        │   ├── headOffice/
        │   └── factory/
        └── routes.tsx
```

## Deferred (clean extension points left in code)

- Google / Microsoft SSO — auth is isolated behind `app/core/security.py` and a
  role claim so adding OAuth only touches `app/api/auth.py`.
- WebSocket push — `NotificationBell` polls every 20 s; swap the hook to an
  SSE/WebSocket listener.
- PDF export of the final order.
- i18n and mobile-optimized layout.
