import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_sectors():
    response = client.get("/sectors")
    assert response.status_code == 200
    sectors = response.json()
    assert len(sectors) == 3
    s_ids = [s["sector_id"] for s in sectors]
    assert "textile_dyeing" in s_ids
    assert "foundry" in s_ids
    assert "food_processing" in s_ids


def test_get_sector_schema():
    response = client.get("/sectors/textile_dyeing/schema")
    assert response.status_code == 200
    data = response.json()
    assert data["sector_id"] == "textile_dyeing"
    assert len(data["unit_processes"]) == 6
    act_types = [a["activity_type"] for a in data["activities_expected"]]
    assert "electricity_grid" in act_types
    assert "coal_indian_bituminous" in act_types


def test_create_and_get_run_flow():
    # 1. Register an SME user
    email = f"tex_sme_{uuid.uuid4().hex[:8]}@surat.in"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "org_name": "Rakesh Patel Dyeing Surat",
            "sector_id": "textile_dyeing",
            "turnover_inr": 180000000.0,
            "export_markets": ["EU", "US"],
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Submit bills to POST /runs
    run_payload = {
        "period_start": "2024-04-01",
        "period_end": "2024-06-30",
        "region": "IN_all_india",
        "activities": [
            {
                "activity_type": "electricity_grid",
                "quantity": 100000.0,
                "unit": "kWh",
                "unit_process": None,  # benchmark split
                "month": 4,
            },
            {
                "activity_type": "coal_indian_bituminous",
                "quantity": 40000.0,
                "unit": "kg",
                "unit_process": "dyeing_bath",  # direct attribution
                "month": 4,
            },
            {
                "activity_type": "diesel_hsd",
                "quantity": 1000.0,
                "unit": "litre",
                "month": 4,
            },
        ],
    }
    create_res = client.post("/runs", json=run_payload, headers=headers)
    assert create_res.status_code == 201
    run_data = create_res.json()

    assert "id" in run_data
    run_id = run_data["id"]
    assert run_data["ef_version"] is not None
    assert "totals" in run_data
    assert float(run_data["totals"]["total"]) > 0.0
    assert float(run_data["totals"]["scope2"]) == 71.17  # 100,000 * 0.0007117
    assert len(run_data["hotspots"]) <= 3
    assert len(run_data["hotspots"]) > 0

    # Top hotspot should be dyeing_bath due to 40 tonnes of coal
    top_h = run_data["hotspots"][0]
    assert top_h["rank"] == 1
    assert top_h["unit_process"] == "dyeing_bath"
    assert float(top_h["share_pct"]) > 40.0

    # 3. Replay past run via GET /runs/{id}
    get_res = client.get(f"/runs/{run_id}", headers=headers)
    assert get_res.status_code == 200
    fetched_data = get_res.json()
    assert fetched_data["id"] == run_id
    assert fetched_data["totals"] == run_data["totals"]
    assert len(fetched_data["hotspots"]) == len(run_data["hotspots"])

    # 4. List runs via GET /runs
    list_res = client.get("/runs", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


def test_runs_tenant_isolation():
    # SME A
    reg_a = client.post(
        "/auth/register",
        json={
            "email": f"sme_a_{uuid.uuid4().hex[:8]}@a.com",
            "password": "PasswordA123!",
            "org_name": "Org A",
            "sector_id": "foundry",
        },
    )
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Run for SME A
    run_res = client.post(
        "/runs",
        json={
            "activities": [
                {"activity_type": "electricity_grid", "quantity": 50000.0, "unit": "kWh"}
            ]
        },
        headers=headers_a,
    )
    run_a_id = run_res.json()["id"]

    # SME B
    reg_b = client.post(
        "/auth/register",
        json={
            "email": f"sme_b_{uuid.uuid4().hex[:8]}@b.com",
            "password": "PasswordB123!",
            "org_name": "Org B",
            "sector_id": "foundry",
        },
    )
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # SME B attempting to access Run A must receive 404
    cross_res = client.get(f"/runs/{run_a_id}", headers=headers_b)
    assert cross_res.status_code == 404
