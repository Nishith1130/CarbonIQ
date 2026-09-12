# Implementation Roadmap v2 — SME Emission Detector

**HackOut'26 · Circular Carbon Ecosystem**
**Version 2** — incorporates the flaw-review fixes: reference-data critical path, Phase 5 split, diversion traps, silent killers, time-tight cut list.

This is the build plan. Read end-to-end before starting. Follow `ARCHITECTURE.md` for the design contract. Do not deviate without recording a reason in this file.

## Development philosophy

Every phase follows:

> **DESIGN → BUILD → TEST → VERIFY → FIX → LOCK → NEXT PHASE**

A phase is not complete until its **Completion criteria** all pass and **Verify before proceeding** is signed off. Do not start the next phase early. Do not backtrack into a locked phase without a written reason.

## Changes vs v1

1. **New Phase 0 — Reference Data Sprint** with hard deadlines. Reference data is now the critical path, not "ongoing background work."
2. **Phase 5 split** into 5a (Baseline + Hotspot + Sector) and 5b (MACC + Report Gen). Reason: 5a unblocks the frontend earlier.
3. **Phase 7 renamed** from "AI/ML Core Intelligence" to "AI Core Intelligence (LLM Recommender)" to match the ideation submission's "no ML" claim.
4. **Every phase now has a "Diversion traps"** section. Ignoring this list is how the plan fails.
5. **Coverage targets reduced** to hackathon-realistic. Testing quality > coverage percentage.
6. **Continuous integration mandated** — frontend points at real backend from the moment Phase 5a is done, not Phase 12.
7. **Pitch script started on Day 1 evening** by Nishith + Bansil (they know the story from the ideation report).
8. **Silent Killers checklist** added — the 10 bugs that most often kill hackathon demos.
9. **Cut list priority order** added — what to sacrifice in what order when the clock hits red.

## Parallelism map

| # | Phase | Owner | Can run parallel with |
|---|---|---|---|
| 0 | Reference data sprint | Nishith + Bansil | P1 |
| 1 | Project setup | Whole team | P0 |
| 2 | Database schema | Pranshu | P0 continues |
| 3 | Database testing | Pranshu / Hari | P0 continues |
| 4 | Backend foundation (auth) | Pranshu | Frontend design mocks (Hari) |
| 5a | Backend APIs — baseline + hotspot + sector | Pranshu | Frontend foundation P9 (Hari) |
| 5b | Backend APIs — MACC + report gen | Pranshu | Frontend features P10 (Hari) starts here |
| 6 | API testing | Pranshu | Frontend continues |
| 7 | AI — LLM Recommender | Pranshu | Frontend continues |
| 8 | AI testing | Pranshu | Frontend continues |
| 9 | Frontend foundation | Hari | Backend 5a onward |
| 10 | Frontend features | Hari | AI 7-8 |
| 11 | Frontend testing (or skip if time-tight) | Hari + Nishith | — |
| 12 | Frontend-backend integration | Pranshu + Hari | — |
| 13 | External integrations (optional if primary stable) | Pranshu | — |
| 14 | Security / error handling (minimal) | Whole team | — |
| 15 | Deployment | Pranshu | Nishith/Bansil finalise pitch |
| 16 | Deployed-system testing | Whole team | — |
| 17 | End-to-end scenarios | Whole team | — |
| 18 | Demo preparation | Nishith / Bansil lead | — |

## Time budget reality check

- Total available: ~60-70 person-hours across 3 days × 4 people, after sleep + food + breaks.
- Roadmap totals ~85 person-hours if executed perfectly.
- **Buffer: negative.** Cut ~15% by following the "SKIP if time-tight" markers on individual phases.

---

## Phase 0 — Reference Data Sprint

### 1. Objective
Curate the JSON reference data (emission factors, sector templates, intervention library, report templates) that the backend needs before it can compute anything useful.

### 2. Why this phase comes now
This was mislabelled as "background work" in v1. Reality: if reference data isn't ready, Phase 5 blocks. It IS the critical path. Nishith + Bansil own this from hour one.

### 3. Dependencies
- Access to BEE cluster audit reports (freely downloadable from beeindia.gov.in / udit.beeindia.gov.in).
- ARCHITECTURE.md §7 reference data format understood.

### 4. Files/components to create
```
/api/app/data/emission_factors.json
/api/app/data/sector_templates/
    textile_dyeing.json          ← hard deadline: end of Day 1
    foundry.json                 ← end of Day 2 morning
    food_processing.json         ← end of Day 2 afternoon
/api/app/data/intervention_library.json    (~15 × 3 sectors = ~45 entries)
/api/app/data/report_templates/
    brsr_core.html               ← this is the primary; ship first
```

### 5. Implementation tasks
1. Download BEE textile-dyeing cluster audit report (Tirupur / Surat). Extract unit-process energy split table.
2. Convert to JSON schema per ARCHITECTURE.md §7.
3. Cite each ratio with `source: "BEE Cluster Audit, {report title}, p.{n}"`.
4. Curate emission factors: CEA grid EF (0.7117), coal (India NCV + IPCC factor), diesel, LPG, transport.
5. Curate ~15 interventions per sector, each with: id, applicable_processes, description, cost_range_lakh (min-mid-max), energy_saving_pct (min-max), source_citation.
6. Build BRSR Core supplier questionnaire template as HTML/Jinja2 first — it's the demo primary.
7. Foundry + food processing templates second and third.

