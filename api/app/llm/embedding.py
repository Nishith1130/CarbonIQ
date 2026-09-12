"""
Centralized embedding helper using the new `google-genai` SDK.

The old `google-generativeai` package is deprecated and its v1beta API
endpoint no longer supports embedding models. This module uses the new SDK.
"""
from google import genai
from google.genai import types as genai_types

from app.config import get_settings

settings = get_settings()

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        key = settings.EMBEDDING_API_KEY or settings.LLM_API_KEY
        _client = genai.Client(api_key=key)
    return _client


EMBEDDING_MODEL = "models/gemini-embedding-001"  # 768-dim, stable GA model


def embed_document(text: str, title: str = "") -> list[float]:
    """Create a document embedding (for indexing at write time)."""
    client = _get_client()
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            title=title or None,
        ),
    )
    return response.embeddings[0].values


def embed_query(text: str) -> list[float]:
    """Create a query embedding (for searching at read time)."""
    client = _get_client()
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
        ),
    )
    return response.embeddings[0].values
