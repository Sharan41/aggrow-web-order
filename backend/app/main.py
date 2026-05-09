from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, catalog, notifications, orders, users
from app.core.config import Settings, get_settings

settings = get_settings()


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


app = FastAPI(title="AG Grow Web Order API", version="0.1.0")

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
