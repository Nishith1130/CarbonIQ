from decimal import Decimal

from app.services.baseline import get_baseline_engine
from app.services.ef_loader import get_ef_db
from app.services.hotspot import HotspotRanker


def test_golden_electricity_grid():
    """Golden test: 100 kWh Indian grid electricity -> 0.07117 tCO2e (CEA v20.0)."""
    ef_db = get_ef_db()
    tco2e, scope, factor_key, _ = ef_db.compute_tco2e(
        activity_type="electricity_grid",
        quantity=Decimal(100),
        unit="kWh",
        region="IN_all_india",
    )
    assert factor_key == "electricity_grid_in_all_india"
    assert scope == "2"
    assert tco2e == Decimal("0.0712") or abs(tco2e - Decimal("0.07117")) < Decimal("0.0001")


def test_golden_fuels_math():
    """Golden tests for primary industrial fuels."""
    ef_db = get_ef_db()

    # 1,000 kg bituminous coal -> 2.42 tCO2e
    tco2e_coal, scope_coal, _, _ = ef_db.compute_tco2e(
        activity_type="coal_indian_bituminous",
        quantity=Decimal(1000),
        unit="kg",
    )
    assert scope_coal == "1"
    assert tco2e_coal == Decimal("2.4200")

    # 500 L diesel -> 1.3400 tCO2e (500 * 2.68 / 1000)
    tco2e_diesel, scope_diesel, _, _ = ef_db.compute_tco2e(
        activity_type="diesel_hsd",
        quantity=Decimal(500),
        unit="litre",
    )
    assert scope_diesel == "1"
    assert tco2e_diesel == Decimal("1.3400")

    # 100 kg LPG -> 0.2980 tCO2e
    tco2e_lpg, scope_lpg, _, _ = ef_db.compute_tco2e(
        activity_type="lpg_commercial",
        quantity=Decimal(100),
        unit="kg",
    )
    assert scope_lpg == "1"
    assert tco2e_lpg == Decimal("0.2980")

    # 1,000 kg biomass -> 0.0 tCO2e direct CO2
    tco2e_bio, scope_bio, _, _ = ef_db.compute_tco2e(
        activity_type="biomass_bagasse",
        quantity=Decimal(1000),
        unit="kg",
    )
    assert scope_bio == "1"
    assert tco2e_bio == Decimal("0.0000")


def test_baseline_engine_benchmark_split():
    """Test that factory-level electricity and coal split across unit-processes."""
    engine = get_baseline_engine()
    activities = [
        {
            "activity_type": "electricity_grid",
            "quantity": Decimal(10000),
            "unit": "kWh",
        },
        {
            "activity_type": "coal_indian_bituminous",
            "quantity": Decimal(5000),
            "unit": "kg",
        },
    ]

    res = engine.calculate(sector_id="textile_dyeing", activities=activities)
    totals = res["totals"]

    # Electricity: 10,000 kWh * 0.0007117 = 7.117 tCO2e (Scope 2)
    # Coal: 5,000 kg * 0.00242 = 12.1000 tCO2e (Scope 1)
    assert totals["scope2"] == Decimal("7.1170")
    assert totals["scope1"] == Decimal("12.1000")
    assert totals["total"] == Decimal("19.2170")

    # Verify breakdown contains processes
    proc_breakdown = {p["unit_process"]: p for p in res["baseline_by_process"]}
    assert "dyeing_bath" in proc_breakdown
    assert "stenter_drying" in proc_breakdown
    assert "etp_utilities" in proc_breakdown

    # Dyeing bath (45% thermal + 20% electric) should have substantial emissions
    dyeing_tco2e = proc_breakdown["dyeing_bath"]["tCO2e"]
    assert dyeing_tco2e > Decimal("5.0")


def test_hotspot_pareto_ranking():
    """Test Pareto top-3 detection sorts descending and computes shares correctly."""
    process_emissions = [
        {"unit_process": "dyeing_bath", "unit_process_name": "Dyeing Bath", "tCO2e": Decimal("12.5000")},
        {"unit_process": "stenter_drying", "unit_process_name": "Stenter Drying", "tCO2e": Decimal("6.2000")},
        {"unit_process": "etp_utilities", "unit_process_name": "ETP Utilities", "tCO2e": Decimal("3.1000")},
        {"unit_process": "pre_treatment", "unit_process_name": "Pre-treatment", "tCO2e": Decimal("1.2000")},
    ]
    total = Decimal("23.0000")

    hotspots = HotspotRanker.detect_hotspots(process_emissions, total_emissions=total, top_k=3)
    assert len(hotspots) == 3

    assert hotspots[0]["rank"] == 1
    assert hotspots[0]["unit_process"] == "dyeing_bath"
    assert hotspots[0]["share_pct"] == Decimal("54.35")  # 12.5 / 23.0 * 100

    assert hotspots[1]["rank"] == 2
    assert hotspots[1]["unit_process"] == "stenter_drying"

    assert hotspots[2]["rank"] == 3
    assert hotspots[2]["unit_process"] == "etp_utilities"
