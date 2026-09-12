import logging
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import SessionLocal
from app.deps import get_current_org, get_current_user, get_db
from app.models import ActivityData, BaselineResult, Hotspot, Organization, Run, User
from app.schemas.runs import CreateRunRequest, HotspotResponse, RunResponse, TotalsSchema
from app.services.baseline import get_baseline_engine
from app.services.hotspot import HotspotRanker
from app.services.recommender import create_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["Runs & Calculations"])


@router.post("", response_model=RunResponse, status_code=status.HTTP_201_CREATED)
def create_run(
    data: CreateRunRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Execute baseline carbon calculation and hotspot detection for entered activity bills.
    Synchronous execution (< 200 ms) returning totals, breakdown, and top-3 Pareto hotspots.
    """
    target_org_id = data.org_id or current_org.id
    # Tenant protection: verify current user owns target_org_id
    if target_org_id != current_org.id:
        target_org = db.scalar(
            select(Organization).where(Organization.id == target_org_id, Organization.owner_user_id == current_user.id)
        )
        if not target_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to run calculations for this organization.",
            )
        sector_id = data.sector_id or target_org.sector_id
    else:
        sector_id = data.sector_id or current_org.sector_id

    # 1. Run deterministic baseline calculation
    engine = get_baseline_engine()
    raw_activities = [act.model_dump() for act in data.activities]
    baseline_calc = engine.calculate(
        sector_id=sector_id,
        activities=raw_activities,
        region=data.region or "IN_all_india",
    )

    # 2. Run Pareto hotspot detection
    hotspots_raw = HotspotRanker.detect_hotspots(
        baseline_by_process=baseline_calc["baseline_by_process"],
        total_emissions=baseline_calc["totals"]["total"],
        top_k=3,
    )

    # 3. Atomic Database Persist
    run = Run(
        org_id=target_org_id,
        period_start=data.period_start,
        period_end=data.period_end,
        ef_version=baseline_calc["ef_version"],
    )
    db.add(run)
    db.flush()

    # Persist activity items
    db_activities = []
    for act_input in data.activities:
        act_row = ActivityData(
            run_id=run.id,
            activity_type=act_input.activity_type,
            quantity=act_input.quantity,
            unit=act_input.unit,
            unit_process=act_input.unit_process or "factory_level",
            month=act_input.month,
        )
        db_activities.append(act_row)
    db.add_all(db_activities)
    db.flush()

    # Persist baseline line items linked to source activity
    db_line_items = []
    for line in baseline_calc["line_items"]:
        act_idx = line.get("activity_idx", 0)
        source_act_id = db_activities[act_idx].id if act_idx < len(db_activities) else None

        base_row = BaselineResult(
            run_id=run.id,
            unit_process=line["unit_process"],
            scope=line["scope"],
            tCO2e=line["tCO2e"],
            activity_data_id=source_act_id,
            emission_factor_ref=line["emission_factor_ref"],
            is_estimated=line.get("is_estimated", False),
            data_source=line.get("data_source", "measured"),
        )
        db_line_items.append(base_row)
    db.add_all(db_line_items)

    # Persist hotspots
    db_hotspots = []
    for h in hotspots_raw:
        h_row = Hotspot(
            run_id=run.id,
            rank=h["rank"],
            unit_process=h["unit_process"],
            tCO2e=h["tCO2e"],
            share_pct=h["share_pct"],
            is_estimated=h.get("is_estimated", False),
            data_source=h.get("data_source", "measured"),
        )
        db_hotspots.append(h_row)
    db.add_all(db_hotspots)

    db.commit()
    db.refresh(run)

    # Schedule background recommendation generation for each hotspot
    for h_obj in db_hotspots:
        background_tasks.add_task(
            _safe_create_recommendations,
            run_id=run.id,
            hotspot_id=h_obj.id,
        )

    # Format response
    hotspot_responses = [
        HotspotResponse(
            id=h_obj.id,
            rank=h_obj.rank,
            unit_process=h_obj.unit_process,
            unit_process_name=h_dict.get("unit_process_name"),
            tCO2e=h_obj.tCO2e,
            share_pct=h_obj.share_pct,
            scope1=h_dict.get("scope1"),
            scope2=h_dict.get("scope2"),
            scope3_partial=h_dict.get("scope3_partial"),
            is_estimated=h_obj.is_estimated,
            data_source=h_obj.data_source,
        )
        for h_obj, h_dict in zip(db_hotspots, hotspots_raw)
    ]

    return RunResponse(
        id=run.id,
        org_id=run.org_id,
        sector_id=sector_id,
        ef_version=run.ef_version,
        created_at=run.created_at,
        period_start=run.period_start,
        period_end=run.period_end,
        totals=TotalsSchema(**baseline_calc["totals"]),
        baseline_by_process=baseline_calc["baseline_by_process"],
        hotspots=hotspot_responses,
        line_items_count=len(db_line_items),
    )


@router.get("/{run_id}", response_model=RunResponse)
def get_run_by_id(
    run_id: uuid.UUID,
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Retrieve baseline results, process breakdowns, and hotspots for a past run.
    Enforces tenant isolation by scoping to the user's organization.
    """
    stmt = (
        select(Run)
        .where(Run.id == run_id, Run.org_id == current_org.id)
        .options(
            selectinload(Run.baseline_results),
            selectinload(Run.hotspots),
            selectinload(Run.activity_data),
        )
    )
    run = db.scalar(stmt)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calculation run not found.",
        )

    # Reconstitute totals and breakdown
    scope1 = sum((r.tCO2e for r in run.baseline_results if r.scope == "1"), Decimal("0.0"))
    scope2 = sum((r.tCO2e for r in run.baseline_results if r.scope == "2"), Decimal("0.0"))
    scope3 = sum((r.tCO2e for r in run.baseline_results if r.scope == "3_partial"), Decimal("0.0"))
    total = scope1 + scope2 + scope3

    # Group baseline by unit process
    proc_map: dict[str, dict] = {}
    for r in run.baseline_results:
        if r.unit_process not in proc_map:
            proc_map[r.unit_process] = {
                "unit_process": r.unit_process,
                "unit_process_name": r.unit_process.replace("_", " ").title(),
                "scope1": Decimal("0.0"),
                "scope2": Decimal("0.0"),
                "scope3_partial": Decimal("0.0"),
                "tCO2e": Decimal("0.0"),
                "share_pct": Decimal("0.0"),
            }
        p = proc_map[r.unit_process]
        if r.scope == "1":
            p["scope1"] += r.tCO2e
        elif r.scope == "2":
            p["scope2"] += r.tCO2e
        else:
            p["scope3_partial"] += r.tCO2e
        p["tCO2e"] += r.tCO2e

    proc_list = list(proc_map.values())
    for p in proc_list:
        p["share_pct"] = ((p["tCO2e"] / total) * Decimal(100)).quantize(Decimal("0.01")) if total > 0 else Decimal("0.0")
    proc_list.sort(key=lambda x: x["tCO2e"], reverse=True)

    sorted_hotspots = sorted(run.hotspots, key=lambda x: x.rank)
    hotspot_responses = [
        HotspotResponse(
            id=h.id,
            rank=h.rank,
            unit_process=h.unit_process,
            unit_process_name=h.unit_process.replace("_", " ").title(),
            tCO2e=h.tCO2e,
            share_pct=h.share_pct,
            is_estimated=h.is_estimated,
            data_source=h.data_source,
        )
        for h in sorted_hotspots
    ]

    return RunResponse(
        id=run.id,
        org_id=run.org_id,
        sector_id=current_org.sector_id,
        ef_version=run.ef_version,
        created_at=run.created_at,
        period_start=run.period_start,
        period_end=run.period_end,
        totals=TotalsSchema(
            scope1=scope1.quantize(Decimal("0.0001")),
            scope2=scope2.quantize(Decimal("0.0001")),
            scope3_partial=scope3.quantize(Decimal("0.0001")),
            total=total.quantize(Decimal("0.0001")),
        ),
        baseline_by_process=proc_list,
        hotspots=hotspot_responses,
        line_items_count=len(run.baseline_results),
    )