### 6. Testing strategy
Hand the JSON to Pranshu for schema validation. If it parses cleanly and every ratio has a `source`, it's good.

### 7. Expected result
Backend has legitimate, cited India-specific data to compute against.

### 8. Completion criteria
- [ ] `textile_dyeing.json` committed by **end of Day 1** (hard deadline).
- [ ] `foundry.json` + `food_processing.json` committed by **end of Day 2 morning**.
- [ ] `intervention_library.json` has ≥ 45 entries with citations by **end of Day 2 morning**.
- [ ] `brsr_core.html` template ready by **end of Day 2 morning**.
- [ ] Every emission factor has `source`, `version`, `region`.
- [ ] Every intervention has a non-empty `source_citation`.

### 9. Common failure cases
- BEE audit reports use inconsistent process names. Fix: pick one canonical name per process, document mapping.
- Cost ranges vary wildly across sources. Fix: use ranges (min-max), not point estimates. Disclose in UI.
- Nishith / Bansil have no reference for "what an intervention entry looks like." Fix: Pranshu writes 3 example entries first as templates.

### 10. Diversion traps — DO NOT
- Try to cover all 14 BEE sectors. THREE sectors is the locked scope.
- Curate 50 interventions per sector. 15 is enough for demo.
- Design a schema for future extensibility. Match ARCHITECTURE.md and move on.
- Format emission factors in ppm / µg — stick to tCO2e per unit.

### 11. Verify before proceeding
Pranshu opens the JSON files, imports them into a Python REPL, prints a sample calculation using them. If any factor lookup fails, block until fixed.

---

## Phase 1 — Project Setup

### 1. Objective
Working monorepo skeleton — Next.js frontend, FastAPI backend, Postgres container all boot on any teammate's laptop in under 15 minutes.

### 2. Why this phase comes now
Nothing else can start until the repo exists.

### 3. Dependencies
- GitHub repo created.
- Node.js 20+, Python 3.11+, Docker Desktop installed on every laptop.

### 4. Files/components to create
```
/README.md
/docker-compose.yml
/.env.example
/.gitignore
/web/                            Next.js scaffold
/api/                            FastAPI scaffold
/.github/workflows/ci.yml        Optional
```

### 5. Implementation tasks
1. Create GitHub repo. Protect `main`.
2. Scaffold `/web` with `create-next-app --typescript --tailwind --app`.
3. Scaffold `/api` with pyproject, virtualenv, minimal FastAPI hello-world.
4. `docker-compose.yml` with `pgvector/pgvector:pg16` image.
5. `README.md` with three commands to run the app.
6. `.env.example` listing every env var.

### 6. Testing strategy
Each teammate clones and runs on their laptop.

### 7. Expected result
`localhost:3000` and `localhost:8000/docs` up within 15 minutes on any laptop.

### 8. Completion criteria
- [ ] Clone + run works on fresh machine.
- [ ] All three URLs (frontend, backend docs, Postgres) reachable.
- [ ] `.env.example` exists; `.env` is gitignored.

### 9. Common failure cases
- Port conflict on 3000, 8000, 5432.
- WSL2 Docker networking on Windows.
- Native build failure for Python crypto libs.

### 10. Diversion traps — DO NOT
- Set up CI beyond `typecheck` + `lint`. No PR workflow, no matrix builds.
- Install Prettier / ESLint config debates. Use defaults.
- Add pre-commit hooks. Not for hackathon.
- Fight Docker for more than 30 minutes — switch to a hosted Postgres (Neon, Supabase free tier) and move on.

### 11. Verify before proceeding
Every team member can run locally. If one can't, unblock them before Phase 2.

---

## Phase 2 — Database

### 1. Objective
Postgres schema per `ARCHITECTURE.md §6`, Alembic migration applied, pgvector extension enabled.

### 2. Why this phase comes now
Everything backend depends on schema.

### 3. Dependencies
Phase 1.

### 4. Files/components to create
```
/api/app/db/session.py
/api/app/db/base.py
/api/app/models/*.py                 One per table
/api/alembic.ini
/api/app/db/migrations/env.py
/api/app/db/migrations/versions/0001_initial.py
```

### 5. Implementation tasks
1. Add SQLAlchemy 2.0 + Alembic + `pgvector` Python package.
2. Define models exactly per `ARCHITECTURE.md §6`.
3. Migration 0001: all tables + `CREATE EXTENSION IF NOT EXISTS vector`.
4. Apply against local Postgres.

### 6. Testing strategy
`\dt` in psql. Verify pgvector: `SELECT * FROM pg_extension WHERE extname='vector';`

### 7. Expected result
Schema live.

### 8. Completion criteria
- [ ] Migration applies cleanly.
- [ ] All 10 tables present.
- [ ] `pgvector` enabled.
- [ ] `ef_version` column exists on `runs`.

### 9. Common failure cases
- pgvector image not available on chosen deploy platform → discover late.
- Alembic autogenerate misses `Vector` type — hand-write it.

### 10. Diversion traps — DO NOT
- Add fields "we might need later." Match ARCHITECTURE exactly.
- Design for multi-tenant / multi-region. One tenant per org.
- Add soft-delete columns. Not needed for MVP.

### 11. Verify before proceeding
Drop database, reapply migration cleanly. If not, fix first.

---

## Phase 3 — Database Testing

### 1. Objective
CRUD tests + tenant isolation verified.

### 2. Why this phase comes now
Catch schema mistakes before layering business logic.

