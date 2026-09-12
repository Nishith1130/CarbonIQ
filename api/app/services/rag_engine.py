import json
import logging
import os
from typing import List, Dict, Any

from google import genai
from google.genai import types

from app.schemas.ai import RecommendationsResponse
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

_INTERVENTION_LIBRARY_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "intervention_library.json"
)

def _load_library() -> List[Dict[str, Any]]:
    try:
        with open(_INTERVENTION_LIBRARY_PATH, "r") as f:
            data = json.load(f)
            return data.get("interventions", [])
    except Exception as e:
        logger.error(f"Failed to load intervention library: {str(e)}")
        return []

def get_recommendations(sector_id: str, hotspot_process: str) -> List[Dict[str, Any]]:
    """
    Retrieves, ranks, and returns validated recommendations for a given hotspot.
    Implements a strict fallback if the LLM is unavailable.
    """
    library = _load_library()
    
    # 1. Filter candidates by sector and process
    candidates = []
    for item in library:
        if sector_id in item.get("applicable_sectors", []) and \
           hotspot_process in item.get("applicable_processes", []):
            candidates.append(item)
            
    if not candidates:
        return []
        
    # 2. Prepare for LLM ranking
    # Give LLM just enough info to rank, without polluting it with ranges we'll attach later
    prompt_candidates = [
        {
            "id": c["id"], 
            "name": c["name"], 
            "description": c["description"],
            "circular_type": c.get("circular_type")
        } 
        for c in candidates
    ]
    
    system_prompt = f"""
    You are an expert industrial sustainability consultant.
    Your task is to rank the following candidate interventions for the '{hotspot_process}' process in the '{sector_id}' sector.
    Pick the top 3 most impactful and feasible interventions.
    Return a JSON object conforming EXACTLY to the RecommendationsResponse schema.
    Provide a concise, 1-2 sentence rationale for each.
    Use ONLY the provided intervention IDs.
    """
    
    raw_llm_recs = []
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=f"{system_prompt}\n\nCandidates:\n{json.dumps(prompt_candidates, indent=2)}")]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RecommendationsResponse,
                temperature=0.2
            )
        )
        parsed = RecommendationsResponse.model_validate_json(response.text)
        raw_llm_recs = parsed.recommendations
    except Exception as e:
        logger.warning(f"LLM Recommendation failed (fallback activated): {str(e)}")
        # Fallback: Just take the top 3 candidates directly
        raw_llm_recs = []
        for i, c in enumerate(candidates[:3]):
            class MockRec:
                intervention_id = c["id"]
                rank = i + 1
                rationale = "Similarity-based match — rationale unavailable"
            raw_llm_recs.append(MockRec())
            
    # 3. Guardrail validation & Metadata re-attachment
    # Whitelist against the actual library and attach authoritative data
    candidate_dict = {c["id"]: c for c in candidates}
    
    final_recommendations = []
    for rec in sorted(raw_llm_recs, key=lambda x: x.rank):
        if rec.intervention_id not in candidate_dict:
            logger.warning(f"Dropping hallucinated intervention ID: {rec.intervention_id}")
            continue
            
        canonical_item = candidate_dict[rec.intervention_id]
        final_recommendations.append({
            "intervention_id": canonical_item["id"],
            "rank": rec.rank,
            "rationale": rec.rationale,
            # Force authoritative metadata mapping (LLM cannot invent these)
            "source_citation": canonical_item.get("source_citation", ""),
            "cost_capex_lakh": canonical_item.get("cost_capex_lakh"),
            "energy_saving_pct_of_process": canonical_item.get("energy_saving_pct_of_process"),
            "payback_years": canonical_item.get("payback_years"),
        })
        
    return final_recommendations
