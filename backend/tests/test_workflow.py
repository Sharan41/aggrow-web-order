from tests.conftest import auth


def _h(t: str) -> dict:
    return auth(t)


def test_full_three_way_workflow(client, seed, tokens):
    product_id = seed["product"].id

    # Customer creates a draft order
    r = client.post(
        "/orders",
        headers=_h(tokens["customer"]),
        json={
            "items": [
                {"product_id": product_id, "size_label": "30ml", "qty": 2},
                {"product_id": product_id, "size_label": "50ml", "qty": 5},
            ],
            "customer_note": "Please hurry",
        },
    )
    assert r.status_code == 201, r.text
    order = r.json()
    order_id = order["id"]
    assert order["status"] == "DRAFT"
    assert len(order["items"]) == 2

    # Customer submits
    r = client.post(f"/orders/{order_id}/submit", headers=_h(tokens["customer"]))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "SUBMITTED_TO_HO"

    # HO sees it in pending approvals
    r = client.get("/orders", params={"status": "SUBMITTED_TO_HO"}, headers=_h(tokens["ho"]))
    assert r.status_code == 200
    assert any(o["id"] == order_id for o in r.json())

    # HO edits qty (reducing one, removing another, adding new size)
    r = client.patch(
        f"/orders/{order_id}/ho",
        headers=_h(tokens["ho"]),
        json={
            "items": [
                {"product_id": product_id, "size_label": "30ml", "qty": 1},
                {"product_id": product_id, "size_label": "100ml", "qty": 3},
            ],
            "ho_note": "Approved with changes",
        },
    )
    assert r.status_code == 200, r.text
    items = {(i["product_id"], i["size_label"]): i for i in r.json()["items"]}
    assert items[(product_id, "30ml")]["ho_qty"] == 1
    assert items[(product_id, "100ml")]["ho_qty"] == 3
    assert items[(product_id, "50ml")]["ho_qty"] == 0

    # HO forwards to factory
    r = client.post(f"/orders/{order_id}/forward", headers=_h(tokens["ho"]))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "HO_FORWARDED"

    # Factory sees it, must respond to all ho_qty > 0 items
    r = client.get("/orders", params={"status": "HO_FORWARDED"}, headers=_h(tokens["factory"]))
    assert any(o["id"] == order_id for o in r.json())

    # Factory can't respond to items HO did not approve
    r = client.post(
        f"/orders/{order_id}/respond",
        headers=_h(tokens["factory"]),
        json={
            "items": [
                {"product_id": product_id, "size_label": "50ml", "available": True},
            ]
        },
    )
    assert r.status_code == 400

    # Correct factory response
    r = client.post(
        f"/orders/{order_id}/respond",
        headers=_h(tokens["factory"]),
        json={
            "items": [
                {"product_id": product_id, "size_label": "30ml", "available": True},
                {
                    "product_id": product_id,
                    "size_label": "100ml",
                    "available": False,
                    "note": "Out of stock",
                },
            ],
            "factory_note": "Dispatching next week",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "COMPLETED"

    # Customer + HO received notifications
    r = client.get("/notifications", headers=_h(tokens["customer"]))
    types = {n["type"] for n in r.json()}
    assert "ORDER_RESPONDED" in types

    r = client.get("/notifications", headers=_h(tokens["ho"]))
    types = {n["type"] for n in r.json()}
    assert {"ORDER_SUBMITTED", "ORDER_RESPONDED"}.issubset(types)


def test_role_permissions(client, seed, tokens):
    product_id = seed["product"].id

    # customer creates an order
    r = client.post(
        "/orders",
        headers=_h(tokens["customer"]),
        json={"items": [{"product_id": product_id, "size_label": "30ml", "qty": 1}]},
    )
    order_id = r.json()["id"]

    # HO cannot create an order
    r = client.post(
        "/orders",
        headers=_h(tokens["ho"]),
        json={"items": [{"product_id": product_id, "size_label": "30ml", "qty": 1}]},
    )
    assert r.status_code == 403

    # Factory cannot submit a customer order
    r = client.post(f"/orders/{order_id}/submit", headers=_h(tokens["factory"]))
    assert r.status_code == 403

    # Customer can't see HO dashboards
    r = client.get("/orders/kpis", headers=_h(tokens["customer"]))
    assert r.status_code == 403

    # Factory can't view DRAFT order they're not involved with
    r = client.get(f"/orders/{order_id}", headers=_h(tokens["factory"]))
    assert r.status_code == 403

    # But customer can
    r = client.get(f"/orders/{order_id}", headers=_h(tokens["customer"]))
    assert r.status_code == 200


def test_cannot_forward_without_ho_qty(client, seed, tokens):
    product_id = seed["product"].id
    r = client.post(
        "/orders",
        headers=_h(tokens["customer"]),
        json={"items": [{"product_id": product_id, "size_label": "30ml", "qty": 1}]},
    )
    order_id = r.json()["id"]
    client.post(f"/orders/{order_id}/submit", headers=_h(tokens["customer"]))

    # HO clears ho_qty
    client.patch(
        f"/orders/{order_id}/ho",
        headers=_h(tokens["ho"]),
        json={"items": []},
    )
    r = client.post(f"/orders/{order_id}/forward", headers=_h(tokens["ho"]))
    assert r.status_code == 400


def test_reject_flow(client, seed, tokens):
    product_id = seed["product"].id
    r = client.post(
        "/orders",
        headers=_h(tokens["customer"]),
        json={"items": [{"product_id": product_id, "size_label": "30ml", "qty": 1}]},
    )
    order_id = r.json()["id"]
    client.post(f"/orders/{order_id}/submit", headers=_h(tokens["customer"]))
    r = client.post(
        f"/orders/{order_id}/reject",
        headers=_h(tokens["ho"]),
        json={"reason": "No stock"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "REJECTED"

    r = client.get("/notifications", headers=_h(tokens["customer"]))
    assert any(n["type"] == "ORDER_REJECTED" for n in r.json())