### 3. Dependencies
Phase 2.

### 4. Files/components to create
```
/api/tests/conftest.py
/api/tests/test_db_crud.py
/api/tests/test_db_isolation.py
```

### 5. Implementation tasks
1. Pytest fixture for test DB with rollback per test.
2. CRUD test per model.
3. Tenant isolation — user A cannot access user B's data.
4. Cascade-delete verified.

### 6. Testing strategy
`pytest -v`.

### 7. Expected result
Green suite.

### 8. Completion criteria
- [ ] All CRUD paths pass.
- [ ] Tenant isolation passes.
- [ ] Cascade-delete passes.
- [ ] Suite runs in < 30 seconds.

### 9. Common failure cases
- Ordering dependency between tests.
- Connection pool exhaustion.

### 10. Diversion traps — DO NOT
- Aim for 90% coverage. Cover the models, move on.
- Add benchmarks / performance tests.
- Add property-based testing (Hypothesis).

### 11. Verify before proceeding
Run three times, same results.

---

## Phase 4 — Backend Foundation

### 1. Objective
Auth (register/login/JWT), settings, DB session DI, error handling scaffold.

### 2. Why this phase comes now
Every endpoint needs auth + DB session.

### 3. Dependencies
Phase 2, 3.

### 4. Files/components to create
```
/api/app/config.py
/api/app/deps.py
/api/app/security.py
/api/app/routers/auth.py
/api/app/services/auth.py
/api/app/schemas/auth.py
/api/app/main.py
```

### 5. Implementation tasks
1. Settings via `pydantic-settings`.
2. Password hash via `argon2-cffi` or `bcrypt`.
3. JWT HS256 with 24h expiry.
4. `POST /auth/register`, `POST /auth/login`.
5. `Depends(get_current_user)` decoder.
6. CORS allowing `localhost:3000` in dev.
7. Central exception handler → JSON `{code, message}`.

### 6. Testing strategy
Register → login → protected route via curl.

### 7. Expected result
Auth works end-to-end.

### 8. Completion criteria
- [ ] Register returns 201 + JWT.
- [ ] Login returns 200 + JWT on correct password, 401 otherwise.
- [ ] `/whoami` returns user with JWT, 401 without.
- [ ] CORS preflight succeeds from `localhost:3000`.

### 9. Common failure cases
- JWT secret in code (never).
- Slow bcrypt cost hanging tests.
- Timezone-aware vs naive datetime in `exp`.

### 10. Diversion traps — DO NOT
- Add refresh tokens. Not for MVP.
- Add Google / WhatsApp OAuth. Phase 2.
- Add password reset flow. Phase 2.
- Add email verification. Phase 2.
- Add RBAC / roles. Not for MVP.

### 11. Verify before proceeding
End-to-end curl flow works. Run 3 times.

---

## Phase 5a — Backend APIs (Baseline + Hotspot + Sector)

### 1. Objective
Backend for MVPs 1, 2, 6: baseline calculator, hotspot detection, sector template loading.

### 2. Why this phase comes now
The frontend can start on the dashboard once these three exist. Splitting from 5b unblocks parallel work.

### 3. Dependencies
- Phase 0 (textile_dyeing.json committed).
- Phase 4.

### 4. Files/components to create
```
/api/app/services/ef_loader.py
/api/app/services/sector_loader.py
/api/app/services/baseline.py
/api/app/services/hotspot.py
/api/app/routers/orgs.py
/api/app/routers/sectors.py
/api/app/routers/runs.py
/api/app/schemas/*.py
```

### 5. Implementation tasks
1. Load emission factors + sector templates at app boot; cache in memory.
2. `POST /orgs` — create org.
3. `GET /sectors` — list.
4. `GET /sectors/{id}/schema` — return input schema per sector template.
5. `POST /runs` — accepts activity data, computes baseline + hotspots, returns both in one payload.
6. `GET /runs/{id}` — replay a run.
7. Include `ef_version` in every response.

### 6. Testing strategy
Hand-verified golden test: 100 kWh Indian grid electricity → 71.17 tCO2e (± 0.01).

### 7. Expected result
The dashboard has real data to render.

### 8. Completion criteria
- [ ] `/docs` shows all 5a endpoints.
- [ ] Golden test passes.
- [ ] `POST /runs` returns baseline + top-3 hotspots in a single call.
- [ ] `ef_version` in every response.

### 9. Common failure cases
- JSON malformed → app fails at boot. Fix: schema validate at load.
- Factor lookup key typo → wrong numbers. Fix: enum + integration test.
- Floating-point drift → golden test flaps. Fix: `Decimal` or tolerance.

### 10. Diversion traps — DO NOT
- Cover all 14 BEE sectors. THREE sectors only.
- Perfect scope-3 coverage. Only categories 1, 4, 9 matter for MVP.
- Custom emission-factor management UI. JSON-file-in-repo is the interface.

### 11. Verify before proceeding
Nishith runs a sample request via `/docs`, gets a sane number. Once done, **frontend points at real backend for `/orgs`, `/sectors`, `/runs` immediately** — don't wait for 5b.

---

## Phase 5b — Backend APIs (MACC + Report Generation)

### 1. Objective
Backend for MVPs 4 and 5: marginal abatement cost curve, one-click regulator report export.

### 2. Why this phase comes now
Depends on `recommendations` existing, which come from Phase 7. **You can build 5b in parallel with 7** — 5b's MACC endpoint reads whatever recommendations exist for a run.

