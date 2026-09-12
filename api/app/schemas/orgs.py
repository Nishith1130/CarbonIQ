import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict


class OrgCreateRequest(BaseModel):
    name: str
    sector_id: str
    turnover_inr: Decimal | None = None
    export_markets: list[str] | None = None


class OrgUpdateRequest(BaseModel):
    name: str | None = None
    turnover_inr: Decimal | None = None
    export_markets: list[str] | None = None


class OrgResponse(BaseModel):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    name: str
    sector_id: str
    turnover_inr: Decimal | None = None
    export_markets: Any | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
