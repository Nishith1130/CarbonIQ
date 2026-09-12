from typing import Any

from pydantic import BaseModel


class SectorSummary(BaseModel):
    sector_id: str
    display_name: str
    description: str
    typical_scale: dict[str, Any]
    unit_processes_count: int
    activities_count: int


class UnitProcessSchema(BaseModel):
    id: str
    name: str
    typical_thermal_share_pct: float
    typical_electric_share_pct: float
    typical_water_share_pct: float
    notes: str | None = ""


class ActivityExpectedSchema(BaseModel):
    activity_type: str
    unit: str
    period: str
    description: str | None = ""


class SectorInputSchemaResponse(BaseModel):
    sector_id: str
    display_name: str
    description: str
    unit_processes: list[UnitProcessSchema]
    activities_expected: list[ActivityExpectedSchema]
    typical_hotspots: list[str]
    applicable_regulations: list[str]
    sources: list[str]
