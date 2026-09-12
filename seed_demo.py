import json
import uuid
import httpx
from pathlib import Path

API_URL = "http://localhost:8000"
FIXTURES_DIR = Path("api/tests/fixtures")

def seed():
    print("Seeding database via API...")
    client = httpx.Client(base_url=API_URL, timeout=30.0)

    # 1. Register a demo user
    email = f"demo_{uuid.uuid4().hex[:4]}@carboniq.com"
    password = "Password123!"
    
    with open(FIXTURES_DIR / "textile_dyeing_input.json", "r", encoding="utf-8") as f:
        input_payload = json.load(f)

    print(f"Registering user: {email}")
    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "org_name": "Demo Corporation",
            "sector_id": input_payload["sector_id"],
            "turnover_inr": 200000000.0,
            "export_markets": ["EU", "US"],
        },
    )
    
    if reg_res.status_code != 201:
        print("Failed to register:", reg_res.text)
        return

    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Execute calculation run
    print("Executing calculation run...")
    run_res = client.post("/runs", json=input_payload, headers=headers)
    if run_res.status_code != 201:
        print("Failed to run calculation:", run_res.text)
        return
        
    run_data = run_res.json()
    run_id = run_data["id"]
    print(f"Created Run ID: {run_id}")

    # 3. Generate recommendations for hotspots
    hotspots = run_data.get("hotspots", [])
    print(f"Found {len(hotspots)} hotspots. Generating recommendations (this may take a few seconds due to LLM calls)...")
    for hotspot in hotspots:
        print(f"  -> Recommending for hotspot: {hotspot['unit_process']} ({hotspot['id']})")
        rec_res = client.post(f"/runs/{run_id}/recommend", json={"hotspot_id": hotspot["id"]}, headers=headers)
        if rec_res.status_code == 200:
            print("     Success:", len(rec_res.json()), "recommendations generated.")
        else:
            print("     Failed:", rec_res.text)

    # 4. Generate MACC
    print("Generating MACC curve data...")
    macc_res = client.post(f"/runs/{run_id}/macc", headers=headers)
    if macc_res.status_code == 200:
        print("MACC generated successfully.")
    else:
        print("MACC failed:", macc_res.text)

    print("\n" + "="*50)
    print("SEEDING COMPLETE!")
    print("You can now log into the web app (http://localhost:3000) using:")
    print(f"Email:    {email}")
    print(f"Password: {password}")
    print("="*50)

if __name__ == "__main__":
    seed()
