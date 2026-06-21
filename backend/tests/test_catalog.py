from tests.conftest import auth


def test_catalog_read(client, seed, tokens):
    r = client.get("/catalog", headers=auth(tokens["customer"]))
    assert r.status_code == 200
    body = r.json()
    assert len(body["categories"]) == 1
    cat = body["categories"][0]
    assert cat["name"] == "Insecticides"
    pg = cat["packing_groups"][0]
    assert pg["column_headers"] == ["30ml", "50ml", "100ml"]
    products = pg["products"]
    assert len(products) == 1
    assert {pk["size_label"] for pk in products[0]["packings"]} == {"30ml", "50ml", "100ml"}


def test_catalog_customer_cannot_write(client, seed, tokens):
    r = client.post(
        "/catalog/categories",
        headers=auth(tokens["customer"]),
        json={"name": "X"},
    )
    assert r.status_code == 403


def test_ho_cannot_write_catalog(client, seed, tokens):
    group_id = seed["group"].id
    r = client.post(
        "/catalog/products",
        headers=auth(tokens["ho"]),
        json={
            "packing_group_id": group_id,
            "s_no": 2,
            "name": "New product",
            "packing_type": "PET",
            "available_sizes": ["30ml", "100ml"],
        },
    )
    assert r.status_code == 403


def test_admin_can_add_product(client, seed, tokens):
    group_id = seed["group"].id
    r = client.post(
        "/catalog/products",
        headers=auth(tokens["admin"]),
        json={
            "packing_group_id": group_id,
            "name": "New product",
            "packing_type": "PET",
            "available_sizes": ["30ml", "100ml"],
        },
    )
    assert r.status_code == 201, r.text
    assert {p["size_label"] for p in r.json()["packings"]} == {"30ml", "100ml"}
    assert r.json()["s_no"] == 2


def test_products_auto_sorted_alphabetically(client, seed, tokens):
    group_id = seed["group"].id
    for name in ("Zebra spray", "Alpha mix"):
        r = client.post(
            "/catalog/products",
            headers=auth(tokens["admin"]),
            json={
                "packing_group_id": group_id,
                "name": name,
                "available_sizes": ["30ml"],
            },
        )
        assert r.status_code == 201, r.text

    r = client.get("/catalog", headers=auth(tokens["admin"]))
    products = r.json()["categories"][0]["packing_groups"][0]["products"]
    names = [p["name"] for p in products]
    assert names == sorted(names, key=str.casefold)
    assert [p["s_no"] for p in products] == list(range(1, len(products) + 1))


def test_product_invalid_size_rejected(client, seed, tokens):
    group_id = seed["group"].id
    r = client.post(
        "/catalog/products",
        headers=auth(tokens["admin"]),
        json={
            "packing_group_id": group_id,
            "s_no": 3,
            "name": "Bad",
            "available_sizes": ["999kg"],
        },
    )
    assert r.status_code == 400
