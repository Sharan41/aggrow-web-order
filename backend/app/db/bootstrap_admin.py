"""Create or reset an Admin user.

Usage::

    python -m app.db.bootstrap_admin admin@aggrow.local "StrongPass123" "Site Admin"
    python -m app.db.bootstrap_admin admin@aggrow.local "StrongPass123" "Site Admin" "9876543210"
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
            "Usage: python -m app.db.bootstrap_admin <email> <password> [name] [mobile_number]"
        )
    email, password = argv[0], argv[1]
    name = argv[2] if len(argv) > 2 else "Admin"
    mobile_number = argv[3].strip() if len(argv) > 3 and argv[3].strip() else None

    with SessionLocal() as db:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

        if existing:
            existing.password_hash = hash_password(password)
            existing.name = name
            existing.role = UserRole.ADMIN
            existing.active = True
            if mobile_number is not None:
                existing.mobile_number = mobile_number
            print(f"Updated admin user {email}.")
        else:
            user = User(
                email=email,
                password_hash=hash_password(password),
                name=name,
                mobile_number=mobile_number,
                role=UserRole.ADMIN,
                active=True,
            )
            db.add(user)
            print(f"Created ADMIN user {email}.")
        db.commit()


if __name__ == "__main__":
    main()
