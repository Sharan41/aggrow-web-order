from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, catalog, notifications, orders, users
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="AG Grow Web Order API", version="0.1.0")

origins = {settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
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
