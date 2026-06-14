import os
import sys
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["MAIL_ENABLED"] = "false"

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.db import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Branch, Category, OrderFormType, PackingGroup, Product, ProductPacking, User, UserRole  # noqa: E402

get_settings.cache_clear()  # re-read env
settings = get_settings()

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False}, future=True)
TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    db = TestSession()
    try:
        yield db
    finally:
        db.rollback()
        # clear every table between tests
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
        db.close()


@pytest.fixture
def client(db):
    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def seed(db):
    branch = Branch(name="North Branch", code="N1")
    db.add(branch)
    db.flush()

    customer = User(
        email="cust@x.com",
        password_hash=hash_password("pw12345"),
        name="Cust",
        role=UserRole.CUSTOMER,
        branch_id=branch.id,
        active=True,
    )
    ho = User(
        email="ho@x.com",
        password_hash=hash_password("pw12345"),
        name="HO",
        role=UserRole.HEAD_OFFICE,
        active=True,
    )
    factory = User(
        email="fac@x.com",
        password_hash=hash_password("pw12345"),
        name="Fac",
        role=UserRole.FACTORY,
        active=True,
    )
    db.add_all([customer, ho, factory])
    db.flush()

    cat = Category(name="Insecticides", catalog_type=OrderFormType.AG_GROW, display_order=0)
    db.add(cat)
    db.flush()
    pg = PackingGroup(
        category_id=cat.id,
        label="Insecticides - Liquid",
        column_headers=["30ml", "50ml", "100ml"],
        display_order=0,
    )
    db.add(pg)
    db.flush()
    p1 = Product(packing_group_id=pg.id, s_no=1, name="Test Product", packing_type="PET", display_order=0)
    db.add(p1)
    db.flush()
    for size in ["30ml", "50ml", "100ml"]:
        db.add(ProductPacking(product_id=p1.id, size_label=size, available=True))
    db.commit()

    return {
        "branch": branch,
        "customer": customer,
        "ho": ho,
        "factory": factory,
        "category": cat,
        "group": pg,
        "product": p1,
    }


def login(client, email, password="pw12345"):
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tokens(client, seed):
    return {
        "customer": login(client, "cust@x.com"),
        "ho": login(client, "ho@x.com"),
        "factory": login(client, "fac@x.com"),
    }
