from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ActivityData,
    BaselineResult,
    Hotspot,
    InterventionEmbedding,
    MACCResult,
    Organization,
    Recommendation,
    Report,
    Run,
    User,
)


def test_user_crud(db_session: Session):
    # Create
    user = User(
        email="test_user@example.com",
        password_hash="hash_value_123",
    )
    db_session.add(user)
    db_session.commit()
    assert user.id is not None
    assert user.created_at is not None

    # Read
    stmt = select(User).where(User.email == "test_user@example.com")
    fetched = db_session.scalar(stmt)
    assert fetched is not None
    assert fetched.id == user.id

    # Update
    fetched.password_hash = "updated_hash_456"
    db_session.commit()
    db_session.refresh(fetched)
    assert fetched.password_hash == "updated_hash_456"

    # Delete
    db_session.delete(fetched)
    db_session.commit()
    assert db_session.scalar(stmt) is None


def test_organization_crud(db_session: Session, test_user: User):
    # Create
    org = Organization(
        owner_user_id=test_user.id,
        name="Rajkot Casting Foundry",
        sector_id="foundry",
        turnover_inr=Decimal("25000000.00"),
        export_markets=["Domestic", "Middle East"],
    )
    db_session.add(org)
    db_session.commit()
    assert org.id is not None

    # Read & Update
    org.turnover_inr = Decimal("30000000.00")
    org.export_markets = ["Domestic", "EU"]
    db_session.commit()
    db_session.refresh(org)
    assert org.turnover_inr == Decimal("30000000.00")
    assert org.export_markets == ["Domestic", "EU"]


def test_run_and_activity_data_crud(db_session: Session, test_run: Run):
    # Add activity data
    act1 = ActivityData(
        run_id=test_run.id,
        activity_type="electricity",
        quantity=Decimal("15000.0000"),
        unit="kWh",
        unit_process="dyeing_bath",
        month=1,
    )
    act2 = ActivityData(
        run_id=test_run.id,
        activity_type="coal",
        quantity=Decimal("5000.0000"),
        unit="kg",
        unit_process="dyeing_bath",
        month=1,
    )
    db_session.add_all([act1, act2])
    db_session.commit()

    # Query via Run relationship
    db_session.refresh(test_run)
    assert len(test_run.activity_data) == 2
    assert test_run.ef_version == "cea_v20.0_ipcc_ar6"


def test_baseline_and_hotspot_crud(db_session: Session, test_run: Run):
    # Activity data
    act = ActivityData(
        run_id=test_run.id,
        activity_type="coal",
        quantity=Decimal("10000.0000"),
        unit="kg",
        unit_process="dyeing_bath_heating",
        month=2,
    )
    db_session.add(act)
    db_session.commit()

    # Baseline result with traceability
    baseline = BaselineResult(
        run_id=test_run.id,
        unit_process="dyeing_bath_heating",
        scope="1",
        tCO2e=Decimal("24.1800"),
        activity_data_id=act.id,
        emission_factor_ref="ipcc_ar6_coal_subbituminous",
    )
    db_session.add(baseline)
    db_session.commit()
    db_session.refresh(baseline)

    assert baseline.activity_data is not None
    assert baseline.activity_data.quantity == Decimal("10000.0000")

    # Hotspot
    hotspot = Hotspot(
        run_id=test_run.id,
        rank=1,
        unit_process="dyeing_bath_heating",
        tCO2e=Decimal("24.1800"),
        share_pct=Decimal("62.50"),
    )
    db_session.add(hotspot)
    db_session.commit()
    db_session.refresh(test_run)

    assert len(test_run.hotspots) == 1
    assert test_run.hotspots[0].rank == 1


