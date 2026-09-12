import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.llm.embedding import embed_query
from app.models.intervention_embedding import InterventionEmbedding

_LIBRARY_DATA: list[dict[str, Any]] | None = None


def load_library() -> list[dict[str, Any]]:
    global _LIBRARY_DATA
    if _LIBRARY_DATA is None:
        file_path = Path(__file__).parent.parent / "data" / "intervention_library.json"
        if not file_path.exists():
            _LIBRARY_DATA = []
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _LIBRARY_DATA = data.get("interventions", [])
    return _LIBRARY_DATA


def search_candidates(db: Session, query: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Semantic search using pgvector cosine distance.

    Embeds the given query string and finds the closest intervention
    vectors in the `intervention_embeddings` table, then hydrates the
    result from the in-memory JSON library.
    """
    library = load_library()

    try:
        # Embed the search query
        query_vector = embed_query(query)

        # Nearest-neighbour search via pgvector
        records = (
            db.query(InterventionEmbedding)
            .order_by(InterventionEmbedding.vector.cosine_distance(query_vector))
            .limit(limit)
            .all()
        )

        # Build an id → record map for O(1) hydration
        id_set = {r.intervention_id for r in records}
        order_map = {r.intervention_id: idx for idx, r in enumerate(records)}

        candidates = [item for item in library if item.get("id") in id_set]
        # Preserve vector-distance order
        candidates.sort(key=lambda x: order_map.get(x["id"], 999))
        if candidates:
            return candidates
    except Exception:
        pass

    return library[:limit]


def get_intervention_by_id(intervention_id: str) -> dict[str, Any] | None:
    library = load_library()
    for item in library:
        if item.get("id") == intervention_id:
            return item
    return None
