from pydantic import BaseModel, Field


class RecommendationItem(BaseModel):
    intervention_id: str = Field(..., description="The exact ID of the chosen intervention from the candidate list.")
    rationale: str = Field(..., description="Plain-language explanation of why this is recommended for the specific hotspot.")
    source_citation: str = Field(..., description="The exact source citation string provided in the candidate list.")
    rank: int = Field(..., description="The rank of this recommendation (1 being the best).")


class RecommendationOutput(BaseModel):
    recommendations: list[RecommendationItem] = Field(..., description="List of 3-5 ranked recommendations.")