def test_recommendation_and_macc_crud(db_session: Session, test_run: Run):
    hotspot = Hotspot(
        run_id=test_run.id,
        rank=1,
        unit_process="dyeing_bath_heating",
        tCO2e=Decimal("24.1800"),
        share_pct=Decimal("62.50"),
    )
    db_session.add(hotspot)
    db_session.commit()

    rec = Recommendation(
        run_id=test_run.id,
        hotspot_id=hotspot.id,
        intervention_id="tex_waste_heat_recovery",
        rank=1,
        rationale="Recover heat from dyeing effluent to preheat boiler feed water.",
        source_citation="BEE Textile Cluster Audit 2022 §4.2",
    )
    db_session.add(rec)
    db_session.commit()
    db_session.refresh(rec)

    macc = MACCResult(
        recommendation_id=rec.id,
        cost_capex_inr=Decimal("450000.00"),
        annual_saving_inr=Decimal("320000.00"),
        tCO2e_reduced_annual=Decimal("18.5000"),
        cost_per_tco2e=Decimal("-1250.00"),
        payback_years=Decimal("1.41"),
    )
    db_session.add(macc)
    db_session.commit()
    db_session.refresh(rec)

    assert len(rec.macc_results) == 1
    assert rec.macc_results[0].payback_years == Decimal("1.41")


def test_report_blob_crud(db_session: Session, test_run: Run):
    pdf_blob = b"%PDF-1.4 mock binary content for BRSR Core report"
    report = Report(
        run_id=test_run.id,
        template_type="brsr_core",
        file=pdf_blob,
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    assert report.id is not None
    assert report.file == pdf_blob
    assert report.template_type == "brsr_core"


def test_intervention_embedding_vector_crud(db_session: Session):
    dummy_vector = [0.01 * (i % 10) for i in range(1536)]
    embedding = InterventionEmbedding(
        intervention_id="tex_ro_water_recycle",
        sector_id="textile_dyeing",
        applicable_process="rinse_wash",
        vector=dummy_vector,
    )
    db_session.add(embedding)
    db_session.commit()
    db_session.refresh(embedding)

    assert embedding.id is not None
    assert len(embedding.vector) == 1536

    # Query by intervention_id
    stmt = select(InterventionEmbedding).where(
        InterventionEmbedding.intervention_id == "tex_ro_water_recycle"
    )
    result = db_session.scalar(stmt)
    assert result is not None
    assert result.applicable_process == "rinse_wash"


def test_cascade_deletion(db_session: Session, test_org: Organization):
    # Create run with complete hierarchy
    run = Run(org_id=test_org.id, ef_version="cea_v20.0_ipcc_ar6")
    db_session.add(run)
    db_session.commit()

    act = ActivityData(
        run_id=run.id,
        activity_type="diesel",
        quantity=Decimal("200.0000"),
        unit="L",
        unit_process="generator",
    )
    db_session.add(act)

    hotspot = Hotspot(
        run_id=run.id,
        rank=1,
        unit_process="generator",
        tCO2e=Decimal("0.5400"),
        share_pct=Decimal("10.00"),
    )
    db_session.add(hotspot)
    db_session.commit()

    rec = Recommendation(
        run_id=run.id,
        hotspot_id=hotspot.id,
        intervention_id="dg_solar_hybrid",
        rank=1,
        rationale="Install rooftop solar to offset DG set usage.",
        source_citation="BEE MSME Decarbonization Guide 2023",
    )
    db_session.add(rec)
    db_session.commit()

    macc = MACCResult(
        recommendation_id=rec.id,
        cost_capex_inr=Decimal("600000.00"),
        annual_saving_inr=Decimal("150000.00"),
        tCO2e_reduced_annual=Decimal("12.0000"),
        cost_per_tco2e=Decimal("-800.00"),
        payback_years=Decimal("4.00"),
    )
    db_session.add(macc)

    report = Report(
        run_id=run.id,
        template_type="cbam",
        file=b"%PDF mock cbam",
    )
    db_session.add(report)
    db_session.commit()

    run_id = run.id
    rec_id = rec.id

    # Delete Run -> verify all child records cascade delete
    db_session.delete(run)
    db_session.commit()

    assert db_session.scalar(select(Run).where(Run.id == run_id)) is None
    assert db_session.scalar(select(ActivityData).where(ActivityData.run_id == run_id)) is None
    assert db_session.scalar(select(Hotspot).where(Hotspot.run_id == run_id)) is None
    assert db_session.scalar(select(Recommendation).where(Recommendation.run_id == run_id)) is None
    assert db_session.scalar(select(MACCResult).where(MACCResult.recommendation_id == rec_id)) is None
    assert db_session.scalar(select(Report).where(Report.run_id == run_id)) is None
