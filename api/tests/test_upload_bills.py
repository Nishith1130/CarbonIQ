import io
import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_MOCK_SUCCESS_JSON = json.dumps([
    {"activity_type": "electricity_grid", "quantity": 100000, "unit": "kWh"},
    {"activity_type": "coal_indian_bituminous", "quantity": 40000, "unit": "kg"},
    {"activity_type": "diesel_hsd", "quantity": 1000, "unit": "litre"},
])


@patch("app.routers.upload._get_client")
def test_upload_bills_success(mock_get_client):
    mock_genai_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = _MOCK_SUCCESS_JSON
    mock_genai_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_genai_client

    fake_file = io.BytesIO(b"fake image data")
    response = client.post(
        "/upload/bills",
        files={"files": ("fake_bill.jpg", fake_file, "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["file_count"] == 1
    assert len(data["activities"]) == 3
    assert data["activities"][0]["activity_type"] == "electricity_grid"
    assert float(data["activities"][0]["quantity"]) == 100000


@patch("app.routers.upload._get_client")
def test_upload_bills_model_fallback(mock_get_client):
    mock_genai_client = MagicMock()
    mock_success_response = MagicMock()
    mock_success_response.text = _MOCK_SUCCESS_JSON

    # First model call raises 503 high demand, second succeeds
    mock_genai_client.models.generate_content.side_effect = [
        Exception("503 UNAVAILABLE. High demand spike"),
        mock_success_response,
    ]
    mock_get_client.return_value = mock_genai_client

    fake_file = io.BytesIO(b"fake image data")
    response = client.post(
        "/upload/bills",
        files={"files": ("bill.png", fake_file, "image/png")},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["activities"]) == 3
    assert mock_genai_client.models.generate_content.call_count == 2


@patch("app.routers.upload._get_client")
def test_upload_bills_error_format_includes_detail_and_message(mock_get_client):
    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.side_effect = Exception("Service completely down")
    mock_get_client.return_value = mock_genai_client

    fake_file = io.BytesIO(b"fake image data")
    response = client.post(
        "/upload/bills",
        files={"files": ("bill.png", fake_file, "image/png")},
    )

    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert "message" in data
    assert "Could not extract any activity data" in data["detail"]
    assert "Could not extract any activity data" in data["message"]
