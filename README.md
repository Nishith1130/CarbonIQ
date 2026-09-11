# CarbonIQ — SME Emission Detector & Circular Recommender

**HackOut'26 · Circular Carbon Ecosystem track**

CarbonIQ is an SME-first platform that turns utility bills and sector context into ranked circular actions with cost, payback, and regulator-ready reports (BRSR Core / CBAM).

---

## Architecture Quick Reference

- **Deterministic Core:** Scope 1, Scope 2, Scope 3 partial baseline calculations and Pareto hotspot ranking are 100% deterministic code.
- **Reference Data:** In-repo git-versioned JSON (`emission_factors.json`, `sector_templates.json`, `intervention_library.json`).
- **AI/ML Reasoning Layer:** RAG via `pgvector` and constrained LLM re-ranking & explanation only.
- **Stack:** Next.js 14+ (App Router) + FastAPI (Python 3.11+) + PostgreSQL 16 (`pgvector`).

---

## Getting Started in 3 Steps

### 1. Start the Database (Postgres + pgvector)

```bash
docker compose up -d
```

Verify the database container is healthy:
```bash
docker compose ps
```

### 2. Start the Backend API (FastAPI)

```bash
cd api
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Start the Frontend App (Next.js)

```bash
cd web
npm install
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default Postgres port is mapped to `5434` to prevent local port collisions.
