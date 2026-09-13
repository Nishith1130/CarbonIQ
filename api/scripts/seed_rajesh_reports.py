import os
import sys
from decimal import Decimal

api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, api_dir)

from app.db.session import SessionLocal
from app.models import User, Organization, Run, Report, ActivityData, BaselineResult, Hotspot, Recommendation, MACCResult
from app.services.baseline import get_baseline_engine
from app.services.hotspot import HotspotRanker
from app.services.report_gen import generate_brsr_report_pdf

MONTHS_DATA = [
    {
        "name": "April 2024",
        "period_start": "2024-04-01",
        "period_end": "2024-04-30",
        "activities": [
            {"activity_type": "electricity_grid", "quantity": 82000.0, "unit": "kWh", "unit_process": "factory_level"},
            {"activity_type": "coal_indian_bituminous", "quantity": 36000.0, "unit": "kg", "unit_process": "dyeing_bath"},
            {"activity_type": "diesel_hsd", "quantity": 850.0, "unit": "litre", "unit_process": "etp_utilities"},
        ]
    },
    {
        "name": "May 2024",
        "period_start": "2024-05-01",
        "period_end": "2024-05-31",
        "activities": [
            {"activity_type": "electricity_grid", "quantity": 94500.0, "unit": "kWh", "unit_process": "factory_level"},
            {"activity_type": "coal_indian_bituminous", "quantity": 41000.0, "unit": "kg", "unit_process": "dyeing_bath"},
            {"activity_type": "diesel_hsd", "quantity": 920.0, "unit": "litre", "unit_process": "etp_utilities"},
        ]
    },
    {
        "name": "June 2024",
        "period_start": "2024-06-01",
        "period_end": "2024-06-30",
        "activities": [
            {"activity_type": "electricity_grid", "quantity": 87200.0, "unit": "kWh", "unit_process": "factory_level"},
            {"activity_type": "coal_indian_bituminous", "quantity": 38500.0, "unit": "kg", "unit_process": "dyeing_bath"},
            {"activity_type": "diesel_hsd", "quantity": 650.0, "unit": "litre", "unit_process": "etp_utilities"},
        ]
    },
    {
        "name": "July 2024",
        "period_start": "2024-07-01",
        "period_end": "2024-07-31",
        "activities": [
            {"activity_type": "electricity_grid", "quantity": 91000.0, "unit": "kWh", "unit_process": "factory_level"},
            {"activity_type": "coal_indian_bituminous", "quantity": 39800.0, "unit": "kg", "unit_process": "dyeing_bath"},
            {"activity_type": "diesel_hsd", "quantity": 780.0, "unit": "litre", "unit_process": "etp_utilities"},
        ]
    },
]

def reset_and_seed_org(db, org):
    print("\n==========================================")
    print(f"Processing Org: {org.name} (ID: {org.id})")
    print("==========================================")
    
    # 1. Delete all existing runs for this organization
    existing_runs = db.query(Run).filter(Run.org_id == org.id).all()
    print(f"Found {len(existing_runs)} existing runs. Deleting them...")
    for r in existing_runs:
        db.delete(r)
    db.commit()
    print("Deleted all existing runs and associated reports/hotspots/recommendations.")

    # 2. Add 4 different monthly runs and reports
    engine = get_baseline_engine()
    created_runs = []

    for month_info in MONTHS_DATA:
        print(f"\nCreating report for {month_info['name']} ({month_info['period_start']} to {month_info['period_end']})...")
        
        # Calculate baseline
        calc = engine.calculate(
            sector_id=org.sector_id,
            activities=month_info["activities"],
            region="IN_all_india",
        )

        # Detect Pareto hotspots
        hotspots_raw = HotspotRanker.detect_hotspots(
            baseline_by_process=calc["baseline_by_process"],
            total_emissions=calc["totals"]["total"],
            top_k=3,
        )

        # Create Run
        run = Run(
            org_id=org.id,
            period_start=month_info["period_start"],
            period_end=month_info["period_end"],
            ef_version=calc["ef_version"],
        )
        db.add(run)
        db.flush()

        # Create ActivityData and BaselineResult
        db_activities = []
        for act in month_info["activities"]:
            act_row = ActivityData(
                run_id=run.id,
                activity_type=act["activity_type"],
                quantity=Decimal(str(act["quantity"])),
                unit=act["unit"],
                unit_process=act.get("unit_process", "factory_level"),
            )
            db_activities.append(act_row)
        db.add_all(db_activities)
        db.flush()

        db_line_items = []
        for line in calc["line_items"]:
            act_idx = line.get("activity_idx", 0)
            source_act_id = db_activities[act_idx].id if act_idx < len(db_activities) else None
            base_row = BaselineResult(
                run_id=run.id,
                unit_process=line["unit_process"],
                scope=line["scope"],
                tCO2e=Decimal(str(line["tCO2e"])),
                activity_data_id=source_act_id,
                emission_factor_ref=line["emission_factor_ref"],
                is_estimated=line.get("is_estimated", False),
                data_source=line.get("data_source", "measured"),
            )
            db_line_items.append(base_row)
        db.add_all(db_line_items)

        db_hotspots = []
        for h in hotspots_raw:
            h_row = Hotspot(
                run_id=run.id,
                rank=h["rank"],
                unit_process=h["unit_process"],
                tCO2e=Decimal(str(h["tCO2e"])),
                share_pct=Decimal(str(h["share_pct"])),
                is_estimated=h.get("is_estimated", False),
                data_source=h.get("data_source", "measured"),
            )
            db_hotspots.append(h_row)
        db.add_all(db_hotspots)
        
        db.commit()
        db.refresh(run)

        # Generate official BRSR Core PDF report & MACC recommendations
        report = generate_brsr_report_pdf(run=run, db=db, template_type="brsr_core")
        print(f"  [OK] Run ID: {run.id}")
        print(f"  [OK] Report ID: {report.id} ({len(report.file)} bytes PDF generated)")
        print(f"  [OK] Total Footprint: {calc['totals']['total']:.2f} tCO2e (S1: {calc['totals']['scope1']:.2f}, S2: {calc['totals']['scope2']:.2f})")
        created_runs.append(run)

    print(f"\nSuccessfully seeded {len(created_runs)} reports for {org.name}!")

def main():
    db = SessionLocal()
    try:
        # Find Rajesh Mehta's accounts
        target_emails = ["demo@carboniq.in", "surat.mill@example.com"]
        for email in target_emails:
            u = db.query(User).filter(User.email == email).first()
            if u and u.organizations:
                for org in u.organizations:
                    reset_and_seed_org(db, org)
            else:
                print(f"User {email} not found or has no org.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
