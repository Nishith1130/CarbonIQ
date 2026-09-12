from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.deps import get_current_org, get_current_user, get_db
from app.models import Organization, User
from app.schemas.orgs import OrgCreateRequest, OrgResponse, OrgUpdateRequest

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrgCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new SME organization for the authenticated user."""
    org = Organization(
        owner_user_id=current_user.id,
        name=data.name,
        sector_id=data.sector_id,
        turnover_inr=data.turnover_inr,
        export_markets=data.export_markets or [],
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/me", response_model=OrgResponse)
def get_my_organization(
    current_org: Annotated[Organization, Depends(get_current_org)],
):
    """Get the active organization for the current user."""
    return current_org


@router.patch("/me", response_model=OrgResponse)
def update_my_organization(
    data: OrgUpdateRequest,
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """Update organization turnover, export markets, or legal name."""
    if data.name is not None:
        current_org.name = data.name
    if data.turnover_inr is not None:
        current_org.turnover_inr = data.turnover_inr
    if data.export_markets is not None:
        current_org.export_markets = data.export_markets

    db.commit()
    db.refresh(current_org)
    return current_org