@router.get("", response_model=list[RunResponse])
def list_runs(
    current_org: Annotated[Organization, Depends(get_current_org)],
    db: Annotated[Session, Depends(get_db)],
):
    """List all calculation runs for the current organization."""
    stmt = (
        select(Run)
        .where(Run.org_id == current_org.id)
        .order_by(desc(Run.created_at))
        .options(
            selectinload(Run.baseline_results),
            selectinload(Run.hotspots),
        )
    )
    runs = db.scalars(stmt).all()

    responses = []
    for run in runs:
        scope1 = sum((r.tCO2e for r in run.baseline_results if r.scope == "1"), Decimal("0.0"))
        scope2 = sum((r.tCO2e for r in run.baseline_results if r.scope == "2"), Decimal("0.0"))
        scope3 = sum((r.tCO2e for r in run.baseline_results if r.scope == "3_partial"), Decimal("0.0"))
        total = scope1 + scope2 + scope3

        responses.append(
            RunResponse(
                id=run.id,
                org_id=run.org_id,
                sector_id=current_org.sector_id,
                ef_version=run.ef_version,
                created_at=run.created_at,
                period_start=run.period_start,
                period_end=run.period_end,
                totals=TotalsSchema(
                    scope1=scope1.quantize(Decimal("0.0001")),
                    scope2=scope2.quantize(Decimal("0.0001")),
                    scope3_partial=scope3.quantize(Decimal("0.0001")),
                    total=total.quantize(Decimal("0.0001")),
                ),
                baseline_by_process=[],
                hotspots=[
                    HotspotResponse(
                        id=h.id,
                        rank=h.rank,
                        unit_process=h.unit_process,
                        unit_process_name=h.unit_process.replace("_", " ").title(),
                        tCO2e=h.tCO2e,
                        share_pct=h.share_pct,
                        is_estimated=h.is_estimated,
                        data_source=h.data_source,
                    )
                    for h in sorted(run.hotspots, key=lambda x: x.rank)
                ],
                line_items_count=len(run.baseline_results),
            )
        )
    return responses


def _safe_create_recommendations(run_id: uuid.UUID, hotspot_id: uuid.UUID) -> None:
    """
    Background task: generate recommendations for a single hotspot.
    Uses its own DB session so a Gemini timeout cannot fail the run itself.
    """
    db = SessionLocal()
    try:
        create_recommendations(db, run_id, hotspot_id)
        logger.info(f"Background recommendations generated for hotspot {hotspot_id}")
    except Exception as e:
        logger.warning(f"Background recommendation for hotspot {hotspot_id} failed: {e}")
    finally:
        db.close()
