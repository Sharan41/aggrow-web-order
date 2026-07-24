from tests.conftest import auth


def test_login_and_me(client, seed):
    r = client.post("/auth/login", json={"email": "ho@x.com", "password": "pw12345"})
    assert r.status_code == 200, r.text
    tokens = r.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    r = client.get("/auth/me", headers=auth(tokens["access_token"]))
    assert r.status_code == 200
    assert r.json()["role"] == "HEAD_OFFICE"


def test_wrong_password(client, seed):
    r = client.post("/auth/login", json={"email": "ho@x.com", "password": "wrong"})
    assert r.status_code == 401


def test_refresh_token(client, seed):
    r = client.post("/auth/login", json={"email": "cust@x.com", "password": "pw12345"})
    refresh = r.json()["refresh_token"]
    r = client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_unauthenticated_blocked(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/orders").status_code == 401
