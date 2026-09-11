import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

client = TestClient(app)


def test_password_hashing():
    raw = "SecureP@ssw0rd!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_lifecycle():
    data = {"sub": "user-12345", "org_id": "org-67890"}
    token = create_access_token(data=data, expires_delta=timedelta(minutes=15))
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user-12345"
    assert decoded["org_id"] == "org-67890"
    assert "exp" in decoded

    # Expired token test
    expired_token = create_access_token(data=data, expires_delta=timedelta(seconds=-1))
    with pytest.raises(ValueError, match="Invalid token"):
        decode_access_token(expired_token)


def test_register_flow():
    email = f"unique_owner_{uuid.uuid4().hex[:8]}@textiles.in"
    payload = {
        "email": email,
        "password": "StrongSecretPass123!",
        "org_name": "Surat Modern Weaving & Dyeing",
        "sector_id": "textile_dyeing",
        "turnover_inr": 15000000.0,
        "export_markets": ["EU", "UK"],
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["email"] == payload["email"]
    assert data["org_name"] == payload["org_name"]
    assert data["sector_id"] == "textile_dyeing"


def test_duplicate_registration_409():
    email = f"dup_owner_{uuid.uuid4().hex[:8]}@textiles.in"
    payload = {
        "email": email,
        "password": "StrongSecretPass123!",
        "org_name": "Dup Org",
        "sector_id": "textile_dyeing",
    }
    r1 = client.post("/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/auth/register", json=payload)
    assert r2.status_code == 409
    err = r2.json()
    assert err["code"] == "HTTP_409"


def test_login_flow():
    email = f"login_test_{uuid.uuid4().hex[:8]}@foundry.com"
    pwd = "FoundryPassword999!"
    # Register first
    client.post(
        "/auth/register",
        json={
            "email": email,
            "password": pwd,
            "org_name": "Rajkot Auto Castings",
            "sector_id": "foundry",
        },
    )

    # Valid login
    res_ok = client.post("/auth/login", json={"email": email, "password": pwd})
    assert res_ok.status_code == 200
    token_data = res_ok.json()
    assert "access_token" in token_data

    # Invalid password login
    res_bad_pwd = client.post("/auth/login", json={"email": email, "password": "WrongPassword"})
    assert res_bad_pwd.status_code == 401
    assert res_bad_pwd.json()["code"] == "HTTP_401"

    # Non-existent email login
    res_bad_email = client.post(
        "/auth/login", json={"email": f"nobody_{uuid.uuid4().hex[:8]}@nowhere.com", "password": "AnyPassword"}
    )
    assert res_bad_email.status_code == 401


def test_protected_whoami():
    email = f"whoami_{uuid.uuid4().hex[:8]}@food.com"
    pwd = "FoodProcessingPass1!"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": pwd,
            "org_name": "Ludhiana Grain Mills",
            "sector_id": "food_processing",
            "turnover_inr": 45000000.0,
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]

    # Call /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == email
    assert me_data["organization"]["name"] == "Ludhiana Grain Mills"
    assert me_data["organization"]["sector_id"] == "food_processing"

    # Call alias /auth/whoami
    who_res = client.get("/auth/whoami", headers=headers)
    assert who_res.status_code == 200

    # Call without token -> 401
    no_auth = client.get("/auth/me")
    assert no_auth.status_code == 401

    # Call with forged token -> 401
    bad_auth = client.get("/auth/me", headers={"Authorization": "Bearer forged-token-abc"})
    assert bad_auth.status_code == 401


def test_cors_preflight():
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    }
    response = client.options("/auth/login", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
