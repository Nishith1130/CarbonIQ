from decimal import Decimal
from typing import Any


class HotspotRanker:
    @staticmethod
    def detect_hotspots(
        baseline_by_process: list[dict[str, Any]],
        total_emissions: Decimal,
        top_k: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Sort unit-processes by contribution and return Pareto top-k hotspots.
        """
        # Filter processes with positive emissions
        active_processes = [p for p in baseline_by_process if p.get("tCO2e", Decimal(0)) > Decimal(0)]

        # Sort descending by tCO2e
        sorted_processes = sorted(active_processes, key=lambda x: x["tCO2e"], reverse=True)

        hotspots: list[dict[str, Any]] = []
        for rank, p in enumerate(sorted_processes[:top_k], start=1):
            proc_tco2e = p["tCO2e"]
            if total_emissions > Decimal("0.0"):
                share_pct = ((proc_tco2e / total_emissions) * Decimal(100)).quantize(Decimal("0.01"))
            else:
                share_pct = Decimal("0.0")

            hotspots.append({
                "rank": rank,
                "unit_process": p["unit_process"],
                "unit_process_name": p.get("unit_process_name", p["unit_process"].replace("_", " ").title()),
                "tCO2e": proc_tco2e.quantize(Decimal("0.0001")),
                "share_pct": share_pct,
                "scope1": p.get("scope1", Decimal("0.0")).quantize(Decimal("0.0001")),
                "scope2": p.get("scope2", Decimal("0.0")).quantize(Decimal("0.0001")),
                "scope3_partial": p.get("scope3_partial", Decimal("0.0")).quantize(Decimal("0.0001")),
                "is_estimated": p.get("is_estimated", False),
                "data_source": p.get("data_source", "measured"),
            })

        return hotspots
