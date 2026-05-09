"""Create or reset the bootstrap Head Office admin user.

Usage::

    python -m app.db.bootstrap_admin admin@aggrow.local "StrongPass123" "Site Admin"
"""
from __future__ import annotations

import sys

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User, UserRole


def main(argv: list[str] | None = None) -> None:
    argv = argv or sys.argv[1:]
    if len(argv) < 2:
        raise SystemExit(
            "Usage: python -m app.db.bootstrap_admin <email> <password> [name]"
        )
    email, password = argv[0], argv[1]
    name = argv[2] if len(argv) > 2 else "Head Office Admin"

    with SessionLocal() as db:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing:
            existing.password_hash = hash_password(password)
            existing.name = name
            existing.role = UserRole.HEAD_OFFICE
            existing.active = True
            print(f"Updated existing user {email} as HEAD_OFFICE admin.")
        else:
            user = User(
                email=email,
                password_hash=hash_password(password),
                name=name,
                role=UserRole.HEAD_OFFICE,
                active=True,
            )
            db.add(user)
            print(f"Created HEAD_OFFICE admin {email}.")
        db.commit()


if __name__ == "__main__":
    main()
