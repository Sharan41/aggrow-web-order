from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models._types import JSONType
from app.models.form_type import OrderFormType


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("catalog_type", "name", name="uq_category_catalog_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    catalog_type: Mapped[OrderFormType] = mapped_column(
        Enum(OrderFormType, name="order_form_type"), default=OrderFormType.AG_GROW, nullable=False, index=True
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    packing_groups: Mapped[list["PackingGroup"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="PackingGroup.display_order",
    )


class PackingGroup(Base):
    """One section of the Excel with a distinct set of size columns.

    column_headers is the ordered list of size labels, e.g. ["30ml","50ml",...].
    """

    __tablename__ = "packing_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    column_headers: Mapped[list[str]] = mapped_column(JSONType, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    category: Mapped[Category] = relationship(back_populates="packing_groups")
    products: Mapped[list["Product"]] = relationship(
        back_populates="packing_group",
        cascade="all, delete-orphan",
        order_by="Product.display_order",
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    packing_group_id: Mapped[int] = mapped_column(
        ForeignKey("packing_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    s_no: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    packing_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    packing_group: Mapped[PackingGroup] = relationship(back_populates="products")
    packings: Mapped[list["ProductPacking"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )


class ProductPacking(Base):
    __tablename__ = "product_packings"
    __table_args__ = (UniqueConstraint("product_id", "size_label", name="uq_productpacking_product_size"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    size_label: Mapped[str] = mapped_column(String(64), nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped[Product] = relationship(back_populates="packings")
