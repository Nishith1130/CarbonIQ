import uuid

from pydantic import BaseModel, ConfigDict, Field


class MACCItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recommendation_id: uuid.UUID
    intervention_id: str
    intervention_name: str
    unit_process_id: str | None = None
    cost_capex_inr: float = Field(..., description="CapEx in Indian Rupees")
    annual_saving_inr: float = Field(..., description="Estimated annual financial savings in INR")
    tco2e_reduced_annual: float = Field(..., description="Estimated annual emissions reduced in tCO2e")
    cost_per_tco2e: float = Field(..., description="Marginal abatement cost (INR/tCO2e)")
    payback_years: float = Field(..., description="Payback duration in years")
    circular_type: str | None = Field(None, description="Circular strategy category")
    source_citation: str = Field(..., description="Official study/BEE citation")
    rationale: str = Field(..., description="Intervention explanation and application")


class MACCResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: uuid.UUID
    total_interventions: int
    items: list[MACCItemResponse] = Field(
        ..., description="Interventions sorted by cost_per_tco2e ascending for MACC chart"
    )
