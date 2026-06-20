"""Create or reset the bootstrap Admin user.

Usage::

    python -m app.db.bootstrap_admin admin@aggrow.local "StrongPass123" "Site Admin"
"""
from __future__ import annotations

import sys

from sqlalchemy import func, select

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
    name = argv[2] if len(argv) > 2 else "Admin"

    with SessionLocal() as db:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        other_admin_count = db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.ADMIN,
                User.email != email,
            )
        ).scalar_one()

        if existing:
            if existing.role == UserRole.ADMIN:
                existing.password_hash = hash_password(password)
                existing.name = name
                existing.active = True
                print(f"Updated existing admin user {email}.")
            else:
                if other_admin_count > 0:
                    raise SystemExit(
                        "Another admin user already exists. Remove or demote it before promoting this account."
                    )
                existing.password_hash = hash_password(password)
                existing.name = name
                existing.role = UserRole.ADMIN
                existing.active = True
                print(f"Promoted existing user {email} to ADMIN.")
        else:
            if other_admin_count > 0:
                raise SystemExit(
                    "Another admin user already exists. Only one admin account is allowed."
                )
            user = User(
                email=email,
                password_hash=hash_password(password),
                name=name,
                role=UserRole.ADMIN,
                active=True,
            )
            db.add(user)
            print(f"Created ADMIN user {email}.")
        db.commit()


if __name__ == "__main__":
    main()
