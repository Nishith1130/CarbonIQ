import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    org_name: str = Field(..., min_length=2, description="SME organization name")
    sector_id: str = Field(..., description="Target sector identifier (e.g. textile_dyeing)")
    turnover_inr: Decimal | None = Field(None, description="Annual turnover in INR")
    export_markets: list[str] | None = Field(default_factory=list, description="List of export markets (e.g. ['EU', 'US'])")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    sector_id: str
    turnover_inr: Decimal | None = None
    export_markets: Any | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    org_id: uuid.UUID
    email: str
    org_name: str
    sector_id: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime
    organization: OrganizationResponse | None = None

    model_config = ConfigDict(from_attributes=True)