### 3. Dependencies
- Phase 5a.
- Phase 0 (`brsr_core.html` template ready).

### 4. Files/components to create
```
/api/app/services/macc.py
/api/app/services/report_gen.py
/api/app/routers/macc.py
/api/app/routers/reports.py
```

### 5. Implementation tasks
1. `POST /runs/{id}/macc` — compute ₹/tCO2e + payback per recommendation using intervention library cost ranges.
2. `POST /runs/{id}/report` — render Jinja2 HTML → WeasyPrint → PDF blob → store in `reports`.
3. `GET /reports/{id}` — stream PDF.
4. **Build one report template only for MVP: BRSR Core supplier questionnaire.**
5. **Test WeasyPrint inside a Docker container locally** that mimics Railway environment (Python 3.11 + `libpango` + `libcairo` + `libgdk-pixbuf`) BEFORE Phase 15.

### 6. Testing strategy
- MACC unit test with known intervention cost + saving.
- WeasyPrint smoke test — render one template, verify PDF byte size > 0.

### 7. Expected result
User can click "generate report" → PDF downloads.

### 8. Completion criteria
- [ ] MACC returns sorted list of interventions with `cost_per_tco2e` and `payback_years`.
- [ ] `POST /runs/{id}/report` produces a PDF blob.
- [ ] `GET /reports/{id}` streams a valid PDF (opens in Chrome + Adobe Reader).
- [ ] WeasyPrint verified in Docker-locally.

### 9. Common failure cases
- WeasyPrint missing native deps → 500 in prod. **This is the #1 deploy killer.** Test locally in Docker BEFORE Phase 15.
- PDF fonts render as `□□□` — install fonts in Dockerfile.
- Report layout broken in Adobe Reader but fine in Chrome — usually CSS `@page` issue.

### 10. Diversion traps — DO NOT
- Build CBAM + buyer questionnaire templates for MVP. Ship BRSR Core only.
- Custom PDF layout engineering. Plain HTML + basic CSS is enough.
- Add report versioning / history. One report per run for now.
- Use LaTeX. Overkill.

### 11. Verify before proceeding
Generate a report against the demo persona (Rakesh, textile dyeing). Open the PDF in Chrome and Adobe Reader. Both look correct.

---

## Phase 6 — API Testing

### 1. Objective
Happy path + one edge case per endpoint. Golden emission math test.

### 2. Why this phase comes now
Before layering LLM. Catch calc errors while the surface is small.

### 3. Dependencies
Phase 5a, 5b.

### 4. Files/components to create
```
/api/tests/test_baseline_math.py
/api/tests/test_runs_api.py
/api/tests/test_macc_api.py
/api/tests/test_reports_api.py
/api/tests/fixtures/textile_dyeing_input.json
/api/tests/fixtures/textile_dyeing_expected.json
```

### 5. Implementation tasks
1. Golden test — canonical SME input → expected outputs. Every change must keep this stable.
2. One auth-required test per protected endpoint.
3. One edge case per endpoint (zero activity, missing sector, invalid input).
4. WeasyPrint smoke.

### 6. Testing strategy
`pytest -v --cov=app`. **Target ≥ 40-50% coverage on services.** Not 70%. Hackathon-realistic.

### 7. Expected result
Any change that moves the emission math trips a test.

### 8. Completion criteria
- [ ] Golden test passes.
- [ ] Auth-required tests pass.
- [ ] Suite runs in < 60 seconds.

### 9. Common failure cases
- Fixture drift.
- Coverage inflated by hitting error paths trivially.

### 10. Diversion traps — DO NOT
- Chase 70-90% coverage.
- Add property-based testing.
- Add load tests / benchmarks.

### 11. Verify before proceeding
Break something small (change a factor value). Confirm a test fails.

---

## Phase 7 — AI Core Intelligence (LLM Recommender)

