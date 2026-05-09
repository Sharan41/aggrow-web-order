from pydantic import BaseModel, Field


class ProductPackingRead(BaseModel):
    size_label: str
    available: bool

    class Config:
        from_attributes = True


class ProductRead(BaseModel):
    id: int
    s_no: int
    name: str
    packing_type: str | None = None
    display_order: int
    active: bool
    packings: list[ProductPackingRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PackingGroupRead(BaseModel):
    id: int
    label: str
    column_headers: list[str]
    display_order: int
    products: list[ProductRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CategoryRead(BaseModel):
    id: int
    name: str
    display_order: int
    packing_groups: list[PackingGroupRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CatalogRead(BaseModel):
    categories: list[CategoryRead]


# ---- write schemas ----

class CategoryCreate(BaseModel):
    name: str
    display_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    display_order: int | None = None


class PackingGroupCreate(BaseModel):
    category_id: int
    label: str
    column_headers: list[str]
    display_order: int = 0


class PackingGroupUpdate(BaseModel):
    label: str | None = None
    column_headers: list[str] | None = None
    display_order: int | None = None


class ProductCreate(BaseModel):
    packing_group_id: int
    s_no: int
    name: str
    packing_type: str | None = None
    display_order: int = 0
    active: bool = True
    available_sizes: list[str] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    s_no: int | None = None
    name: str | None = None
    packing_type: str | None = None
    display_order: int | None = None
    active: bool | None = None
    available_sizes: list[str] | None = None
