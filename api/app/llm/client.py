import logging
import json
from typing import Any, Dict, List

from google import genai
from google.genai import types as genai_types

from app.config import get_settings
from app.llm.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.llm.schemas import RecommendationOutput

logger = logging.getLogger(__name__)
settings = get_settings()

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.LLM_API_KEY or settings.LLM_API_KEY in ("mock-key", "mock-or-real-api-key"):
            raise ValueError("LLM_API_KEY is not configured. Please set a valid Gemini API key.")
        _client = genai.Client(api_key=settings.LLM_API_KEY)
    return _client


RECOMMENDATION_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]


def get_recommendations(
    sector: str,
    unit_process: str,
    magnitude: float,
    share_pct: float,
    candidates: List[Dict[str, Any]],
    is_estimated: bool = False,
    data_source: str = "measured",
) -> RecommendationOutput:
    """
    Calls Gemini via the new google-genai SDK with structured JSON output.
    Attempts multiple models in fallback order to handle 503 high-demand or transient errors.
    Raises exceptions on failure (handled by the Recommender service for fallback).
    """
    client = _get_client()

    candidates_json = json.dumps(candidates, indent=2)
    prompt = USER_PROMPT_TEMPLATE.format(
        sector=sector,
        unit_process=unit_process,
        magnitude=round(magnitude, 2),
        share_pct=round(share_pct, 2),
        candidates_json=candidates_json,
        is_estimated=is_estimated,
        data_source=data_source,
    )

    last_err: Exception | None = None
    for model_name in RECOMMENDATION_MODELS:
        try:
            logger.info(f"Generating recommendations with model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=RecommendationOutput,
                    temperature=0.2,
                ),
            )

            raw_json = response.text
            return RecommendationOutput.model_validate_json(raw_json)
        except Exception as e:
            logger.warning(f"Model {model_name} failed for recommendations: {e}")
            last_err = e

    logger.error(f"All recommendation models failed. Last error: {last_err}")
    raise ValueError(f"Failed to generate recommendations across all models: {last_err}")
