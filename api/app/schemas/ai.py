from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class ExtractedActivity(BaseModel):
    canonical_field: str = Field(..., description="The standard internal field name, e.g. electricity_grid")
    quantity: Decimal = Field(..., description="The numeric quantity extracted")
    unit: str = Field(..., description="The unit of measurement extracted")
    source_text: str = Field(..., description="The exact text snippet from the document this was extracted from")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")


class ExtractedDocument(BaseModel):
    period_start: Optional[date] = Field(None, description="Billing period start date if available")
    period_end: Optional[date] = Field(None, description="Billing period end date if available")
    activities: List[ExtractedActivity] = Field(default_factory=list, description="List of extracted activity items")


class RecommendationInput(BaseModel):
    intervention_id: str
    rank: int
    rationale: str
    source_citation: str


class RecommendationsResponse(BaseModel):
    recommendations: List[RecommendationInput]