*(Renamed from "AI/ML" to match ideation submission — we don't use ML.)*

### 1. Objective
The RAG + LLM recommender per `ARCHITECTURE.md §7`. Take a hotspot, return ranked interventions with rationale, cited.

### 2. Why this phase comes now
This is the differentiator. Depends on stable API + intervention library (Phase 0).

### 3. Dependencies
- Phase 5a.
- Phase 0 (`intervention_library.json` complete).
- LLM API key + embedding key set as env vars.

### 4. Files/components to create
```
/api/app/services/recommender.py
/api/app/llm/client.py
/api/app/llm/embeddings.py
/api/app/llm/prompts.py
/api/app/llm/schemas.py
/api/app/services/intervention_index.py
/api/app/routers/recommendations.py
```

### 5. Implementation tasks
1. **Start with a linear filter, not vector search.** Given ~45 interventions total, filter by `sector` + `applicable_process` metadata. This is 10 lines of code. Add pgvector only if time permits.
2. Retrieval: hotspot context → top-10 candidates from library.
3. LLM call with strict prompt + JSON schema per ARCHITECTURE.md §7.
4. Guardrails: JSON schema validation + one retry; whitelist against candidates; re-attach citation from library.
5. Fallback path: if LLM unavailable → return top-3 candidates by metadata match with `rationale = "Similarity-based match — rationale unavailable"`.
6. `POST /runs/{id}/recommend` endpoint.

### 6. Testing strategy
Mocked LLM for deterministic tests. One real LLM call end-to-end on demo persona.

### 7. Expected result
Given a textile-dyeing hotspot on dyeing bath heating, recommender returns 3-5 interventions like *"waste heat recovery"*, *"biomass conversion"*, each with plain-language rationale and source citation.

### 8. Completion criteria
- [ ] Happy path returns cited recommendations in < 5 s.
- [ ] Fallback path returns similarity-based recommendations when LLM key removed.
- [ ] Every returned recommendation has non-empty `source_citation`.

### 9. Common failure cases
- LLM returns fenced code block (```json … ```) → parser dies. Fix: strip fences.
- LLM output not JSON → retry then fallback.
- Rate limit → exponential backoff, then fallback.
- Prompt engineering rabbit hole — hours lost tuning tiny changes.

### 10. Diversion traps — DO NOT
- **Spend more than 2 hours on prompt tuning.** Set a timer. When it rings, LOCK the prompt.
- Try three LLM providers upfront. One. Fallback added in Phase 13 only.
- Fine-tune a model.
- Build a fancy embedding pipeline if linear filter works.
- Add streaming / SSE responses. Sync JSON is fine.

### 11. Verify before proceeding
Run recommender against 3 sectors × sample hotspot. Sanity check outputs. Then unplug LLM key, confirm fallback works.

---

## Phase 8 — AI Testing

### 1. Objective
Verify guardrails hold under hostile inputs.

### 2. Why this phase comes now
LLM behavior is unpredictable. Explicit adversarial testing catches hallucination before demo.

### 3. Dependencies
Phase 7.

### 4. Files/components to create
```
/api/tests/test_recommender.py
/api/tests/fixtures/mock_llm_responses/*.json
```

### 5. Implementation tasks
1. Test: invents intervention → dropped.
2. Test: malformed JSON → retry then fallback.
3. Test: missing citation → backend re-attaches.
4. Test: empty candidates → returns empty gracefully.
5. Test: prompt injection in hotspot text → treated as data, not instruction.

### 6. Testing strategy
Mocked LLM responses. One real-LLM adversarial run.

### 7. Expected result
Guardrails trigger correctly.

### 8. Completion criteria
- [ ] Five guardrail tests pass.
- [ ] Real-LLM adversarial test passes.

### 9. Common failure cases
- Mock shape drifts from real API.
- Test relies on temperature — flakes.

### 10. Diversion traps — DO NOT
- Test every possible failure mode. Cover the top 5.
- Add rate-limit tests. Handled at infra layer.

### 11. Verify before proceeding
Read the recommender code with fresh eyes once. Confirm the fallback path is not bypassed.

---

## Phase 9 — Frontend Foundation

### 1. Objective
Next.js app with auth flow, protected layout, API client, page shell.

### 2. Why this phase comes now
Frontend can start once Phase 4 (auth API) is stable.

### 3. Dependencies
Phase 4.

### 4. Files/components to create
```
/web/app/(auth)/login/page.tsx
/web/app/(auth)/register/page.tsx
/web/app/(app)/layout.tsx
/web/app/(app)/onboarding/page.tsx    Placeholder
/web/app/(app)/dashboard/page.tsx     Placeholder
/web/lib/api-client.ts
/web/lib/auth.ts
/web/lib/types.ts
/web/components/ui/*
```

### 5. Implementation tasks
1. Login + register pages calling `/auth/*`.
2. JWT in memory (React Context).
3. Protected layout redirects to `/login` if no JWT.
4. API client: Bearer, 10s timeout, one retry on 5xx.
5. Base Tailwind primitives — Button, Input, Card.

### 6. Testing strategy
Manual click-through.

### 7. Expected result
Auth flow works in the browser.

### 8. Completion criteria
- [ ] Register works.
- [ ] Login stores JWT.
- [ ] Logout clears JWT.
- [ ] Direct navigation to `/dashboard` without JWT redirects.

### 9. Common failure cases
- CORS misconfig on backend.
- JWT lost on page reload (accepted).

### 10. Diversion traps — DO NOT
- Build a design system. Plain Tailwind classes are fine.
- Add dark mode. Ship in one theme.
- Add animations (framer-motion). Zero animations for MVP.
- Add accessibility deep dives beyond basic labels. Necessary later.

### 11. Verify before proceeding
Full auth flow in browser. Console clean.

---

## Phase 10 — Frontend Features

### 1. Objective
Four core screens: onboarding, activity entry, dashboard, report preview.

### 2. Why this phase comes now
Requires backend 5a (dashboard) + 5b (report). Can proceed in parallel with AI phases 7-8; use a mocked recommender until 7 is done.

### 3. Dependencies
- Phase 5a.
- Phase 9.
- Recommender: mocked initially, wired to real in Phase 12.

### 4. Files/components to create
```
/web/app/(app)/onboarding/page.tsx
/web/app/(app)/entry/page.tsx
/web/app/(app)/dashboard/[runId]/page.tsx
/web/app/(app)/dashboard/[runId]/hotspot/[id]/page.tsx
/web/app/(app)/dashboard/[runId]/report/page.tsx
/web/components/charts/ScopeBreakdownPie.tsx
/web/components/charts/HotspotBar.tsx
/web/components/charts/MACCChart.tsx
/web/components/cards/InterventionCard.tsx
/web/components/forms/ActivityDataForm.tsx
/web/state/run-context.tsx
```

### 5. Implementation tasks
1. Onboarding wizard — sector select from `GET /sectors`.
2. Activity entry — dynamically render inputs from `GET /sectors/{id}/schema`.
3. Dashboard — Scope pie + top-3 hotspot cards.
4. Hotspot detail — fetch recommendations, render intervention cards.
5. MACC chart — bar chart by `₹/tCO2e`, coloured by payback bucket.
6. Report page — preview + download.
7. Text-only loading states. Text-only empty states.
8. **Wrap Recharts in a Client Component (`dynamic` with `ssr: false`)** to avoid SSR crashes.

### 6. Testing strategy
Manual walkthrough.

### 7. Expected result
Teammate who didn't build it can complete a run.

### 8. Completion criteria
- [ ] All four screens navigable.
- [ ] Charts render on real backend data.
- [ ] Loading state visible during LLM call.
- [ ] Report downloads.
- [ ] Numbers formatted to 2 decimals for tCO2e, integers for ₹.

### 9. Common failure cases
- Recharts SSR crash → wrap in `dynamic({ ssr: false })`.
- Slow LLM → user hits back, orphaned state.
- Numbers with too many decimals.

### 10. Diversion traps — DO NOT
- Polish MACC tooltips / animations / drill-downs. Static bar chart is fine.
- Build reusable design tokens. Copy-paste is fine.
- Add skeleton loaders. Text "Loading..." is enough.
- Add form validation beyond `required` and number type.
- Add i18n. English only.

### 11. Verify before proceeding
Nishith or Bansil completes a full run without help. Note any confusion.

---

## Phase 11 — Frontend Testing *(SKIP if time-tight)*

### 1. Objective
Automated tests for critical UI states.

### 2. Why this phase comes now
Only if time permits. Manual click-through is acceptable substitute.

### 3. Dependencies
Phase 10.

### 4. Files/components to create
```
/web/tests/components/MACCChart.test.tsx
/web/tests/e2e/full-journey.spec.ts
```

### 5. Implementation tasks
1. Component tests for MACC chart, intervention card.
2. Playwright E2E: login → onboard → entry → dashboard → recommendations → report.

### 6. Testing strategy
`npm test` + `npx playwright test`.

### 7. Expected result
Green.

### 8. Completion criteria
- [ ] Component tests pass.
- [ ] E2E passes 3× without flakes.

### 9. Common failure cases
- Playwright timeout on LLM latency.
- Chart animation flakiness (disable animations in test env).

### 10. Diversion traps — DO NOT
- Set up CI Playwright. Local only for hackathon.
- Test every route.
- Add visual regression testing.

### 11. Verify before proceeding
Or skip entirely if time-tight.

---

## Phase 12 — Frontend-Backend Integration

### 1. Objective
Replace mocks with real backend, fix contract drift.

### 2. Why this phase comes now
**Continuous integration is now mandated from Phase 5a onward**, not deferred to a single phase. This phase is the final sweep.

### 3. Dependencies
Phase 5b, 7, 10.

### 4. Files/components to create
Fixes only.

### 5. Implementation tasks
1. Wire recommender endpoint (real, not mock).
2. Full E2E in browser.
3. Fix every 4xx / 5xx encountered.
4. Sync TS types with Pydantic response models.
5. Fix date/timezone, currency formatting, undefined optional fields.
6. Add server-side error boundary for 500s.

### 6. Testing strategy
Browser E2E, then Playwright E2E if available.

### 7. Expected result
Full happy path works. No console errors.

### 8. Completion criteria
- [ ] Login → report download works in browser.
- [ ] No 4xx/5xx in network tab under happy path.
- [ ] Numbers match backend exactly (no client recomputation).

### 9. Common failure cases
- snake_case vs camelCase.
- Postgres decimals as strings.
- Date offsets.

### 10. Diversion traps — DO NOT
- Rewrite types "for cleanliness" — align them, don't refactor.
- Migrate to trpc / graphql. Absolutely not now.

### 11. Verify before proceeding
Three demo personas complete end-to-end.

---

## Phase 13 — External Integrations *(SKIP secondary LLM if primary stable)*

### 1. Objective
Retry/backoff on primary LLM; optional Sentry.

### 2. Why this phase comes now
Only after core works.

### 3. Dependencies
Phase 12.

### 4. Files/components to create
```
/api/app/llm/client.py                Extend
/api/app/observability.py             Optional Sentry
```

### 5. Implementation tasks
1. Primary LLM with retry + backoff on 5xx / rate limit.
2. **Optional:** secondary provider env-swap. Skip if primary stable through Phase 7-8 rehearsals.
3. Optional Sentry init.
4. Tune timeouts: LLM 25s, everything else 10s.

### 6. Testing strategy
Force primary failure, verify graceful degradation.

### 7. Expected result
Recommender stays up.

### 8. Completion criteria
- [ ] Kill primary key → app returns similarity-based recommendations.
- [ ] Log lines include `provider`, `duration_ms`, `status`.

### 9. Common failure cases
- Silent swallowed errors.
- Retry storms.

### 10. Diversion traps — DO NOT
- Add analytics SDKs. stdout logs enough.
- Set up alerting. Email us if X. Not for MVP.
- Add rate-limiting per user.

### 11. Verify before proceeding
Failure-mode drill: remove primary key, full E2E, graceful degradation.

---

## Phase 14 — Security / Error Handling (Minimal)

### 1. Objective
No leaked secrets, CORS scoped, JWT enforced, friendly errors.

### 2. Why this phase comes now
Before public URLs.

### 3. Dependencies
Phase 13.

### 4. Files/components to create
Config changes; no new files.

### 5. Implementation tasks
1. Central FastAPI exception handler → JSON `{code, message}`. No stack traces to client in prod.
2. CORS locked to Vercel prod domain in prod.
3. Grep for hardcoded keys — move all to env vars.
4. `.env` in `.gitignore` verified.
5. Frontend `ErrorBoundary` for render errors.

### 6. Testing strategy
- Malformed request → clean 4xx.
- `git grep` for secrets.

### 7. Expected result
No unhandled 500s. No secrets in repo.

### 8. Completion criteria
- [ ] No unhandled exceptions in an E2E log.
- [ ] `git grep -iE "sk_|postgres://|eyJ"` clean.
- [ ] CORS locked in prod.

### 9. Common failure cases
- Forgotten try/except leaks stack.
- Over-broad CORS `*` in prod.
- Leaked key in git history (rotate the key, don't just delete).

### 10. Diversion traps — DO NOT
- Add rate-limiting middleware. Skip for MVP.
- Add security headers (HSTS, etc.). Skip for MVP.
- Set up a security audit / pentest tool.
- Add CSP.

### 11. Verify before proceeding
Full E2E with malformed inputs; errors are user-friendly. Rotate any recently-committed keys.

---

## Phase 15 — Deployment

### 1. Objective
Live URLs on Vercel (frontend) + Railway (backend + Postgres).

### 2. Why this phase comes now
After local integration works.

### 3. Dependencies
Phase 14. **WeasyPrint verified in Docker locally (from Phase 5b).**

### 4. Files/components to create
```
/api/Dockerfile                       Includes libpango, libcairo, libgdk-pixbuf, fonts
/api/railway.toml
/.github/workflows/deploy.yml         Optional
```

### 5. Implementation tasks
1. Railway project + Postgres (pgvector image) + backend service.
2. Env vars on Railway: DATABASE_URL, JWT_SECRET, LLM_API_KEY, EMBEDDING_API_KEY, CORS_ORIGINS.
3. Dockerfile with WeasyPrint OS deps + fonts.
4. Apply Alembic migrations against Railway Postgres.
5. Run intervention ingestion script (if vector search enabled).
6. Vercel project connected to GitHub.
7. Env var: `NEXT_PUBLIC_API_URL` = Railway URL.
8. Verify HTTPS both ends.

### 6. Testing strategy
Full E2E against prod URLs.

### 7. Expected result
Public URL demoable.

### 8. Completion criteria
- [ ] Frontend URL reachable via HTTPS.
- [ ] Backend URL reachable via HTTPS.
- [ ] `/health` returns 200.
- [ ] Postgres reachable from backend only.
- [ ] E2E against prod passes.

### 9. Common failure cases
- **WeasyPrint OS deps missing → PDF 500s.** #1 deploy killer.
- Env var typo → app crashes at boot with obscure error.
- Postgres SSL required in Railway but backend not configured.
- CORS still `localhost:3000` in prod.
- Cold-start latency 8-10s.

### 10. Diversion traps — DO NOT
- Multi-region. Absolutely not.
- CDN configuration. Vercel does this.
- Auto-scaling policies. Not for MVP.
- Custom domain unless you have one already.

### 11. Verify before proceeding
Teammate on different network completes full journey on live URLs, downloads report, PDF renders correctly.

---

## Phase 16 — Deployed-System Testing

### 1. Objective
Confirm prod matches local under real conditions.

### 2. Why this phase comes now
Prod is different from dev.

### 3. Dependencies
Phase 15.

### 4. Files/components to create
```
/tests/smoke/health.spec.ts
/tests/smoke/full-journey-prod.spec.ts   Optional if using Playwright
```

### 5. Implementation tasks
1. Smoke test full journey against prod URL.
2. Time each step.
3. Verify PDF gen on prod.
4. Verify LLM calls succeed on prod.
5. Cold-start latency measurement.
6. Set up keep-alive ping to reduce cold starts before demo.

### 6. Testing strategy
Manual browser verification from a different device.

### 7. Expected result
Prod passes E2E within acceptable latency.

### 8. Completion criteria
- [ ] E2E on prod URL passes 3× consecutively.
- [ ] Baseline < 500 ms, recommender < 5 s, report < 1 s (warm).
- [ ] Cold-start latency documented (accept < 10 s with keep-alive).

### 9. Common failure cases
- WeasyPrint fonts missing → tofu PDFs.
- LLM key set on wrong service.
- pgvector index missing → recommender slow.

### 10. Diversion traps — DO NOT
- Add production monitoring dashboards.
- Set up load testing.
- Fine-tune connection pool sizes.

### 11. Verify before proceeding
Two teammates independently do E2E on prod on different networks.

---

## Phase 17 — End-to-End Demo Scenarios

### 1. Objective
Rehearse three demo personas end-to-end under 3 minutes each.

### 2. Why this phase comes now
Demo day surprises are avoidable if rehearsed.

### 3. Dependencies
Phase 16.

### 4. Files/components to create
```
/demo/personas.md
/demo/scripts/rakesh-demo.md
/demo/bug-log.md
```

### 5. Implementation tasks
1. Persona 1 — **Rakesh Patel · Textile Dyeing · Surat · ₹18 Cr · EU buyer.** Story: CBAM.
2. Persona 2 — **Foundry SME in Rajkot.** Story: ADEETIE + BRSR cascade.
3. Persona 3 — **Food Processing SME in Ludhiana.** Story: BRSR buyer questionnaire.
4. Run each persona 3× through the app. Time it. Log bugs.
5. Fix P0 bugs. Defer P1.
6. **Pre-cache the recommender output for the primary demo persona in case LLM is slow on demo Wi-Fi.**

### 6. Testing strategy
Manual rehearsal.

### 7. Expected result
3 clean 3-minute journeys.

### 8. Completion criteria
- [ ] Each persona under 3 minutes.
- [ ] No user-visible errors.
- [ ] PDFs open in Chrome + Adobe Reader.

### 9. Common failure cases
- LLM variance blows time budget.
- PDF fonts differ across browsers.

### 10. Diversion traps — DO NOT
- Add a fourth persona.
- Change the sector templates now.
- Refactor code.

### 11. Verify before proceeding
Back-to-back rehearsal of three personas in one sitting.

---

## Phase 18 — Demo Preparation

*(Draft pitch script on Day 1 evening. Nishith + Bansil already know the story from the ideation report.)*

### 1. Objective
Pitch deck + demo script + backup video + Q&A prep.

### 2. Why this phase comes now
Final phase. Everything else is done. Draft of pitch script existed since Day 1 evening.

### 3. Dependencies
Phase 17.

### 4. Files/components to create
```
/demo/pitch-3min.md
/demo/pitch-30sec.md
/demo/pitch-60sec.md
/demo/slides.pdf
/demo/backup-video.mp4
/demo/qa-prep.md
```

### 5. Implementation tasks
1. Finalise 3-minute pitch script.
2. 30-second and 60-second variants for elevator moments.
3. Record 3-minute screen capture of golden journey (backup if internet dies).
4. 10-slide backup deck with screenshots.
5. Q&A cheat sheet — novelty, tech stack, architecture, competitors, "why not ML."
6. Rehearse 3+ times.

### 6. Testing strategy
Rehearse with someone not on the team. Note where they get confused.

### 7. Expected result
Pitch fluent. Backup video ready. Q&A prepared.

### 8. Completion criteria
- [ ] 3-minute pitch delivers in under 3 minutes.
- [ ] Backup video plays without editing.
- [ ] Q&A cheat sheet covers the memorised questions.
- [ ] 3 rehearsals done.

### 9. Common failure cases
- Pitch tries to explain everything.
- Demo crashes on projector resolution.
- Live LLM slow on demo Wi-Fi.
- Judge asks about a Phase 2 feature.

### 10. Diversion traps — DO NOT
- Redesign the slides.
- Rewrite the app to fix a small cosmetic issue.
- Argue about who presents.

### 11. Verify before proceeding
Final dry run in the actual venue if possible.

---

## Silent Killers — the 10 bugs that most often kill hackathon demos

Test each explicitly before Phase 17.

1. **WeasyPrint fonts render as tofu (□□□) on prod** — fonts not in deploy container. Install `fonts-liberation` / `fonts-noto` in Dockerfile.
2. **LLM API key on wrong service** — set in Vercel frontend instead of Railway backend. Recommender returns 401.
3. **CORS still `localhost:3000` in prod** — frontend blocked. Update env var.
4. **JWT secret changes between deploys** — all users logged out. Set the secret ONCE.
5. **Postgres timezones differ** — UTC in DB, local time on frontend, audit trail confusing.
6. **Cold-start latency 8-10 s** — Railway free tier sleeps. Use keep-alive ping cron.
7. **LLM slow on demo Wi-Fi** — venue throttling. Pre-cache the recommender output for demo persona; fall through to cache.
8. **Recharts SSR crash** — `document is not defined`. Wrap in `dynamic(() => …, { ssr: false })`.
9. **Number formatting** — `12.4567890123 tCO₂e` looks unprofessional. Round to 2 decimals.
10. **PDF opens in Chrome but not Adobe Reader** — CSS `@page` issue. Test in both.

---

## Cut List — priority order when the clock hits red

Cut from bottom to top:

1. **Phase 11 (Frontend testing)** — skip Playwright; manual click-through fine.
2. **Phase 13 secondary LLM provider** — one provider enough if primary stable.
3. **Phase 6 coverage target** — happy path + 1 edge case per endpoint. Skip the 70% number.
4. **Third sector template (food processing)** — demo with textile + foundry. Say "food is on roadmap."
5. **CBAM + buyer report templates** — ship only BRSR Core.
6. **Vector search** — use linear filter over 45 interventions.

**Do NOT cut:**
- Golden emission math test (P6).
- WeasyPrint Docker test (P5b).
- Phase 15 deployment.
- Phase 17 rehearsal.
- Phase 18 pitch script.

---

## Locked-in principles across all phases

1. **Do not skip Test / Verify.** They are the phase gate.
2. **Do not add Phase 2 features to Phase 1.** OCR, vernacular voice, ADEETIE finance matching, vendor discovery are explicitly out.
3. **Every number must be traceable.** The audit trail (`activity_data` → `emission_factor_ref` → `source citation`) is not optional.
4. **LLM never touches the primary emission number.** GHG accounting requires auditability.
5. **Reference data lives in git.** Emission factors, sector templates, and intervention library are JSON files, versioned with the code.
6. **The three demo sectors are locked:** textile dyeing, foundry, food processing. Do not add more.
7. **If the LLM is down, fallback to similarity search.** Never let the recommender return an error.
8. **Every phase is done or not done. No "80% done."**
9. **When in doubt, cut, don't stretch.** A working demo of 4 features beats a broken demo of 6.
10. **Ask "does this help the demo?" for every added line of code.**
