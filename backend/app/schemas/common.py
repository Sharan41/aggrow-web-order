"""Schema helpers — avoid pydantic EmailStr rejecting valid internal emails (e.g. *.local)."""

from typing import Annotated

from pydantic import AfterValidator


def _normalize_login_email(v: str) -> str:
    v = (v or "").strip()
    if v.count("@") != 1:
        raise ValueError("Invalid email address")
    local, domain = v.split("@", 1)
    if not local or not domain:
        raise ValueError("Invalid email address")
    return v.lower()


# Use instead of EmailStr anywhere users may use RFC-"special" domains like .local
FlexibleEmail = Annotated[str, AfterValidator(_normalize_login_email)]
