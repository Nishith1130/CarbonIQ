import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_org, get_current_user, get_db
from app.models import Organization, Run, User
from app.schemas.macc import MACCResponse
from app.services.macc import calculate_macc_for_run

router = APIRouter(tags=["MACC"])


@router.post("/runs/{run_id}/macc", response_model=MACCResponse)
@router.get("/runs/{run_id}/macc", response_model=MACCResponse)
def get_run_macc(
    run_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Calculate or retrieve Marginal Abatement Cost Curve (MACC) data for a given run.
    Returns interventions ranked by cost per tCO2e abated (INR/tCO2e) with payback years and CapEx.
    Strictly isolated to the authenticated organization.
    """
    stmt = (
        select(Run)
        .where(Run.id == run_id)
        .options(
            selectinload(Run.organization),
            selectinload(Run.hotspots),
            selectinload(Run.recommendations),
        )
    )
    run = db.scalar(stmt)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calculation run not found.",
        )

    # Multi-tenant security check
    if run.org_id != current_org.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calculation run not found.",
        )

    return calculate_macc_for_run(run=run, db=db)
