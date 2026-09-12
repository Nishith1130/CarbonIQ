import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_macc_calculation_and_ordering():
    # 1. Register User A
    email = f"macc_sme_{uuid.uuid4().hex[:8]}@surat.in"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "org_name": "Surat MACC Dyeing Works",
            "sector_id": "textile_dyeing",
            "turnover_inr": 180000000.0,
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create calculation run
    run_payload = {
        "period_start": "2024-04-01",
        "period_end": "2024-06-30",
        "activities": [
            {
                "activity_type": "electricity_grid",
                "quantity": 50000.0,
                "unit": "kWh",
                "unit_process": None,
            },
            {
                "activity_type": "coal_indian_bituminous",
                "quantity": 10000.0,
                "unit": "kg",
                "unit_process": "dyeing_bath",
            },
        ],
    }
    run_res = client.post("/runs", json=run_payload, headers=headers)
    assert run_res.status_code == 201
    run_id = run_res.json()["id"]

    # 3. Call POST /runs/{id}/macc
    macc_res = client.post(f"/runs/{run_id}/macc", headers=headers)
    assert macc_res.status_code == 200
    macc_data = macc_res.json()

    assert macc_data["run_id"] == run_id
    assert macc_data["total_interventions"] > 0
    items = macc_data["items"]
    assert len(items) == macc_data["total_interventions"]

    # Verify MACC fields and positive values
    for item in items:
        assert item["cost_capex_inr"] > 0
        assert item["annual_saving_inr"] > 0
        assert item["tco2e_reduced_annual"] > 0
        assert item["payback_years"] > 0
        assert "source_citation" in item
        assert "intervention_name" in item

    # Verify ordering: cost_per_tco2e ascending (most negative / highest ROI first)
    for i in range(len(items) - 1):
        assert items[i]["cost_per_tco2e"] <= items[i + 1]["cost_per_tco2e"]

    # 4. Call GET /runs/{id}/macc and ensure identical response
    macc_get_res = client.get(f"/runs/{run_id}/macc", headers=headers)
    assert macc_get_res.status_code == 200
    assert macc_get_res.json()["total_interventions"] == macc_data["total_interventions"]


def test_macc_tenant_isolation_and_auth():
    # User A creates a run
    email_a = f"macc_a_{uuid.uuid4().hex[:8]}@demo.in"
    reg_a = client.post(
        "/auth/register",
        json={
            "email": email_a,
            "password": "Password123!",
            "org_name": "Org A",
            "sector_id": "foundry",
            "turnover_inr": 20000000.0,
        },
    )
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    run_res = client.post(
        "/runs",
        json={
            "activities": [
                {"activity_type": "electricity_grid", "quantity": 10000.0, "unit": "kWh"}
            ]
        },
        headers=headers_a,
    )
    run_id = run_res.json()["id"]

    # User B registers
    email_b = f"macc_b_{uuid.uuid4().hex[:8]}@demo.in"
    reg_b = client.post(
        "/auth/register",
        json={
            "email": email_b,
            "password": "Password123!",
            "org_name": "Org B",
            "sector_id": "food_processing",
            "turnover_inr": 30000000.0,
        },
    )
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B cannot access User A's MACC data
    cross_res = client.post(f"/runs/{run_id}/macc", headers=headers_b)
    assert cross_res.status_code == 404

    # Unauthenticated call returns 401
    unauth_res = client.post(f"/runs/{run_id}/macc")
    assert unauth_res.status_code == 401
