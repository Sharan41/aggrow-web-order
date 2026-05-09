"""Seed the catalog from the AG Grow Excel file.

Usage::

    python -m app.db.seed                                # uses CATALOG_EXCEL_PATH
    python -m app.db.seed "/path/to/AG - ORDER FORM.xlsx"
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Category, PackingGroup, Product, ProductPacking
from app.services.excel_import import parse_excel


def seed_from_excel(db: Session, path: Path) -> None:
    groups = parse_excel(path)
    if not groups:
        print(f"No groups parsed from {path}")
        return

    db.query(ProductPacking).delete()
    db.query(Product).delete()
    db.query(PackingGroup).delete()
    db.query(Category).delete()
    db.flush()

    cat_order: dict[str, int] = {}
    categories: dict[str, Category] = {}

    for i, g in enumerate(groups):
        if g.category not in cat_order:
            cat_order[g.category] = len(cat_order)
            cat = Category(name=g.category, display_order=cat_order[g.category])
            db.add(cat)
            db.flush()
            categories[g.category] = cat
        cat = categories[g.category]

        pg = PackingGroup(
            category_id=cat.id,
            label=g.label,
            column_headers=g.column_headers,
            display_order=i,
        )
        db.add(pg)
        db.flush()

        for j, p in enumerate(g.products):
            product = Product(
                packing_group_id=pg.id,
                s_no=p.s_no,
                name=p.name,
                packing_type=p.packing_type,
                display_order=j,
            )
            db.add(product)
            db.flush()
            for size in p.available_sizes:
                db.add(ProductPacking(product_id=product.id, size_label=size, available=True))

    db.commit()
    print(
        f"Seeded {len(categories)} categories, {len(groups)} packing groups, "
        f"{sum(len(g.products) for g in groups)} products."
    )


def main(argv: list[str] | None = None) -> None:
    argv = argv or sys.argv[1:]
    settings = get_settings()
    path = Path(argv[0]) if argv else Path(settings.CATALOG_EXCEL_PATH)
    if not path.exists():
        raise SystemExit(f"Excel file not found: {path}")
    with SessionLocal() as db:
        seed_from_excel(db, path)


if __name__ == "__main__":
    main()
