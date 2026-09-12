from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import User
from app.schemas.ai import ExtractedDocument
from app.services.activity_normalizer import normalize_and_validate_document
from app.services.ai_extraction import extract_activities_from_image, extract_activities_from_text
from app.services.document_parser import DocumentParser

router = APIRouter(prefix="/uploads", tags=["AI Uploads & Extraction"])


@router.post("/bill", response_model=ExtractedDocument)
async def upload_bill(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process an uploaded bill (PDF or Image), extract activity data using LLM,
    normalize the fields, and return the structured JSON for user review.
    """
    file_bytes = await file.read()
    
    if DocumentParser.is_image(file.content_type or ""):
        # Pass to Vision API
        try:
            doc = extract_activities_from_image(file_bytes, file.content_type or "image/jpeg")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Treat as PDF or text
        text = DocumentParser.extract_text_from_pdf(file_bytes)
        if not text.strip():
            # If pdf extraction failed or yielded nothing, we could fallback to vision.
            # But for hackathon scope, we just error or pass to LLM as empty.
            raise HTTPException(status_code=400, detail="Could not extract text from the provided document.")
            
        try:
            doc = extract_activities_from_text(text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Normalize fields to strictly known canonical fields
    doc = normalize_and_validate_document(doc)
    return doc


@router.post("/text", response_model=ExtractedDocument)
async def upload_text(
    text: Annotated[str, Form(...)],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process raw text input, extract activity data, normalize, and return structured JSON.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    try:
        doc = extract_activities_from_text(text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    doc = normalize_and_validate_document(doc)
    return doc
