from collections import defaultdict
from decimal import Decimal
from functools import lru_cache
from typing import Any

from app.services.ef_loader import get_ef_db
from app.services.sector_loader import get_sector_service


class BaselineEngine:
    def __init__(self):
        self.ef_db = get_ef_db()
        self.sector_svc = get_sector_service()

    def calculate(
        self,
        sector_id: str,
        activities: list[dict[str, Any]],
        region: str = "IN_all_india",
    ) -> dict[str, Any]:
        """
        Compute Scope 1, 2, and partial Scope 3 emissions for given activities.
        Distributes unassigned utility-level activity data across unit-processes based on
        BEE cluster benchmark ratios.
        """
        template = self.sector_svc.get_sector_template(sector_id)
        unit_processes = template.get("unit_processes", []) if template else []
        proc_lookup = {p["id"]: p for p in unit_processes}

        # Calculate thermal and electric total shares for normalization
        total_elec_shares = sum(p.get("typical_electric_share_pct", 0) for p in unit_processes) or 100
        total_therm_shares = sum(p.get("typical_thermal_share_pct", 0) for p in unit_processes) or 100

        line_items: list[dict[str, Any]] = []
        scope1_total = Decimal("0.0")
        scope2_total = Decimal("0.0")
        scope3_total = Decimal("0.0")

        # Map to hold emissions aggregated by unit process
        process_emissions: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "unit_process": "",
                "unit_process_name": "",
                "scope1": Decimal("0.0"),
                "scope2": Decimal("0.0"),
                "scope3_partial": Decimal("0.0"),
                "tCO2e": Decimal("0.0"),
                "share_pct": Decimal("0.0"),
            }
        )

        # Initialize all known unit processes from template so they appear in breakdown
        for p in unit_processes:
            pid = p["id"]
            process_emissions[pid]["unit_process"] = pid
            process_emissions[pid]["unit_process_name"] = p.get("name", pid)

        for act_idx, act in enumerate(activities):
            act_type = act["activity_type"]
            qty = Decimal(str(act["quantity"]))
            unit = act["unit"]
            specified_proc = act.get("unit_process")
            month = act.get("month")

            tco2e, scope_str, ef_key, ef_meta = self.ef_db.compute_tco2e(
                activity_type=act_type,
                quantity=qty,
                unit=unit,
                region=region,
            )

            # Accumulate totals
            if scope_str == "1":
                scope1_total += tco2e
            elif scope_str == "2":
                scope2_total += tco2e
            else:
                scope3_total += tco2e

            # Case A: User explicitly mapped to a known unit process
            if specified_proc and specified_proc in proc_lookup:
                p_meta = proc_lookup[specified_proc]
                line_items.append({
                    "activity_idx": act_idx,
                    "unit_process": specified_proc,
                    "unit_process_name": p_meta.get("name", specified_proc),
                    "scope": scope_str,
                    "tCO2e": tco2e,
                    "emission_factor_ref": ef_key,
                    "ef_value": Decimal(str(ef_meta["value"])),
                    "ef_unit": ef_meta.get("unit", ""),
                    "ef_source": ef_meta.get("source", ""),
                    "activity_type": act_type,
                    "quantity": qty,
                    "unit": unit,
                    "month": month,
                    "attribution": "direct",
                })
                pe = process_emissions[specified_proc]
                if scope_str == "1":
                    pe["scope1"] += tco2e
                elif scope_str == "2":
                    pe["scope2"] += tco2e
                else:
                    pe["scope3_partial"] += tco2e
                pe["tCO2e"] += tco2e

            # Case B: Activity is distributed across processes via sector benchmark
            elif unit_processes:
                is_electric = "electricity" in ef_key or ef_meta.get("scope") == 2
                is_thermal = not is_electric and scope_str == "1"

                for p in unit_processes:
                    pid = p["id"]
                    p_name = p.get("name", pid)

                    if is_electric:
                        share_weight = Decimal(str(p.get("typical_electric_share_pct", 0))) / Decimal(str(total_elec_shares))
                    elif is_thermal:
                        share_weight = Decimal(str(p.get("typical_thermal_share_pct", 0))) / Decimal(str(total_therm_shares))
                    else:
                        # For general Scope 3 freight or raw materials, allocate to primary process or general
                        share_weight = Decimal("1.0") / Decimal(str(len(unit_processes)))

                    sub_tco2e = (tco2e * share_weight).quantize(Decimal("0.0001"))
                    if sub_tco2e > Decimal("0.0"):
                        line_items.append({
                            "activity_idx": act_idx,
                            "unit_process": pid,
                            "unit_process_name": p_name,
                            "scope": scope_str,
                            "tCO2e": sub_tco2e,
                            "emission_factor_ref": ef_key,
                            "ef_value": Decimal(str(ef_meta["value"])),
                            "ef_unit": ef_meta.get("unit", ""),
                            "ef_source": ef_meta.get("source", ""),
                            "activity_type": act_type,
                            "quantity": (qty * share_weight).quantize(Decimal("0.0001")),
                            "unit": unit,
                            "month": month,
                            "attribution": f"benchmark_split ({round(share_weight * 100, 1)}%)",
                        })

                        pe = process_emissions[pid]
                        if scope_str == "1":
                            pe["scope1"] += sub_tco2e
                        elif scope_str == "2":
                            pe["scope2"] += sub_tco2e
                        else:
                            pe["scope3_partial"] += sub_tco2e
                        pe["tCO2e"] += sub_tco2e

            # Case C: Fallback if no sector template unit processes defined
            else:
                proc_key = specified_proc or "general_facility"
                line_items.append({
                    "activity_idx": act_idx,
                    "unit_process": proc_key,
                    "unit_process_name": proc_key.replace("_", " ").title(),
                    "scope": scope_str,
                    "tCO2e": tco2e,
                    "emission_factor_ref": ef_key,
                    "ef_value": Decimal(str(ef_meta["value"])),
                    "ef_unit": ef_meta.get("unit", ""),
                    "ef_source": ef_meta.get("source", ""),
                    "activity_type": act_type,
                    "quantity": qty,
                    "unit": unit,
                    "month": month,
                    "attribution": "fallback",
                })
                pe = process_emissions[proc_key]
                pe["unit_process"] = proc_key
                pe["unit_process_name"] = proc_key.replace("_", " ").title()
                if scope_str == "1":
                    pe["scope1"] += tco2e
                elif scope_str == "2":
                    pe["scope2"] += tco2e
                else:
                    pe["scope3_partial"] += tco2e
                pe["tCO2e"] += tco2e

        total_emissions = scope1_total + scope2_total + scope3_total

        # Calculate share percentages per unit process
        process_list = []
        for pid, data in process_emissions.items():
            if total_emissions > Decimal("0.0"):
                share = ((data["tCO2e"] / total_emissions) * Decimal(100)).quantize(Decimal("0.01"))
            else:
                share = Decimal("0.0")
            data["share_pct"] = share
            process_list.append(data)

        # Sort process list by tCO2e descending
        process_list.sort(key=lambda x: x["tCO2e"], reverse=True)

        return {
            "ef_version": self.ef_db.version,
            "region": region,
            "totals": {
                "scope1": scope1_total.quantize(Decimal("0.0001")),
                "scope2": scope2_total.quantize(Decimal("0.0001")),
                "scope3_partial": scope3_total.quantize(Decimal("0.0001")),
                "total": total_emissions.quantize(Decimal("0.0001")),
            },
            "line_items": line_items,
            "baseline_by_process": process_list,
        }


@lru_cache
def get_baseline_engine() -> BaselineEngine:
    return BaselineEngine()
