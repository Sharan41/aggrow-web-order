from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./aggrow.db"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    FRONTEND_ORIGIN: str = "http://localhost:5173"
    # Comma-separated extra origins (staging, preview URLs, etc.)
    EXTRA_CORS_ORIGINS: str = ""

    MAIL_ENABLED: bool = False
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "no-reply@aggrow.local"
    MAIL_FROM_NAME: str = "AG Grow Orders"
    MAIL_SERVER: str = "localhost"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    CATALOG_EXCEL_PATH: str = "../AG - ORDER FORM excel.xlsx"


@lru_cache
def get_settings() -> Settings:
    return Settings()
