
from fastapi import APIRouter, HTTPException, status

from app.schemas.sectors import SectorInputSchemaResponse, SectorSummary
from app.services.sector_loader import get_sector_service

router = APIRouter(prefix="/sectors", tags=["Sectors"])


@router.get("", response_model=list[SectorSummary])
def list_sectors():
    """List all available SME sector templates with scale and process summaries."""
    svc = get_sector_service()
    return svc.list_sectors()


@router.get("/{sector_id}/schema", response_model=SectorInputSchemaResponse)
def get_sector_schema(sector_id: str):
    """
    Get the input schema for a specific sector.
    Provides the list of expected utility bills, units, and unit-processes to dynamically build entry forms.
    """
    svc = get_sector_service()
    try:
        return svc.get_input_schema(sector_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sector template '{sector_id}' not found.",
        ) from exc
