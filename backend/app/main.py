from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api import auth, catalog, notifications, orders, users
from app.core.config import Settings, get_settings
from app.core.db import SessionLocal
from app.db.seed import seed_from_excel
from app.models import Category
from app.models.form_type import OrderFormType

settings = get_settings()


def _ensure_catalogs() -> None:
    """Seed any catalog that is empty when its Excel source file is available."""
    pairs = [
        (OrderFormType.AG_GROW, Path(settings.CATALOG_EXCEL_PATH)),
        (OrderFormType.SULFAG, Path(settings.SULFAG_CATALOG_EXCEL_PATH)),
    ]
    with SessionLocal() as db:
        for form_type, path in pairs:
            count = db.execute(
                select(func.count()).select_from(Category).where(Category.catalog_type == form_type)
            ).scalar_one()
            if count == 0 and path.exists():
                seed_from_excel(db, path, form_type)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _ensure_catalogs()
    yield


def cors_allow_origins(s: Settings) -> list[str]:
    """JWT + credentials require explicit origins; keep dev + deployed Render SPA."""
    aggrow_deployed_frontends = (
        # Production SPA on Render (override via FRONTEND_ORIGIN / EXTRA_CORS_ORIGINS if this changes)
        "https://aggrow-web-order-frontend.onrender.com",
    )
    out: list[str] = []
    for origin in (
        s.FRONTEND_ORIGIN,
        *aggrow_deployed_frontends,
        *(x.strip() for x in s.EXTRA_CORS_ORIGINS.split(",") if x.strip()),
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ):
        if origin and origin not in out:
            out.append(origin)
    return out


app = FastAPI(title="AG Grow Web Order API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins(settings),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(catalog.router)
app.include_router(orders.router)
app.include_router(notifications.router)
