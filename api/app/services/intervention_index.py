import json
from pathlib import Path
from typing import Any, Dict, List

from app.config import get_settings

settings = get_settings()

_LIBRARY_DATA: List[Dict[str, Any]] | None = None

def load_library() -> List[Dict[str, Any]]:
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


def search_candidates(sector: str, process: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Linear metadata filter as per Phase 7 MVP specification.
    Filters interventions by applicable sector and process.
    """
    library = load_library()
    
    candidates = []
    for item in library:
        # Check if sector matches
        if sector in item.get("applicable_sectors", []):
            # Check if process matches
            if process in item.get("applicable_processes", []):
                candidates.append(item)
    
    # Return top N candidates based on metadata match
    return candidates[:limit]

def get_intervention_by_id(intervention_id: str) -> Dict[str, Any] | None:
    library = load_library()
    for item in library:
        if item.get("id") == intervention_id:
            return item
    return None
