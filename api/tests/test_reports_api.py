import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_and_download_report_flow():
    # 1. Register SME
    email = f"rep_sme_{uuid.uuid4().hex[:8]}@tirupur.in"
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "org_name": "Tirupur Knitwear Processing",
            "sector_id": "textile_dyeing",
            "turnover_inr": 250000000.0,
            "export_markets": ["EU", "UK"],
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Run
    run_res = client.post(
        "/runs",
        json={
            "period_start": "2024-04-01",
            "period_end": "2024-06-30",
            "activities": [
                {"activity_type": "electricity_grid", "quantity": 80000.0, "unit": "kWh"},
                {"activity_type": "diesel", "quantity": 1200.0, "unit": "L", "unit_process": "etp_utilities"},
            ],
        },
        headers=headers,
    )
    assert run_res.status_code == 201
    run_id = run_res.json()["id"]

    # 3. Generate BRSR Core Report
    rep_post = client.post(
        f"/runs/{run_id}/report",
        json={"template_type": "brsr_core"},
        headers=headers,
    )
    assert rep_post.status_code == 201
    rep_data = rep_post.json()

    assert "id" in rep_data
    assert rep_data["run_id"] == run_id
    assert rep_data["template_type"] == "brsr_core"
    assert rep_data["file_size_bytes"] > 1000  # Valid multi-KB PDF
    report_id = rep_data["id"]

    # 4. Download and stream PDF
    dl_res = client.get(f"/reports/{report_id}", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in dl_res.headers
    assert f"CarbonIQ_BRSR_Core_{report_id}.pdf" in dl_res.headers["Content-Disposition"]

    # Verify actual PDF binary magic bytes
    pdf_bytes = dl_res.content
    assert len(pdf_bytes) == rep_data["file_size_bytes"]
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_tenant_isolation_and_auth():
    # User A creates a report
    email_a = f"rep_a_{uuid.uuid4().hex[:8]}@demo.in"
    reg_a = client.post(
        "/auth/register",
        json={
            "email": email_a,
            "password": "Password123!",
            "org_name": "Org A Textiles",
            "sector_id": "textile_dyeing",
            "turnover_inr": 15000000.0,
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

    rep_res = client.post(
        f"/runs/{run_id}/report",
        json={"template_type": "brsr_core"},
        headers=headers_a,
    )
    report_id = rep_res.json()["id"]

    # User B registers
    email_b = f"rep_b_{uuid.uuid4().hex[:8]}@demo.in"
    reg_b = client.post(
        "/auth/register",
        json={
            "email": email_b,
            "password": "Password123!",
            "org_name": "Org B Foundry",
            "sector_id": "foundry",
            "turnover_inr": 25000000.0,
        },
    )
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B cannot generate a report for User A's run
    cross_gen = client.post(
        f"/runs/{run_id}/report",
        json={"template_type": "brsr_core"},
        headers=headers_b,
    )
    assert cross_gen.status_code == 404

    # User B cannot download User A's report
    cross_dl = client.get(f"/reports/{report_id}", headers=headers_b)
    assert cross_dl.status_code == 404

    # Unauthenticated calls
    assert client.post(f"/runs/{run_id}/report", json={"template_type": "brsr_core"}).status_code == 401
    assert client.get(f"/reports/{report_id}").status_code == 401
