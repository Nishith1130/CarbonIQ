import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import uuid

import pytest
from sqlalchemy.orm import Session

from app.models.hotspot import Hotspot
from app.models.run import Run
from app.models.recommendation import Recommendation
from app.services.recommender import create_recommendations


@pytest.fixture
def test_hotspot(db_session: Session, test_run: Run) -> Hotspot:
    hotspot = Hotspot(
        run_id=test_run.id,
        rank=1,
        unit_process="stenter_drying",
        tCO2e=15.5,
        share_pct=45.0
    )
    db_session.add(hotspot)
    db_session.commit()
    db_session.refresh(hotspot)
    return hotspot


def load_mock_response(filename: str) -> str:
    path = Path(__file__).parent / "fixtures" / "mock_llm_responses" / filename
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


@patch("app.llm.client.genai.GenerativeModel")
def test_recommender_happy_path(mock_genai, db_session: Session, test_run: Run, test_hotspot: Hotspot):
    # Setup mock
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = load_mock_response("happy_path.json")
    mock_model.generate_content.return_value = mock_response
    mock_genai.return_value = mock_model

    # Run
    results = create_recommendations(db_session, test_run.id, test_hotspot.id)

    # Verify
    assert len(results) == 1
    assert results[0]["intervention_id"] == "tx_waste_heat_recovery_stenter"
    assert results[0]["source_citation"] != "Unknown citation" # Re-attached or kept


@patch("app.llm.client.genai.GenerativeModel")
def test_recommender_drops_hallucinated_intervention(mock_genai, db_session: Session, test_run: Run, test_hotspot: Hotspot):
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = load_mock_response("hallucinated_id.json")
    mock_model.generate_content.return_value = mock_response
    mock_genai.return_value = mock_model

    results = create_recommendations(db_session, test_run.id, test_hotspot.id)
    
    # Since the single recommendation was hallucinated (not in our intervention_library), it should be dropped.
    # Therefore, results should be 0.
    assert len(results) == 0


@patch("app.llm.client.genai.GenerativeModel")
def test_recommender_reattaches_missing_citation(mock_genai, db_session: Session, test_run: Run, test_hotspot: Hotspot):
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = load_mock_response("missing_citation.json")
    mock_model.generate_content.return_value = mock_response
    mock_genai.return_value = mock_model

    results = create_recommendations(db_session, test_run.id, test_hotspot.id)

    # Should re-attach citation from the library
    assert len(results) == 1
    assert "BEE PAT" in results[0]["source_citation"] # Known from library


@patch("app.llm.client.genai.GenerativeModel")
def test_recommender_fallback_on_malformed_json(mock_genai, db_session: Session, test_run: Run, test_hotspot: Hotspot):
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is not json."
    mock_model.generate_content.return_value = mock_response
    mock_genai.return_value = mock_model

    results = create_recommendations(db_session, test_run.id, test_hotspot.id)

    # Should fallback to similarity-based top 3
    assert len(results) > 0
    assert results[0]["rationale"] == "Similarity-based match — rationale unavailable"
