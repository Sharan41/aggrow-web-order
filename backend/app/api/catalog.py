from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_role
from app.models import Category, PackingGroup, Product, ProductPacking, User, UserRole
from app.schemas.catalog import (
    CatalogRead,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    PackingGroupCreate,
    PackingGroupRead,
    PackingGroupUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)

router = APIRouter(prefix="/catalog", tags=["catalog"])
ho_only = require_role(UserRole.HEAD_OFFICE)


@router.get("", response_model=CatalogRead)
def get_catalog(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> CatalogRead:
    rows = db.execute(
        select(Category)
        .options(
            selectinload(Category.packing_groups)
            .selectinload(PackingGroup.products)
            .selectinload(Product.packings)
        )
        .order_by(Category.display_order, Category.name)
    ).scalars().all()
    return CatalogRead(categories=[CategoryRead.model_validate(c) for c in rows])


# ---------- categories ----------

@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> CategoryRead:
    if db.execute(select(Category).where(Category.name == body.name)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Category with this name already exists")
    cat = Category(**body.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryRead.model_validate(cat)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(ho_only),
) -> CategoryRead:
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return CategoryRead.model_validate(cat)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> None:
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()


# ---------- packing groups ----------

@router.post("/packing-groups", response_model=PackingGroupRead, status_code=status.HTTP_201_CREATED)
def create_packing_group(
    body: PackingGroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(ho_only),
) -> PackingGroupRead:
    if not db.get(Category, body.category_id):
        raise HTTPException(status_code=400, detail="Category not found")
    pg = PackingGroup(**body.model_dump())
    db.add(pg)
    db.commit()
    db.refresh(pg)
    return PackingGroupRead.model_validate(pg)


@router.patch("/packing-groups/{group_id}", response_model=PackingGroupRead)
def update_packing_group(
    group_id: int,
    body: PackingGroupUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(ho_only),
) -> PackingGroupRead:
    pg = db.get(PackingGroup, group_id)
    if not pg:
        raise HTTPException(status_code=404, detail="Packing group not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(pg, k, v)
    db.commit()
    db.refresh(pg)
    return PackingGroupRead.model_validate(pg)


@router.delete("/packing-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packing_group(group_id: int, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> None:
    pg = db.get(PackingGroup, group_id)
    if not pg:
        raise HTTPException(status_code=404, detail="Packing group not found")
    db.delete(pg)
    db.commit()


# ---------- products ----------

def _sync_packings(db: Session, product: Product, sizes: list[str] | None) -> None:
    if sizes is None:
        return
    existing = {p.size_label: p for p in product.packings}
    desired = set(sizes)
    for label, p in list(existing.items()):
        if label not in desired:
            db.delete(p)
    for label in desired:
        if label not in existing:
            db.add(ProductPacking(product_id=product.id, size_label=label, available=True))


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> ProductRead:
    pg = db.get(PackingGroup, body.packing_group_id)
    if not pg:
        raise HTTPException(status_code=400, detail="Packing group not found")
    invalid = [s for s in body.available_sizes if s not in pg.column_headers]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Sizes not in group headers: {invalid}")
    product = Product(
        packing_group_id=body.packing_group_id,
        s_no=body.s_no,
        name=body.name,
        packing_type=body.packing_type,
        display_order=body.display_order,
        active=body.active,
    )
    db.add(product)
    db.flush()
    for size in body.available_sizes:
        db.add(ProductPacking(product_id=product.id, size_label=size, available=True))
    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(ho_only),
) -> ProductRead:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    data = body.model_dump(exclude_unset=True)
    sizes = data.pop("available_sizes", None)
    if sizes is not None:
        pg = db.get(PackingGroup, product.packing_group_id)
        invalid = [s for s in sizes if s not in (pg.column_headers if pg else [])]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Sizes not in group headers: {invalid}")
    for k, v in data.items():
        setattr(product, k, v)
    _sync_packings(db, product, sizes)
    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(ho_only)) -> None:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
