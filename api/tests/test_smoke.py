import psycopg
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)
settings = get_settings()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_openapi():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "paths" in response.json()


def test_postgres_container_connectivity():
    # Verify DB connectivity on configured DATABASE_URL (host port 5434)
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        assert result == (1,)
