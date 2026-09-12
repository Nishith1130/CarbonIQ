import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_org, get_current_user, get_db
from app.models import Organization, Report, Run, User
from app.schemas.reports import ReportGenerateRequest, ReportResponse
from app.services.report_gen import generate_brsr_report_pdf

router = APIRouter(tags=["Reports"])


@router.post("/runs/{run_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    run_id: uuid.UUID,
    data: ReportGenerateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Generate an official BRSR Core PDF audit report for an emission calculation run.
    Stores the PDF artifact in the database and returns the download URL.
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

    if not run or run.org_id != current_org.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calculation run not found.",
        )

    report = generate_brsr_report_pdf(run=run, db=db, template_type=data.template_type)

    return ReportResponse(
        id=report.id,
        run_id=run.id,
        template_type=report.template_type,
        download_url=f"/reports/{report.id}",
        file_size_bytes=len(report.file),
        generated_at=report.generated_at,
    )


@router.get("/reports/{report_id}")
def download_report(
    report_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Download or stream the generated PDF report.
    Returns binary PDF stream with proper MIME headers. Multi-tenant isolated.
    """
    stmt = (
        select(Report)
        .where(Report.id == report_id)
        .options(selectinload(Report.run))
    )
    report = db.scalar(stmt)

    if not report or not report.run or report.run.org_id != current_org.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    return Response(
        content=report.file,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="CarbonIQ_BRSR_Core_{report.id}.pdf"',
            "Content-Length": str(len(report.file)),
        },
    )
