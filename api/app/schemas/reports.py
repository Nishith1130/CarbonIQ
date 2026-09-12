import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateRequest(BaseModel):
    template_type: Literal["brsr_core", "cbam", "buyer"] = Field(
        default="brsr_core", description="Report template name to render"
    )


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    template_type: str
    download_url: str
    file_size_bytes: int
    generated_at: datetime
