# Technical Architecture — SME Emission Detector & Circular Recommender

**HackOut'26 · Circular Carbon Ecosystem track**

Product: an SME-first web platform that turns utility bills + sector context into ranked circular actions with cost, payback, and regulator-ready reports.

Locked MVP scope (6 features):

1. Sector-aware baseline calculator (Scope 1 / 2 / partial 3)
2. Pre-built sector process templates (textile dyeing, foundry, food processing)
3. Hotspot detection (top-3 unit-processes)
4. Circular intervention recommender (RAG + GenAI)
5. Marginal abatement cost curve (₹/tCO2e + payback)
6. One-click report export (BRSR Core / CBAM / buyer questionnaire)

This document is the design contract. Implement against it; do not deviate without recording the reason.

---

## Table of contents

1. [High-level architecture](#1-high-level-architecture)
2. [Component architecture](#2-component-architecture)
3. [Data flow (happy path)](#3-data-flow-happy-path)
4. [Frontend architecture](#4-frontend-architecture)
5. [Backend architecture](#5-backend-architecture)
6. [Database architecture](#6-database-architecture)
7. [AI/ML architecture](#7-aiml-architecture)
8. [External services](#8-external-services)
9. [Authentication](#9-authentication)
10. [Deployment architecture](#10-deployment-architecture)
11. [Communication diagram](#11-communication-diagram)
12. [Dependencies and failure points](#12-dependencies-and-failure-points)
13. [Key architectural decisions](#13-key-architectural-decisions)

---

## 1. High-level architecture

Three tiers. Stateless middle. Deterministic core. LLM only for reasoning.

```
┌──────────────────────────────────────────────────────────────────┐
│                      PRESENTATION TIER                            │
│  Next.js (React) app  ·  Vercel-hosted  ·  HTTPS only             │
└────────────────────────┬─────────────────────────────────────────┘
                         │  REST/JSON  (Bearer JWT)
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API / SERVICE TIER                         │
│  FastAPI monolith  ·  Stateless  ·  Railway/Render-hosted         │
│                                                                    │
│  Auth │ Baseline │ Hotspot │ Recommender │ MACC │ Report │        │
│  svc  │  engine  │ ranker  │  (RAG+LLM)  │ calc │  gen   │        │
└──────────┬──────────────────┬────────────────┬──────────┬─────────┘
           │                  │                │          │
           ▼                  ▼                ▼          ▼
┌──────────────────┐  ┌─────────────────┐ ┌──────────┐ ┌──────────┐
│   Postgres       │  │ Versioned JSON   │ │ Vector DB│ │ LLM API  │
│  (user data,     │  │ (in-repo, git):  │ │ (pgvector│ │(Claude/  │
│   runs, reports) │  │  factors,        │ │  in same │ │ Gemini/  │
│                  │  │  templates,      │ │  Postgres│ │ GPT)     │
│                  │  │  interventions,  │ │          │ │          │
│                  │  │  report tmpls    │ │          │ │          │
└──────────────────┘  └─────────────────┘ └──────────┘ └──────────┘
     DATA TIER          REFERENCE DATA       RAG INDEX   EXTERNAL AI
```

**Why this shape:**

- **Monolith, not microservices.** 3-day build, 4-person team. Microservices add ops cost with zero MVP value.
- **Stateless API tier.** Every request carries its own context. Scales trivially, easy to test.
- **Versioned reference data in-repo.** Emission factors, sector templates, and intervention library live as JSON in git — this guarantees any past calculation can be reproduced by checking out that commit. Auditors care about this.
- **Deterministic calc isolated from LLM.** The primary emission number never touches an LLM. LLM only reasons over retrieved interventions. Prevents hallucination.

---

## 2. Component architecture

### Frontend components

| Component | Responsibility | Depends on |
|---|---|---|
| Onboarding Wizard | Collect org name, sector, turnover, export markets | none |
| Bill Entry Form | Structured entry of electricity kWh, fuels, materials, transport | Sector Template Service |
| Dashboard | Show baseline (Scope 1/2/3), hotspot pie, top-3 hotspot cards | Baseline API |
| Hotspot Detail View | Drill-down: which unit-process, which activity | Baseline API |
| Intervention Cards | Ranked intervention list with rationale, cost, payback | Recommender API |
| MACC Chart | Bar chart of ₹/tCO2e per intervention, sorted | MACC API |
| Report Preview + Download | Preview PDF/Excel in-app; download button | Report API |
| API Client | Central HTTP client with retry/timeout logic | Backend |

### Backend services (all under one FastAPI app)

| Service | Responsibility | Reads | Writes |
|---|---|---|---|
| Auth Service | Register, login, JWT issuance | `users` | `users` |
| Emission Factor (EF) Service | Load, cache, serve versioned factors | `emission_factors.json` | none |
| Sector Template Service | Load and serve process maps per sector | `sector_templates.json` | none |
| Baseline Engine | Compute Scope 1/2/3 breakdown per unit-process | Activity data + EF + Template | `baseline_results` |
| Hotspot Ranker | Pareto-sort unit-processes by contribution | `baseline_results` | `hotspots` |
| Intervention Library Loader | Load curated intervention DB, build vector index | `intervention_library.json` | pgvector index |
| Recommender Service | Retrieve relevant interventions per hotspot; LLM re-rank + explain | Vector store + LLM API | `recommendations` |
| MACC Calculator | Compute ₹/tCO2e and payback per intervention | `recommendations` + cost data | `macc_results` |
| Report Generator | Render BRSR/CBAM/buyer templates to PDF/Excel | All run outputs | `reports` |

### Reference data

| File | Purpose |
|---|---|
| `emission_factors.json` | India-specific EFs from CEA v20.0, IPCC AR6, India GHG, DEFRA |
| `sector_templates.json` | 3 sectors × unit-process maps (from BEE cluster audits) |
| `intervention_library.json` | ~50 curated interventions with cost ranges + citations |
| `report_templates/` | HTML/Jinja2 templates for BRSR Core, CBAM data sheet, buyer questionnaire |

**Design decision:** Reference data is NOT in Postgres. It lives as git-versioned JSON files bundled into the backend at build time. Reasons:

- Reproducibility — same commit hash = same numbers.
- Speed — no DB round-trip for factor lookups.
- Audit — the git log is the change history.

---

## 3. Data flow (happy path)

Sequence from user login to report download. Memorize this.

```
1. USER OPENS APP
   Browser → Vercel-hosted Next.js
   (no backend call)

2. LOGIN / REGISTER
   Frontend → POST /auth/login → Backend → Postgres users
   Backend returns JWT
   Frontend stores JWT in memory

3. ONBOARDING
   Frontend → POST /orgs → Backend → Postgres organizations
   Backend returns org_id

4. SECTOR SELECTION
   Frontend → GET /sectors → Backend serves list from Sector Template Service
   User picks "Textile Dyeing"

5. BILL ENTRY
   Frontend → GET /sectors/textile_dyeing/schema
     Returns "give us: monthly kWh, monthly coal in kg, ..."
   User enters values
   Frontend → POST /runs {org_id, sector, activity_data}
     Backend creates run row, returns run_id

6. BASELINE CALCULATION (server-side, synchronous)
   Baseline Engine reads:
     - activity_data from request
     - sector_template (textile_dyeing)
     - emission_factors.json (CEA grid, coal, etc.)
   Computes per unit-process breakdown
   Writes baseline_results row
   Returns baseline JSON to frontend

7. HOTSPOT DETECTION (part of same request)
   Hotspot Ranker sorts unit-processes by tCO2e contribution
   Returns top 3
   Writes hotspots rows

8. FRONTEND RENDERS DASHBOARD
   Receives baseline + hotspots in one payload
   Renders pie chart + hotspot cards

9. RECOMMENDATION REQUEST (async, ~2-3s)
   User clicks "Get recommendations for dyeing bath heating"
   Frontend → POST /runs/{run_id}/recommend {hotspot_id}
   Recommender Service:
     a. Embed hotspot context (sector + process + magnitude)
     b. Vector search over intervention_library → top-10 candidates
     c. Send candidates + hotspot + rules to LLM as RAG prompt
     d. LLM returns ranked JSON: [{intervention_id, rationale, ...}]
     e. Backend validates JSON schema; retry once if invalid
     f. Writes recommendations rows
   Returns recommendations JSON

10. MACC CALCULATION
    Frontend → POST /runs/{run_id}/macc
    MACC Calculator computes ₹/tCO2e + payback for each recommendation
      using curated cost ranges (min-mid-max) from intervention library
    Writes macc_results
    Returns MACC data for chart

11. REPORT GENERATION
    User clicks "Generate BRSR Core Report"
    Frontend → POST /runs/{run_id}/report {template: "brsr_core"}
    Report Generator:
      a. Load run data (baseline, hotspots, recommendations)
      b. Render Jinja2 HTML template
      c. WeasyPrint → PDF
      d. Store PDF blob in reports table
    Returns download URL

12. USER DOWNLOADS REPORT
    Frontend → GET /reports/{report_id}
    Backend streams PDF
```

**Time budget:** baseline + hotspot < 200 ms · recommender ≈ 2-3 s (LLM) · report < 500 ms. End-to-end under 5 s for the demo.

---

## 4. Frontend architecture

### Directory structure

```
web/
├── app/                          Next.js 14 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── onboarding/page.tsx   Sector selection wizard
│   │   ├── entry/page.tsx        Activity data entry form
│   │   ├── dashboard/[runId]/
│   │   │   ├── page.tsx          Baseline + hotspots
│   │   │   ├── hotspot/[id]/     Detail drill-down
│   │   │   └── report/           Report preview + download
│   │   └── layout.tsx            Auth guard + shell
│   └── layout.tsx                Root
├── components/
│   ├── charts/
│   │   ├── ScopeBreakdownPie.tsx
│   │   ├── HotspotBar.tsx
│   │   └── MACCChart.tsx
│   ├── forms/
│   ├── cards/InterventionCard.tsx
│   └── ui/                       Tailwind primitives
├── lib/
│   ├── api-client.ts             Central fetch wrapper
│   ├── auth.ts                   JWT storage + refresh
│   └── types.ts                  Shared types with backend
└── state/
    └── run-context.tsx           Current run state (React Context)
```

### State management

- **React Context** for current run (small state, single tenant).
- No Redux, no Zustand, no server-state library. Overkill for 6 screens.
- Server state fetched per-page via `fetch` in server components where possible; `useEffect` in client components where interactivity matters.

### API client

Central `api-client.ts` responsible for:

- Attaching JWT Bearer header
- Timeout enforcement (10 s default, 30 s for recommender)
- Retry once on 5xx
- Surfacing errors as typed exceptions

### Design decisions

- Server components where possible for onboarding + dashboard (faster first paint).
- Client components for MACC chart interactivity, form entry, report preview.
- No SSR data fetching for user-specific data — avoids session token complexity during the hackathon build.

---

## 5. Backend architecture

FastAPI monolith with clear layering.

```
api/
├── app/
│   ├── main.py                   FastAPI app, CORS, error handlers
│   ├── config.py                 Env vars, settings
│   ├── deps.py                   Dependency injection (DB session, auth)
│   ├── routers/
│   │   ├── auth.py               /auth/*
│   │   ├── orgs.py               /orgs/*
│   │   ├── sectors.py            /sectors/*
│   │   ├── runs.py               /runs/*
│   │   ├── recommendations.py    /runs/{id}/recommend
│   │   ├── macc.py               /runs/{id}/macc
│   │   └── reports.py            /runs/{id}/report
│   ├── services/
│   │   ├── baseline.py           Deterministic emission math
│   │   ├── hotspot.py            Pareto ranker
│   │   ├── recommender.py        RAG + LLM orchestration
│   │   ├── macc.py               ₹/tCO2e + payback calc
│   │   ├── report_gen.py         Template → PDF/Excel
│   │   └── ef_loader.py          Loads emission_factors.json
│   ├── data/                     JSON reference data
│   │   ├── emission_factors.json
│   │   ├── sector_templates.json
│   │   ├── intervention_library.json
│   │   └── report_templates/
│   ├── models/                   Pydantic + SQLAlchemy models
│   ├── db/
│   │   ├── session.py            Postgres connection pool
│   │   └── migrations/           Alembic
│   └── llm/
│       ├── client.py             Wrapper around LLM API
│       ├── prompts.py            Prompt templates
│       └── schemas.py            Response validation schemas
└── tests/
```

### Design decisions

- One FastAPI app, not multiple services.
- Services are stateless functions, not classes. Easier to test and reason about.
- Dependency injection for DB session and auth via `Depends()`.
- Pydantic v2 for request/response validation — auto-generates OpenAPI docs (helps frontend and helps judges see the API contract).
- Alembic for DB migrations, even if only one migration total.
- No background job queue in Phase 1. Everything synchronous.

### API endpoints (contract)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create user |
| POST | `/auth/login` | Get JWT |
| POST | `/orgs` | Create org (SME) |
| GET | `/sectors` | List available sectors |
| GET | `/sectors/{id}/schema` | Get activity-data input schema |
| POST | `/runs` | Create a new calculation run |
| GET | `/runs/{id}` | Get baseline + hotspots for run |
| POST | `/runs/{id}/recommend` | Get intervention recommendations |
| POST | `/runs/{id}/macc` | Get MACC data |
| POST | `/runs/{id}/report` | Generate report (BRSR/CBAM/buyer) |
| GET | `/reports/{id}` | Download report file |

---

## 6. Database architecture

Postgres schema. Small, focused, auditable.

### Tables

```
users
├── id (uuid, PK)
├── email (unique)
├── password_hash
├── created_at

organizations                    (SMEs)
├── id (uuid, PK)
├── owner_user_id (FK → users)
├── name
├── sector_id (string, refs sector template)
├── turnover_inr
├── export_markets (jsonb)       ['EU', 'US']
├── created_at

runs                             (one calculation instance)
├── id (uuid, PK)
├── org_id (FK → organizations)
├── period_start, period_end     (which month(s) the bills cover)
├── ef_version (string)          e.g. "cea_v20.0_ipcc_ar6" — REPRODUCIBILITY
├── created_at

activity_data
├── run_id (FK → runs)
├── activity_type (enum)         'electricity', 'coal', 'diesel', 'transport'...
├── quantity (numeric)
├── unit (string)                'kWh', 'kg', 'L', 'km'
├── unit_process (string)        'dyeing_bath', 'stenter', 'etp' etc.
├── month (int)

baseline_results
├── run_id (FK → runs)
├── unit_process (string)
├── scope (1|2|3_partial)
├── tCO2e (numeric)
├── activity_data_id (FK)        traceable back to source
├── emission_factor_ref (string) which factor was used

hotspots
├── run_id (FK → runs)
├── rank (1|2|3)
├── unit_process (string)
├── tCO2e (numeric)
├── share_pct (numeric)

recommendations
├── id (uuid, PK)
├── run_id (FK → runs)
├── hotspot_id (FK → hotspots)
├── intervention_id (string)     refs intervention_library.json
├── rank (int)
├── rationale (text)             LLM-generated
├── source_citation (string)     from intervention library

macc_results
├── recommendation_id (FK)
├── cost_capex_inr (numeric)
├── annual_saving_inr (numeric)
├── tCO2e_reduced_annual (numeric)
├── cost_per_tco2e (numeric)     computed
├── payback_years (numeric)      computed

reports
├── id (uuid, PK)
├── run_id (FK → runs)
├── template_type (enum)         'brsr_core' | 'cbam' | 'buyer'
├── file (bytea)                 the PDF/XLSX blob
├── generated_at
```

### Design decisions

- **UUIDs everywhere.** No integer IDs. Avoids collision risk; safer for multi-tenant reasoning.
- **Audit trail via foreign keys.** Every `baseline_result` links back to its `activity_data` and its `emission_factor_ref`. An auditor can reconstruct any number.
- **`ef_version` frozen per run.** Even if `emission_factors.json` updates later, past runs still show what they were computed with.
- **Reports stored as blobs in Postgres.** Avoids S3 setup for the hackathon. Move to S3 in Phase 2.
- **Row-level tenant isolation via `org_id`.** Every query filters by `org_id` derived from JWT.
- **Indexes:** `(org_id)` on runs, `(run_id)` on all child tables.

---

## 7. AI/ML architecture

Two clear layers. LLM never touches numbers.

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER A — DETERMINISTIC CORE (no ML at all)                  │
│                                                                │
│   • Baseline:   activity × EF = tCO2e                         │
│   • Hotspot:    sort unit-processes by contribution           │
│   • MACC:       (CapEx - subsidy) / annual_saving = payback   │
│                                                                │
│   Guarantee: every number cites its factor + source.          │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER B — REASONING (RAG + LLM, tightly bounded)             │
│                                                                │
│   Input:  hotspot context + retrieved interventions           │
│   Task:   rank + explain + tag with expected saving range     │
│   Output: JSON matching a strict schema, cited                │
│                                                                │
│   LLM cannot invent interventions. It only picks from the     │
│   retrieved set and explains why in plain language.           │
└──────────────────────────────────────────────────────────────┘
```

### RAG pipeline

**1. Ingestion (build-time, one-off)**

- Load `intervention_library.json` (~50 entries: id, applicable_sectors, applicable_processes, description, cost_range, energy_saving_range, source_citation).
- For each entry, generate an embedding via the LLM provider's embeddings endpoint.
- Store `(intervention_id, vector, metadata)` in pgvector (Postgres extension).

**2. Retrieval (per request)**

- Compose a query text from the hotspot, e.g. *"Textile dyeing — jet dyeing bath heating with coal boiler, 45% of thermal energy, monthly emissions 12 tCO2e"*.
- Embed the query with the same model used at ingestion.
- Search top-10 by cosine similarity, filter by `sector` and `applicable_process` metadata.

**3. Reasoning (LLM call)**

Prompt template:

```
You are a decarbonization advisor for Indian SMEs.
Hotspot: {hotspot_context}
Candidate interventions: {retrieved_json}

Return JSON matching this schema: {schema}

Rules:
- You MAY ONLY pick interventions from the candidate list.
- You MUST cite the source_id for each choice.
- You MUST NOT invent new interventions.
- Rank by expected net benefit for a 40-worker SME.
```

Response constrained to a JSON schema (structured output where supported, otherwise instructed and validated).

**4. Validation**

- Parse JSON. If schema fails, retry once with error feedback.
- Verify every `intervention_id` in the LLM response exists in the candidate list. Drop mismatches.
- Verify every `source_citation` matches the library entry. Replace with library's citation if not.

### Guardrails

| Risk | Guardrail |
|---|---|
| LLM invents intervention | Whitelist against retrieved candidates; reject on mismatch |
| LLM hallucinates numbers | LLM never computes tCO2e or ₹ — those come from the deterministic layer |
| LLM omits citation | Backend re-attaches from library, doesn't trust LLM output |
| LLM output not JSON | JSON schema validation + one retry |
| LLM slow / down | Fallback: return top-3 candidates by vector similarity, no rationale |

### Model choice

- **Primary:** Claude Sonnet or Gemini 1.5 Flash (fast, cheap, good reasoning).
- **Embeddings:** OpenAI `text-embedding-3-small` or Voyage AI (both work with pgvector).
- Explicitly not training or fine-tuning a model. No time, no need.

---

## 8. External services

| Service | Purpose | Failure mode | Fallback |
|---|---|---|---|
| LLM API (Claude / Gemini / GPT) | Recommender reasoning | Timeout / 5xx / rate limit | Return raw vector-search top-3, mark rationale as "unavailable"; keep two provider keys ready |
| Embeddings API | RAG indexing + query embedding | Timeout | Cache all intervention embeddings at build time; query embeddings retry once |
| Vector store (pgvector inside Postgres) | Intervention retrieval | Same failure surface as Postgres | Reload index from JSON on boot |
| PDF renderer (WeasyPrint) | Report generation | Native binary crash / font issue | Excel-only fallback via openpyxl |
| Email (SendGrid / Resend) | Phase 2 only | — | — (skip in MVP) |
| Error tracking (Sentry) | Observability | — | Optional; stdout logs otherwise |

**Design decision:** use pgvector inside the same Postgres instance. Avoids adding a second data service for ~50 vectors. Move to a dedicated vector DB in Phase 2 if the library grows past ~1000 entries.

---

## 9. Authentication

### Phase 1 (hackathon MVP)

- Email + password, hashed via bcrypt or argon2.
- JWT with short expiry (24 h), signed with HS256, secret in env var.
- No refresh tokens — user re-logs in when expired. Simpler.
- JWT stored in frontend memory only (not localStorage). Page reload = re-login. Accept for demo.
- Tenant isolation: every DB query filters by `org_id` derived from the JWT `sub` claim → their org membership. No cross-tenant access possible.
- No RBAC. One user, one org.

### Phase 2 (post-hackathon)

- Refresh tokens.
- HttpOnly cookies.
- Role-based access (owner, viewer, buyer-side).
- Google OAuth / WhatsApp login for vernacular users.

### Privacy notes

- Data at rest: Postgres with TLS in transit; managed provider handles disk encryption.
- No PII in logs.
- SME activity data stays in tenant's rows; no cross-tenant training on user data. Intervention library is public.

---

## 10. Deployment architecture

Two hosts. Simplest possible.

```
┌────────────────────────────────────────────────────────────────┐
│  DEVELOPER LAPTOPS                                              │
│    git push → GitHub (main branch)                              │
└──────────────────────────┬─────────────────────────────────────┘
                           │
      ┌────────────────────┴──────────────────────┐
      ▼                                            ▼
┌──────────────────────┐              ┌───────────────────────────┐
│  GitHub Actions CI    │              │  Vercel (frontend)         │
│    - lint, typecheck  │              │    - autodeploy on push    │
│    - run unit tests   │              │    - preview per PR        │
│    - build check      │              │    https://<team>.vercel   │
└──────────────────────┘              └──────────────┬────────────┘
                                                      │
                                                      ▼
                                         ┌──────────────────────────┐
                                         │  Railway / Render         │
                                         │    - FastAPI backend      │
                                         │    - Postgres (managed)   │
                                         │    - autodeploy on push   │
                                         │    https://<api>.railway  │
                                         └──────────────────────────┘
```

### Environments

- **Development** — localhost, Docker Compose optional (Postgres via Docker).
- **Staging** — Vercel preview builds per PR.
- **Demo / Production** — single Vercel prod + single Railway prod.

### Secrets

Environment variables only:

- `DATABASE_URL`
- `JWT_SECRET`
- `LLM_API_KEY`
- `EMBEDDING_API_KEY`
- `SENTRY_DSN` (optional)

Stored in Vercel + Railway dashboards. `.env` in repo is `.gitignore`d.

### Observability

- **Logs:** stdout → Railway / Vercel log viewer.
- **Errors:** Sentry (free tier) if time permits.
- **Metrics:** none in Phase 1.

---

## 11. Communication diagram

Every hop.

```
[Browser: Next.js SPA]
      │
      │  HTTPS + Bearer JWT
      ▼
[Vercel Edge Cache]  (static assets + SSR)
      │
      │  HTTPS + Bearer JWT
      ▼
[FastAPI @ Railway]
      │
      ├── SQL over TCP (pooled) ──▶ [Postgres @ Railway]  (users, runs, results, blobs)
      │
      ├── SQL (pgvector extension) ─▶ [Postgres]  (RAG similarity search)
      │
      ├── HTTPS ─▶ [LLM API]  (Claude / Gemini)  (recommender reasoning)
      │
      ├── HTTPS ─▶ [Embeddings API]  (query embedding at request time)
      │
      └── In-process ─▶ [WeasyPrint]  (PDF generation)
```

Every hop uses HTTPS or in-process. No message queues, no service mesh, no gRPC.

---

## 12. Dependencies and failure points

Ordered by hackathon-day risk.

### 🔴 High-risk (would break the demo)

| # | Failure point | Impact | Mitigation |
|---|---|---|---|
| 1 | LLM API down / rate-limited | Recommender fails | Fallback to top-3 by pure vector similarity, mark "rationale unavailable"; keep 2 LLM providers keyed (Claude + Gemini) |
| 2 | WeasyPrint native deps missing on Railway | Reports fail | Docker image with `libpango`, `libcairo`; test in staging first; Excel-only fallback via openpyxl |
| 3 | Sector template ratios wrong | Hotspot detection produces nonsense | Cite BEE source for every ratio; use ranges not single points; disclose in UI |
| 4 | LLM returns invalid JSON | Recommender crashes | Schema validation + one retry with error feedback; final fallback = drop rationale, keep interventions |

### 🟡 Medium-risk

| # | Failure point | Impact | Mitigation |
|---|---|---|---|
| 5 | Postgres down | Entire app down | Managed Postgres on Railway ~99.9% uptime; accept single point for hackathon |
| 6 | Vercel deploy fails on demo day | Frontend broken | Test main branch every commit; keep local `npm run dev` ready as fallback |
| 7 | pgvector extension not enabled | RAG breaks | Enable in initial migration; verify in staging |
| 8 | Embedding model differs between ingestion and query | Vector dim mismatch | Pin embedding model version in config; regenerate index if changed |

### 🟢 Low-risk

| # | Failure point | Impact | Mitigation |
|---|---|---|---|
| 9 | JWT expired mid-demo | User re-logs in | 24 h expiry, longer than demo window |
| 10 | Emission factor JSON malformed | App startup fails | JSON schema validation at boot; CI enforces schema |
| 11 | Frontend chart lib broken | Ugly demo | Recharts is stable; plain HTML table as fallback |

### Not-hackathon-relevant risks (Phase 2 only)

- Multi-region availability
- Backup / disaster recovery
- Compliance (DPDP Act) — mentioned in report, not implemented in MVP
- Rate limiting per tenant
- Audit logging for report generation

---

## 13. Key architectural decisions

Justifications you must be able to defend in judge Q&A.

| Decision | Why |
|---|---|
| Monolith, not microservices | 3-day build, 4-person team, no ops budget |
| Stateless API | Simple to reason, easy to scale, no session complexity |
| Reference data as versioned JSON in repo | Reproducibility (auditor-verifiable) and demo speed |
| Deterministic engine for numbers, LLM only for reasoning | GHG accounting requires auditability; ML predictions cannot be audited |
| RAG with LLM as re-ranker, never as generator | Prevents hallucination in the recommender |
| Postgres for both relational data AND vector search (pgvector) | One data service, not two — hackathon efficiency |
| PDF via WeasyPrint (HTML → PDF) | Team can maintain report templates as HTML/CSS; no LaTeX learning curve |
| Vercel + Railway | Free tier + minute-long deploys, no cloud procurement |
| No message queues, no background jobs in Phase 1 | Everything synchronous; frontend shows loaders |
| No microservices, no Kubernetes, no service mesh | Any of these would eat 30% of the build time for zero MVP value |

---

## Build order recommendation

For an implementation agent, tackle in this order to unblock parallel work early:

1. Repo scaffold (Next.js + FastAPI + Docker Compose for Postgres)
2. `emission_factors.json` and `sector_templates.json` for **textile dyeing** only (unblocks baseline engine)
3. Baseline engine + `POST /runs` endpoint (backend milestone 1)
4. Frontend onboarding + entry form + dashboard skeleton (frontend milestone 1)
5. Hotspot ranker (small, layer on top of baseline)
6. `intervention_library.json` (~15 entries × 3 sectors) + pgvector setup
7. Recommender service (LLM + RAG)
8. MACC calculator
9. Report generator with 1 template (BRSR Core supplier questionnaire)
10. Foundry + food processing sector templates (parallel work — Nishith / Bansil)
11. End-to-end integration test with a sample SME persona
12. Demo polish

**Do not** start on OCR, vernacular voice, ADEETIE matching, or vendor discovery. Those are Phase 2 and must not enter the MVP.
