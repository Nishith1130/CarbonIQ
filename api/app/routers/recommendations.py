import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.recommender import create_recommendations

router = APIRouter(prefix="/runs", tags=["recommendations"])

class RecommendRequest(BaseModel):
    hotspot_id: uuid.UUID

@router.post("/{run_id}/recommend", response_model=List[Dict[str, Any]])
def get_recommendation_for_hotspot(
    run_id: uuid.UUID,
    payload: RecommendRequest,
    db: Session = Depends(get_db)
):
    try:
        results = create_recommendations(db, run_id, payload.hotspot_id)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error while generating recommendations.")
