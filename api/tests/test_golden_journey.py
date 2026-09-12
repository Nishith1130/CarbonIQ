import json
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def test_golden_journey_textile_dyeing():
    """
    Phase 6 Golden Test:
    Verify canonical SME activity input against expected outputs down to decimal tolerance.
    """
    with open(FIXTURES_DIR / "textile_dyeing_input.json", "r", encoding="utf-8") as f:
        input_payload = json.load(f)

    with open(FIXTURES_DIR / "textile_dyeing_expected.json", "r", encoding="utf-8") as f:
        expected = json.load(f)

    # 1. Register canonical demo SME
    email = f"golden_{uuid.uuid4().hex[:8]}@suratdyeing.in"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "org_name": "Surat Dyeing Works Unit 1",
            "sector_id": input_payload["sector_id"],
            "turnover_inr": 180000000.0,
            "export_markets": ["EU", "US"],
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Execute calculation run
    run_res = client.post("/runs", json=input_payload, headers=headers)
    assert run_res.status_code == 201
    run_data = run_res.json()

    # 3. Assert exact totals against expected golden values
    assert abs(float(run_data["totals"]["scope1"]) - expected["totals"]["scope1"]) < 0.01
    assert abs(float(run_data["totals"]["scope2"]) - expected["totals"]["scope2"]) < 0.01
    assert abs(float(run_data["totals"]["scope3_partial"]) - expected["totals"]["scope3_partial"]) < 0.01
    assert abs(float(run_data["totals"]["total"]) - expected["totals"]["total"]) < 0.01

    # 4. Assert top 3 Pareto hotspots
    hotspots = run_data["hotspots"]
    assert len(hotspots) == 3

    for idx, expected_h in enumerate(expected["top3_hotspots"]):
        actual_h = hotspots[idx]
        assert actual_h["rank"] == expected_h["rank"]
        assert actual_h["unit_process"] == expected_h["unit_process"]
        assert abs(float(actual_h["tCO2e"]) - expected_h["tCO2e"]) < 0.05
        assert abs(float(actual_h["share_pct"]) - expected_h["share_pct"]) < 0.1

    # 5. Assert MACC generation
    run_id = run_data["id"]
    macc_res = client.post(f"/runs/{run_id}/macc", headers=headers)
    assert macc_res.status_code == 200
    macc_data = macc_res.json()
    assert macc_data["total_interventions"] >= 3

    # 6. Assert BRSR Core PDF generation
    rep_res = client.post(
        f"/runs/{run_id}/report",
        json={"template_type": "brsr_core"},
        headers=headers,
    )
    assert rep_res.status_code == 201
    rep_id = rep_res.json()["id"]

    # Stream PDF
    pdf_res = client.get(f"/reports/{rep_id}", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 1000


def test_api_edge_cases():
    """Verify system resilience against edge cases (unknown sector, invalid activity, unauthorized)."""
    # 1. Register test user
    email = f"edge_{uuid.uuid4().hex[:8]}@demo.com"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "org_name": "Edge Case Mills",
            "sector_id": "textile_dyeing",
            "turnover_inr": 10000000.0,
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Edge Case: Unknown sector schema
    res_404 = client.get("/sectors/quantum_computing/schema")
    assert res_404.status_code == 404

    # Edge Case: Empty activities list -> 422
    empty_payload = {
        "sector_id": "textile_dyeing",
        "activities": [],
    }
    empty_res = client.post("/runs", json=empty_payload, headers=headers)
    assert empty_res.status_code == 422

    # Edge Case: Negative activity quantity -> 422
    neg_payload = {
        "sector_id": "textile_dyeing",
        "activities": [
            {"activity_type": "electricity_grid", "quantity": -500.0, "unit": "kWh"}
        ],
    }
    neg_res = client.post("/runs", json=neg_payload, headers=headers)
    assert neg_res.status_code == 422

    # Edge Case: Nonexistent run report -> 404
    fake_run_id = uuid.uuid4()
    rep_404 = client.post(
        f"/runs/{fake_run_id}/report",
        json={"template_type": "brsr_core"},
        headers=headers,
    )
    assert rep_404.status_code == 404

    # Edge Case: Nonexistent report download -> 404
    fake_rep_id = uuid.uuid4()
    dl_404 = client.get(f"/reports/{fake_rep_id}", headers=headers)
    assert dl_404.status_code == 404
