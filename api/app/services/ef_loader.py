import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
EF_FILE = DATA_DIR / "emission_factors.json"


class EmissionFactorDatabase:
    def __init__(self, data_path: Path = EF_FILE):
        if not data_path.exists():
            raise FileNotFoundError(f"Emission factors file not found at: {data_path}")
        with open(data_path, "r", encoding="utf-8") as f:
            self._raw = json.load(f)

        self.version: str = self._raw.get("version", "cea_v20.0_ipcc_ar6_defra_2024")
        self.factors: dict[str, dict[str, Any]] = self._raw.get("factors", {})

    def get_factor(self, factor_key: str) -> dict[str, Any] | None:
        return self.factors.get(factor_key)

    def resolve_factor(self, activity_type: str, region: str = "IN_all_india") -> tuple[str, dict[str, Any]]:
        """Resolve the factor key and metadata given an activity_type."""
        # 1. Direct key match
        if activity_type in self.factors:
            return activity_type, self.factors[activity_type]

        # 2. Electricity grid regional handling
        if activity_type.startswith("electricity_grid") or activity_type == "electricity":
            # Map region suffixes if provided
            region_clean = region.lower().replace("in_", "").replace("india_", "")
            reg_key = f"electricity_grid_in_{region_clean}"
            if reg_key in self.factors:
                return reg_key, self.factors[reg_key]
            return "electricity_grid_in_all_india", self.factors["electricity_grid_in_all_india"]

        # 3. Coal prefix handling
        if activity_type in ("coal", "coal_bituminous", "steam_coal"):
            return "coal_indian_bituminous", self.factors["coal_indian_bituminous"]

        # 4. Diesel prefix handling
        if activity_type in ("diesel", "diesel_generator", "hsd"):
            return "diesel_hsd", self.factors["diesel_hsd"]

        # 5. LPG prefix handling
        if activity_type in ("lpg", "lpg_cylinder"):
            return "lpg_commercial", self.factors["lpg_commercial"]

        # 6. Natural gas prefix handling
        if activity_type in ("natural_gas", "piped_gas", "png"):
            return "natural_gas_indian_grid", self.factors["natural_gas_indian_grid"]

        # 7. Freight handling
        if activity_type in ("road_freight", "transport", "logistics"):
            return "road_freight_medium_truck", self.factors["road_freight_medium_truck"]

        # 8. Refrigerant handling
        if "134a" in activity_type:
            return "refrigerant_r134a_gwp100", self.factors["refrigerant_r134a_gwp100"]
        if "22" in activity_type:
            return "refrigerant_r22_gwp100", self.factors["refrigerant_r22_gwp100"]
        if "410a" in activity_type:
            return "refrigerant_r410a_gwp100", self.factors["refrigerant_r410a_gwp100"]

        # 9. Biomass handling
        if "rice" in activity_type:
            return "biomass_rice_husk", self.factors["biomass_rice_husk"]
        if "bagasse" in activity_type or "biomass" in activity_type:
            return "biomass_bagasse", self.factors["biomass_bagasse"]

        # 10. Water handling
        if "water" in activity_type:
            return "water_treatment_electric_pump", self.factors["water_treatment_electric_pump"]

        raise ValueError(f"Unrecognized activity type: '{activity_type}'")

    def compute_tco2e(
        self,
        activity_type: str,
        quantity: Decimal,
        unit: str,
        region: str = "IN_all_india",
    ) -> tuple[Decimal, str, str, dict[str, Any]]:
        """
        Compute tCO2e for an activity.
        Returns (tCO2e, scope_str, factor_key, factor_dict).
        Scope strings: '1', '2', '3_partial'.
        """
        factor_key, factor_dict = self.resolve_factor(activity_type, region=region)
        factor_val = Decimal(str(factor_dict["value"]))
        scope_num = factor_dict.get("scope", 1)
        scope_str = "3_partial" if scope_num == 3 else str(scope_num)
        factor_unit = factor_dict.get("unit", "")

        q = Decimal(str(quantity))

        # 1. Grid electricity (factor value in tCO2/MWh, e.g. 0.7117)
        if "electricity_grid" in factor_key:
            if unit.lower() in ("kwh", "units"):
                tco2e = (q / Decimal(1000)) * factor_val
            elif unit.lower() == "mwh":
                tco2e = q * factor_val
            else:
                tco2e = (q / Decimal(1000)) * factor_val

        # 2. Coal (factor value in tCO2/tonne_coal, e.g. 2.42)
        elif "coal" in factor_key:
            if unit.lower() in ("kg", "kgs"):
                tco2e = (q / Decimal(1000)) * factor_val
            elif unit.lower() in ("tonne", "tonnes", "mt"):
                tco2e = q * factor_val
            else:
                tco2e = (q / Decimal(1000)) * factor_val

        # 3. Liquid fuels: Diesel, HFO (factor value in kgCO2/litre, e.g. 2.68)
        elif factor_key in ("diesel_hsd", "hfo_furnace_oil"):
            if unit.lower() in ("l", "litre", "litres", "liter", "liters"):
                tco2e = (q * factor_val) / Decimal(1000)
            elif unit.lower() in ("kl", "kilolitre"):
                tco2e = q * factor_val
            else:
                tco2e = (q * factor_val) / Decimal(1000)

        # 4. Gaseous / Mass fuels: LPG, NG (factor in kgCO2/kg or kgCO2/Nm3, e.g. 2.98, 2.02)
        elif factor_key in ("lpg_commercial", "natural_gas_indian_grid"):
            tco2e = (q * factor_val) / Decimal(1000)

        # 5. Biomass (direct CO2 = 0.0)
        elif "biomass" in factor_key:
            tco2e = Decimal("0.0")

        # 6. Freight (factor in kgCO2/tonne-km, e.g. 0.212)
        elif "freight" in factor_key or "refrigerant" in factor_key:
            tco2e = (q * factor_val) / Decimal(1000)

        # 8. Purchased raw materials: Yarn, Steel, Aluminium (factor in tCO2/tonne)
        elif factor_key.startswith("purchased_"):
            if unit.lower() in ("kg", "kgs"):
                tco2e = (q / Decimal(1000)) * factor_val
            else:
                tco2e = q * factor_val

        # 9. Water Treatment (0.4 kWh/kL pumping electricity -> Scope 2 grid)
        elif factor_key == "water_treatment_electric_pump":
            grid_ef = Decimal(str(self.factors["electricity_grid_in_all_india"]["value"]))
            # q in kL * 0.4 kWh/kL = kWh; kWh / 1000 * grid_ef = tCO2e
            kwh = q * factor_val
            tco2e = (kwh / Decimal(1000)) * grid_ef
            scope_str = "2"

        else:
            # General fallback: check unit string
            if "kg" in factor_unit:
                tco2e = (q * factor_val) / Decimal(1000)
            else:
                tco2e = q * factor_val

        return tco2e.quantize(Decimal("0.0001")), scope_str, factor_key, factor_dict


@lru_cache
def get_ef_db() -> EmissionFactorDatabase:
    return EmissionFactorDatabase()
