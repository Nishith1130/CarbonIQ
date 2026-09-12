import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.llm.client import get_recommendations
from app.llm.schemas import RecommendationItem
from app.models.hotspot import Hotspot
from app.models.organization import Organization
from app.models.recommendation import Recommendation
from app.models.run import Run
from app.services.intervention_index import get_intervention_by_id, search_candidates

logger = logging.getLogger(__name__)


def create_recommendations(
    db: Session,
    run_id: uuid.UUID,
    hotspot_id: uuid.UUID,
) -> list[dict[str, Any]]:
    # 0. Idempotency guard — prevent duplicate recommendations from race conditions
    existing = db.query(Recommendation).filter(
        Recommendation.run_id == run_id,
        Recommendation.hotspot_id == hotspot_id,
    ).first()
    if existing:
        logger.info(f"Recommendations already exist for hotspot {hotspot_id}, skipping.")
        return []

    # 1. Fetch Hotspot and Run Context
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id, Hotspot.run_id == run_id).first()
    if not hotspot:
        raise ValueError("Hotspot not found for this run.")

    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise ValueError("Run not found.")

    org = db.query(Organization).filter(Organization.id == run.org_id).first()
    if not org:
        raise ValueError("Organization not found.")

    sector = org.sector_id
    process = hotspot.unit_process
    magnitude = float(hotspot.tCO2e)
    share_pct = float(hotspot.share_pct)
    is_estimated = hotspot.is_estimated
    data_source = hotspot.data_source

    # 2. Semantic retrieval from pgvector
    # Build a rich query so the vector search finds contextually relevant interventions
    semantic_query = (
        f"Carbon reduction interventions for {sector} industry, "
        f"specifically targeting the {process} process, "
        f"which contributes {round(share_pct, 1)}% of total emissions ({round(magnitude, 2)} tCO2e)."
    )
    candidates = search_candidates(db=db, query=semantic_query, limit=10)

    if not candidates:
        return []  # Graceful empty return

    # 3. Call LLM for ranked recommendations
    fallback = False
    recommendation_output = None

    try:
        recommendation_output = get_recommendations(
            sector=sector,
            unit_process=process,
            magnitude=magnitude,
            share_pct=share_pct,
            candidates=candidates,
            is_estimated=is_estimated,
            data_source=data_source,
        )
    except Exception as e:
        logger.error(f"LLM failed, falling back to similarity match: {e}")
        fallback = True

    # 4. Enforce Guardrails or use Fallback
    final_recs = []

    if fallback or not recommendation_output:
        # Fallback path: take top 3 candidates directly from vector ranking
        for idx, cand in enumerate(candidates[:3]):
            final_recs.append(
                RecommendationItem(
                    intervention_id=cand["id"],
                    rationale="Similarity-based match — rationale unavailable",
                    source_citation=cand.get("source_citation", "Unknown citation"),
                    rank=idx + 1,
                )
            )
    else:
        for rec in recommendation_output.recommendations:
            # Whitelist check: did LLM hallucinate an ID?
            cand = get_intervention_by_id(rec.intervention_id)
            if not cand:
                logger.warning(f"LLM hallucinated intervention ID: {rec.intervention_id}. Dropping.")
                continue

            # Always use the canonical citation from the library, not the LLM's version
            rec.source_citation = cand.get("source_citation", rec.source_citation)
            final_recs.append(rec)

    # Sort by rank
    final_recs = sorted(final_recs, key=lambda x: x.rank)

    # 5. Persist to DB
    persisted = []
    for item in final_recs:
        db_rec = Recommendation(
            run_id=run_id,
            hotspot_id=hotspot_id,
            intervention_id=item.intervention_id,
            rank=item.rank,
            rationale=item.rationale,
            source_citation=item.source_citation,
        )
        db.add(db_rec)
        persisted.append(db_rec)

    db.commit()

    result = []
    for p in persisted:
        db.refresh(p)
        result.append(
            {
                "id": str(p.id),
                "intervention_id": p.intervention_id,
                "rank": p.rank,
                "rationale": p.rationale,
                "source_citation": p.source_citation,
            }
        )

    return result
