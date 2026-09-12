import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Hotspot, MACCResult, Recommendation, Run
from app.schemas.macc import MACCItemResponse, MACCResponse

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
LIBRARY_FILE = DATA_DIR / "intervention_library.json"


class InterventionLibrary:
    def __init__(self, path: Path = LIBRARY_FILE):
        if not path.exists():
            raise FileNotFoundError(f"Intervention library file not found at: {path}")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.version = data.get("version", "v1_hackout26")
        self.interventions: list[dict[str, Any]] = data.get("interventions", [])
        self._by_id: dict[str, dict[str, Any]] = {
            item["id"]: item for item in self.interventions if "id" in item
        }

    def get_by_id(self, intervention_id: str) -> dict[str, Any] | None:
        return self._by_id.get(intervention_id)

    def find_candidates(
        self, sector_id: str, process_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Find matching circular interventions for a sector and specific unit process."""
        matches = []
        for item in self.interventions:
            sectors = item.get("applicable_sectors", [])
            if sector_id in sectors or "all" in sectors:
                processes = item.get("applicable_processes", [])
                if not process_id or process_id in processes or "all" in processes:
                    matches.append(item)
        return matches


@lru_cache(maxsize=1)
def get_intervention_library() -> InterventionLibrary:
    return InterventionLibrary()


def calculate_macc_for_run(run: Run, db: Session) -> MACCResponse:
    """
    Compute Marginal Abatement Cost Curve (MACC) metrics for a calculation run.
    If recommendations are not yet generated, seed deterministic candidates from the intervention library.
    Returns interventions sorted by cost_per_tco2e ascending (standard MACC curve).
    """
    library = get_intervention_library()

    # 1. Fetch existing recommendations with macc_results and hotspot
    stmt = (
        select(Recommendation)
        .where(Recommendation.run_id == run.id)
        .options(selectinload(Recommendation.macc_results), selectinload(Recommendation.hotspot))
        .order_by(Recommendation.rank.asc())
    )
    recs = list(db.scalars(stmt).all())

    # 2. If no recommendations exist, generate them via AI RAG Recommender
    if not recs:
        from app.services.recommender import create_recommendations
        
        hotspots_stmt = select(Hotspot).where(Hotspot.run_id == run.id).order_by(Hotspot.rank.asc())
        hotspots = list(db.scalars(hotspots_stmt).all())

        for h in hotspots:
            try:
                create_recommendations(db, run.id, h.id)
            except Exception:
                # Recommender has its own fallback, but we catch top-level errors just in case
                pass

        # Re-fetch populated recommendations after AI generation
        recs = list(db.scalars(stmt).all())

    # 3. Compute MACC metrics for each recommendation
    items: list[MACCItemResponse] = []

    for rec in recs:
        library_item = library.get_by_id(rec.intervention_id)
        if not library_item:
            # Fallback placeholder if custom intervention ID
            library_item = {
                "name": rec.intervention_id.replace("_", " ").title(),
                "cost_capex_lakh": {"min": 5, "mid": 10, "max": 15},
                "energy_saving_pct_of_process": {"min": 15, "max": 25},
                "payback_years": {"min": 2, "max": 4},
                "source_citation": rec.source_citation,
                "circular_type": "efficiency_retrofit",
            }

        capex_lakh = float(library_item.get("cost_capex_lakh", {}).get("mid", 10.0))
        capex_inr = capex_lakh * 100000.0

        # Estimate annual tCO2e reduction from hotspot emissions and savings percentage
        hotspot_tco2e = float(rec.hotspot.tCO2e) if rec.hotspot else 10.0
        if "energy_saving_pct_of_process" in library_item:
            pct_range = library_item["energy_saving_pct_of_process"]
            pct_mid = (pct_range.get("min", 15) + pct_range.get("max", 25)) / 2.0
            reduced_tco2e = hotspot_tco2e * (pct_mid / 100.0)
        elif "co2_saving_pct_of_process" in library_item:
            pct_range = library_item["co2_saving_pct_of_process"]
            pct_mid = (pct_range.get("min", 30) + pct_range.get("max", 60)) / 2.0
            reduced_tco2e = hotspot_tco2e * (pct_mid / 100.0)
        else:
            reduced_tco2e = hotspot_tco2e * 0.20  # default 20% savings

        if reduced_tco2e <= 0.001:
            reduced_tco2e = 0.5

        # Payback and annual financial savings
        payback_range = library_item.get("payback_years", {})
        payback_mid = (payback_range.get("min", 2.0) + payback_range.get("max", 4.0)) / 2.0
        payback_mid = max(payback_mid, 0.2)

        annual_saving_inr = capex_inr / payback_mid
        payback_years = capex_inr / max(annual_saving_inr, 1.0)

        # Standard MACC formula: Net Annualized Cost / Annual tCO2e reduction
        # Using standard 10-year asset lifetime
        asset_lifetime = 10.0
        annualized_capex = capex_inr / asset_lifetime
        net_annualized_cost = annualized_capex - annual_saving_inr
        cost_per_tco2e = net_annualized_cost / reduced_tco2e

        # Persist or update MACCResult
        if rec.macc_results:
            macc = rec.macc_results[0]
            macc.cost_capex_inr = Decimal(f"{capex_inr:.2f}")
            macc.annual_saving_inr = Decimal(f"{annual_saving_inr:.2f}")
            macc.tCO2e_reduced_annual = Decimal(f"{reduced_tco2e:.4f}")
            macc.cost_per_tco2e = Decimal(f"{cost_per_tco2e:.2f}")
            macc.payback_years = Decimal(f"{payback_years:.2f}")
        else:
            macc = MACCResult(
                recommendation_id=rec.id,
                cost_capex_inr=Decimal(f"{capex_inr:.2f}"),
                annual_saving_inr=Decimal(f"{annual_saving_inr:.2f}"),
                tCO2e_reduced_annual=Decimal(f"{reduced_tco2e:.4f}"),
                cost_per_tco2e=Decimal(f"{cost_per_tco2e:.2f}"),
                payback_years=Decimal(f"{payback_years:.2f}"),
            )
            db.add(macc)

        unit_process = rec.hotspot.unit_process if rec.hotspot else None

        items.append(
            MACCItemResponse(
                recommendation_id=rec.id,
                intervention_id=rec.intervention_id,
                intervention_name=library_item.get("name", rec.intervention_id.replace("_", " ").title()),
                unit_process_id=unit_process,
                cost_capex_inr=round(capex_inr, 2),
                annual_saving_inr=round(annual_saving_inr, 2),
                tco2e_reduced_annual=round(reduced_tco2e, 4),
                cost_per_tco2e=round(cost_per_tco2e, 2),
                payback_years=round(payback_years, 2),
                circular_type=library_item.get("circular_type"),
                source_citation=rec.source_citation,
                rationale=rec.rationale,
            )
        )

    db.commit()

    # Sort ascending by cost_per_tco2e: most negative (highest net savings) first
    items.sort(key=lambda x: x.cost_per_tco2e)

    return MACCResponse(
        run_id=run.id,
        total_interventions=len(items),
        items=items,
    )
