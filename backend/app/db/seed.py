"""Seed catalog data from Excel files.

Usage::

    python -m app.db.seed                                    # AG GROW default path
    python -m app.db.seed AG_GROW "/path/to/ag-grow.xlsx"
    python -m app.db.seed SULFAG "/path/to/sulfag.xlsx"
    python -m app.db.seed --all                              # seed both catalogs
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Category, OrderFormType, PackingGroup, Product, ProductPacking
from app.services.excel_import import parse_excel


def _delete_catalog(db: Session, catalog_type: OrderFormType) -> None:
    cats = db.execute(select(Category).where(Category.catalog_type == catalog_type)).scalars().all()
    for cat in cats:
        db.delete(cat)
    db.flush()


def seed_from_excel(db: Session, path: Path, catalog_type: OrderFormType = OrderFormType.AG_GROW) -> None:
    groups = parse_excel(path)
    if not groups:
        print(f"No groups parsed from {path}")
        return

    _delete_catalog(db, catalog_type)

    cat_order: dict[str, int] = {}
    categories: dict[str, Category] = {}

    for i, g in enumerate(groups):
        if g.category not in cat_order:
            cat_order[g.category] = len(cat_order)
            cat = Category(
                name=g.category,
                catalog_type=catalog_type,
                display_order=cat_order[g.category],
            )
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
        f"Seeded [{catalog_type.value}] from {path.name}: {len(categories)} categories, "
        f"{len(groups)} packing groups, {sum(len(g.products) for g in groups)} products."
    )


def main(argv: list[str] | None = None) -> None:
    argv = argv or sys.argv[1:]
    settings = get_settings()

    if not argv or argv[0] == "--all":
        with SessionLocal() as db:
            ag_path = Path(settings.CATALOG_EXCEL_PATH)
            sf_path = Path(settings.SULFAG_CATALOG_EXCEL_PATH)
            if ag_path.exists():
                seed_from_excel(db, ag_path, OrderFormType.AG_GROW)
            else:
                print(f"AG GROW Excel not found: {ag_path}")
            if sf_path.exists():
                seed_from_excel(db, sf_path, OrderFormType.SULFAG)
            else:
                print(f"Sulfag Excel not found: {sf_path}")
        return

    catalog_type = OrderFormType.AG_GROW
    if argv[0] in OrderFormType.__members__:
        catalog_type = OrderFormType[argv[0]]
        if len(argv) > 1:
            path = Path(argv[1])
        elif catalog_type == OrderFormType.SULFAG:
            path = Path(settings.SULFAG_CATALOG_EXCEL_PATH)
        else:
            path = Path(settings.CATALOG_EXCEL_PATH)
    else:
        path = Path(argv[0])

    if not path.exists():
        raise SystemExit(f"Excel file not found: {path}")
    with SessionLocal() as db:
        seed_from_excel(db, path, catalog_type)


if __name__ == "__main__":
    main()
