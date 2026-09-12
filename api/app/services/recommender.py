import logging
import uuid
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.llm.client import get_recommendations
from app.llm.schemas import RecommendationOutput, RecommendationItem
from app.models.hotspot import Hotspot
from app.models.recommendation import Recommendation
from app.models.organization import Organization
from app.models.run import Run
from app.services.intervention_index import search_candidates, get_intervention_by_id

logger = logging.getLogger(__name__)

def create_recommendations(
    db: Session,
    run_id: uuid.UUID,
    hotspot_id: uuid.UUID
) -> List[Dict[str, Any]]:
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

    # 2. Retrieve Candidates (Linear filter for MVP)
    candidates = search_candidates(sector=sector, process=process, limit=10)
    
    if not candidates:
        return [] # Graceful empty return

    # 3. Call LLM
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
        # Fallback path: take top 3 candidates directly
        for idx, cand in enumerate(candidates[:3]):
            final_recs.append(
                RecommendationItem(
                    intervention_id=cand["id"],
                    rationale="Similarity-based match — rationale unavailable",
                    source_citation=cand.get("source_citation", "Unknown citation"),
                    rank=idx + 1
                )
            )
    else:
        # Guardrails on LLM output
        for rec in recommendation_output.recommendations:
            # Check whitelist (did LLM invent this?)
            cand = get_intervention_by_id(rec.intervention_id)
            if not cand:
                logger.warning(f"LLM hallucinated intervention ID: {rec.intervention_id}. Dropping.")
                continue
            
            # Re-attach original citation (never trust LLM citation blindly)
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
            source_citation=item.source_citation
        )
        db.add(db_rec)
        persisted.append(db_rec)
    
    db.commit()
    
    # Return serializable dicts
    result = []
    for p in persisted:
        db.refresh(p)
        result.append({
            "id": str(p.id),
            "intervention_id": p.intervention_id,
            "rank": p.rank,
            "rationale": p.rationale,
            "source_citation": p.source_citation
        })
        
    return result
