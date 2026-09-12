from typing import Any, Dict, List
import json
import logging
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from app.config import get_settings
from app.llm.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.llm.schemas import RecommendationOutput

logger = logging.getLogger(__name__)
settings = get_settings()

if settings.LLM_API_KEY:
    genai.configure(api_key=settings.LLM_API_KEY)


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
    Calls Gemini API with strict structured output.
    Raises exceptions on failure (handled by Recommender service for fallback).
    """
    if not settings.LLM_API_KEY or settings.LLM_API_KEY == "mock-or-real-api-key":
        raise ValueError("LLM API key is not configured or is the default mock value.")

    # Initialize model
    model = genai.GenerativeModel(
        model_name="gemini-3.6-flash",
        system_instruction=SYSTEM_PROMPT,
    )

    # Prepare inputs
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

    # Force structured output based on our schema
    response = model.generate_content(
        prompt,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            response_schema=RecommendationOutput,
            temperature=0.2, # Low temperature for more deterministic reasoning
        )
    )

    try:
        # Parse output
        raw_json = response.text
        return RecommendationOutput.model_validate_json(raw_json)
    except Exception as e:
        logger.error(f"Failed to parse LLM response: {e}")
        logger.error(f"Raw output: {response.text}")
        raise ValueError(f"Invalid JSON returned from LLM: {e}")

