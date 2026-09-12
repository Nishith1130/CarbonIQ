import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ActivityDataInput(BaseModel):
    activity_type: str = Field(..., description="Activity identifier, e.g. electricity_grid, coal_indian_bituminous, diesel_hsd")
    quantity: Decimal = Field(..., gt=0, description="Quantity consumed or generated")
    unit: str = Field(..., description="Unit of measurement: kWh, kg, litre, tonne_km, kL, etc.")
    unit_process: str | None = Field(None, description="Optional unit-process mapping. If omitted, benchmark split is used.")
    month: int | None = Field(None, ge=1, le=12, description="Month of bill (1-12)")


class CreateRunRequest(BaseModel):
    org_id: uuid.UUID | None = Field(None, description="Target organization ID. Defaults to current user's org.")
    sector_id: str | None = Field(None, description="Sector template. Defaults to organization's sector.")
    period_start: date | None = Field(None, description="Billing period start date")
    period_end: date | None = Field(None, description="Billing period end date")
    region: str | None = Field("IN_all_india", description="Grid region for CEA factor")
    activities: list[ActivityDataInput] = Field(..., min_length=1, description="List of entered bills / activity items")


class TotalsSchema(BaseModel):
    scope1: Decimal
    scope2: Decimal
    scope3_partial: Decimal
    total: Decimal


class HotspotResponse(BaseModel):
    id: uuid.UUID | None = None
    rank: int
    unit_process: str
    unit_process_name: str | None = None
    tCO2e: Decimal
    share_pct: Decimal
    scope1: Decimal | None = None
    scope2: Decimal | None = None
    scope3_partial: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class BaselineResultResponse(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    unit_process: str
    scope: str
    tCO2e: Decimal
    activity_data_id: uuid.UUID | None = None
    emission_factor_ref: str

    model_config = ConfigDict(from_attributes=True)


class RunResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    sector_id: str
    ef_version: str
    created_at: datetime
    period_start: date | None = None
    period_end: date | None = None
    totals: TotalsSchema
    baseline_by_process: list[dict[str, Any]]
    hotspots: list[HotspotResponse]
    line_items_count: int

    model_config = ConfigDict(from_attributes=True)
