import base64
import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.schemas.ai import ExtractedDocument
from app.services.activity_normalizer import CANONICAL_ACTIVITIES
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

EXTRACTION_SYSTEM_PROMPT = f"""
You are an expert industrial carbon footprint data extraction AI.
Your task is to extract energy and utility consumption data from utility bills or raw text.
You must return a STRICT JSON object conforming EXACTLY to the structure requested.

Allowed canonical fields for 'canonical_field':
{json.dumps(list(CANONICAL_ACTIVITIES))}

Rules:
1. NEVER calculate total emissions yourself.
2. Only map to the closest allowed canonical_field.
3. If an item cannot be mapped, omit it.
4. Extract the numeric quantity and string unit (e.g., 'kWh', 'kg', 'litre').
5. Provide a confidence score (0.0 to 1.0) and the exact source_text snippet.
"""

def extract_activities_from_text(text: str) -> ExtractedDocument:
    """Extracts activity data from plain text."""
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=f"{EXTRACTION_SYSTEM_PROMPT}\n\nExtract the data into JSON from the following text:\n\n{text}")]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedDocument,
                temperature=0.1
            )
        )
        
        raw_json = response.text
        return ExtractedDocument.model_validate_json(raw_json)
        
    except Exception as e:
        logger.error(f"LLM Extraction failed: {str(e)}")
        raise ValueError(f"Failed to extract structured data from text: {str(e)}")


def extract_activities_from_image(image_bytes: bytes, mime_type: str) -> ExtractedDocument:
    """Extracts activity data from a raw image using Gemini Vision API."""
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=f"{EXTRACTION_SYSTEM_PROMPT}\n\nExtract the utility data into JSON from this image."),
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedDocument,
                temperature=0.1
            )
        )
        
        raw_json = response.text
        return ExtractedDocument.model_validate_json(raw_json)
        
    except Exception as e:
        logger.error(f"LLM Image Extraction failed: {str(e)}")
        raise ValueError(f"Failed to extract structured data from image: {str(e)}")
