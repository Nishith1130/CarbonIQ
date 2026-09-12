"""
POST /upload-bills

Accepts one or more PDF/image files, extracts structured activity data
from each file using Gemini's multimodal capabilities, and returns a
merged list of ActivityDataInput objects ready for the frontend to
auto-fill the manual entry form.
"""
import json
import logging
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel

from app.config import get_settings
from app.schemas.runs import ActivityDataInput

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/upload", tags=["Bill Upload"])

_EXTRACTION_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "activity_type": {
                "type": "string",
                "description": "Activity identifier, e.g. electricity_grid, coal_indian_bituminous, diesel_hsd, png_piped_natural_gas",
            },
            "quantity": {"type": "number", "description": "Numeric quantity consumed"},
            "unit": {
                "type": "string",
                "description": "Unit of measurement: kWh, kg, litre, tonne_km, kL, m3, etc.",
            },
            "unit_process": {
                "type": "string",
                "description": "Manufacturing process this bill belongs to, e.g. stenter_drying, dyeing, weaving, melting",
            },
            "month": {
                "type": "integer",
                "description": "Billing month as an integer 1-12, or null if unknown",
            },
        },
        "required": ["activity_type", "quantity", "unit"],
    },
}

_EXTRACTION_PROMPT = """You are an expert at extracting structured carbon-footprint activity data from utility bills and invoices.

Analyse the provided document carefully and extract ALL energy and fuel consumption entries as a JSON array.
Each item must conform exactly to this schema:
- activity_type: The type of energy/fuel. Common values: electricity_grid, diesel_hsd, png_piped_natural_gas, coal_indian_bituminous, furnace_oil, lpg, steam_purchased.
- quantity: A positive numeric value.
- unit: The measurement unit (kWh, litre, kg, m3, tonne, kL, etc.).
- unit_process: If identifiable from context, the manufacturing step this energy is used for (e.g., stenter_drying, dyeing, melting). Otherwise omit or use null.
- month: The billing month as an integer (1=January … 12=December). If not clearly stated, use null.

Return ONLY the JSON array, with no explanation or markdown fences."""


def _get_client() -> genai.Client:
    if not settings.LLM_API_KEY or settings.LLM_API_KEY in ("mock-key", "mock-or-real-api-key"):
        raise HTTPException(status_code=503, detail="LLM API key is not configured on this server.")
    return genai.Client(api_key=settings.LLM_API_KEY)


class ParsedBillResponse(BaseModel):
    activities: List[ActivityDataInput]
    file_count: int
    warnings: List[str] = []


EXTRACTION_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]


@router.post("/bills", response_model=ParsedBillResponse)
async def upload_bills(files: List[UploadFile] = File(...)):
    """
    Upload one or more PDF/image utility bills.
    Returns extracted activity data merged from all files,
    ready for the frontend to auto-fill the manual entry form.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    client = _get_client()
    all_activities: List[ActivityDataInput] = []
    warnings: List[str] = []

    for upload in files:
        filename = upload.filename or "unknown"
        content_type = upload.content_type or "application/octet-stream"

        # Read the file bytes
        file_bytes = await upload.read()
        if not file_bytes:
            warnings.append(f"File '{filename}' is empty — skipped.")
            continue

        logger.info(f"Processing uploaded file: {filename} ({len(file_bytes)} bytes)")

        # Prepare multimodal part: direct bytes is fastest; fall back to Files API if needed
        file_part = None
        tmp_path = None

        try:
            # Inline bytes for files under 20MB
            if len(file_bytes) < 20 * 1024 * 1024:
                file_part = genai_types.Part.from_bytes(data=file_bytes, mime_type=content_type)
            else:
                with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name

                uploaded_file = client.files.upload(
                    file=tmp_path,
                    config=genai_types.UploadFileConfig(
                        display_name=filename,
                        mime_type=content_type,
                    ),
                )
                file_part = genai_types.Part.from_uri(
                    file_uri=uploaded_file.uri,
                    mime_type=content_type,
                )
        except Exception as upload_err:
            logger.warning(f"Could not prepare file part directly for '{filename}': {upload_err}")
            # Fallback to Files API
            try:
                if not tmp_path:
                    with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
                        tmp.write(file_bytes)
                        tmp_path = tmp.name
                uploaded_file = client.files.upload(
                    file=tmp_path,
                    config=genai_types.UploadFileConfig(
                        display_name=filename,
                        mime_type=content_type,
                    ),
                )
                file_part = genai_types.Part.from_uri(
                    file_uri=uploaded_file.uri,
                    mime_type=content_type,
                )
            except Exception as file_api_err:
                warnings.append(f"'{filename}': Failed to stage file for AI analysis: {file_api_err}")
                continue

        # Try models in fallback order to handle 503 high-demand or transient errors
        extraction_success = False
        last_error = None

        for model_name in EXTRACTION_MODELS:
            try:
                logger.info(f"Attempting extraction on '{filename}' using model: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=[file_part, _EXTRACTION_PROMPT],
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )

                raw = response.text.strip()
                extracted = json.loads(raw)

                if not isinstance(extracted, list):
                    raise ValueError(f"Expected a JSON list but got {type(extracted).__name__}")

                for item in extracted:
                    try:
                        activity = ActivityDataInput(**item)
                        all_activities.append(activity)
                    except Exception as parse_err:
                        warnings.append(f"'{filename}': skipped malformed item — {parse_err}")

                extraction_success = True
                logger.info(f"Successfully extracted data from '{filename}' using {model_name}")
                break

            except json.JSONDecodeError as json_err:
                last_error = f"Model returned invalid JSON: {json_err}"
                logger.warning(f"Model {model_name} returned non-JSON for '{filename}': {json_err}")
            except Exception as model_err:
                last_error = str(model_err)
                logger.warning(f"Model {model_name} failed on '{filename}': {model_err}")

        if not extraction_success:
            warnings.append(f"'{filename}': extraction failed across all models — {last_error}")

        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass

    if not all_activities and files:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any activity data from the provided files. " + "; ".join(warnings),
        )

    return ParsedBillResponse(
        activities=all_activities,
        file_count=len(files),
        warnings=warnings,
    )
