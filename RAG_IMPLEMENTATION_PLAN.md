# RAG Implementation Plan — CarbonIQ

> **Scope:** Wire the existing Gemini-backed RAG pipeline end-to-end so every SME
> baseline run automatically produces personalised, LLM-written intervention
> rationales on the MACC page.
>
> **Effort:** ~2.5 hours of focused work.
>
> **Stack:** Gemini (`google-genai` SDK), pgvector, FastAPI BackgroundTasks,
> existing Next.js MACC page.

---

## Assumptions (locked)

- Recommendations must fire **automatically** after every baseline calculation
  (via async `BackgroundTasks` so `POST /runs` stays fast for the SME).
- **Model chain** — try `gemini-3.5-flash-lite` first, fall back to
  known-good `gemini-2.5-flash-lite` → `gemini-2.5-flash` →
  `gemini-2.0-flash-lite`.
- **Recommender only** — no Q&A chatbot in this phase.
- **Embeddings seeded** — unknown → Phase 0 verifies and seeds if empty.

---

## What is already built (no work needed)

| Piece                                                        | File                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| Gemini SDK, API keys, embedding client, LLM client with structured output | `api/app/llm/*`                          |
| `intervention_embeddings` table + pgvector migration         | `api/app/models/intervention_embedding.py` + `api/app/db/migrations/versions/0002_resize_embedding_vector.py` |
| Vector retrieval `search_candidates(db, query, limit)`       | `api/app/services/intervention_index.py` |
| Full RAG pipeline: retrieve → LLM → guardrails → whitelist → fallback | `api/app/services/recommender.py`        |
| Seed script                                                  | `api/app/scripts/embed_interventions.py` |
| MACC endpoint calling `create_recommendations()` per hotspot | `api/app/services/macc.py`               |
| Frontend MACC page consumes `item.rationale` on each card    | `web/components/cards/InterventionCard.tsx` |

**Bottom line:** the plumbing exists. Real remaining work is fixing a broken model
list, seeding vectors, wiring an async trigger, and small frontend polish.

---

## The two-layer contract (must never break)

| Layer                 | Owns                                                          | Never does                            |
| --------------------- | ------------------------------------------------------------- | ------------------------------------- |
| **Deterministic math**| Every tCO₂e, ₹ saving, payback, cost per tCO₂e                | LLM never touches these               |
| **RAG + LLM**         | Which interventions to shortlist, the prose rationale around the numbers | Never emits a number that wasn't computed above |

This separation is what makes the report defensible to an auditor. Break it once
and the "auditable" pitch collapses.

---

## Phase 0 — Verify embeddings are seeded (15 min)

**Why it matters:** if the `intervention_embeddings` table is empty, the vector
search in `search_candidates()` silently returns the first 10 items from the JSON
library via the `except: pass` fallback. RAG looks like it's working but isn't.

### Steps

1. From your terminal:

   ```bash
   docker exec -it carboniq-postgres psql -U postgres -d carboniq \
     -c "SELECT count(*) FROM intervention_embeddings;"
   ```

2. Expected count: **30** (one per intervention in `intervention_library.json`).

3. If 0 or under-count, run:

   ```bash
   cd api
   python -m app.scripts.embed_interventions
   ```

4. Re-verify the count is 30.

### Definition of done

- Table has one row per intervention with a non-null 3072-dim vector.

---

## Phase 1 — Fix the broken LLM model chain (30 min)

**Why:** every LLM call in the current code hits invalid model names, fails, and
returns the boilerplate `"Similarity-based match — rationale unavailable"`. This
is the #1 reason your rationales look dead.

### Change one file: `api/app/llm/client.py`

Replace the `RECOMMENDATION_MODELS` list with:

```python
RECOMMENDATION_MODELS = [
    "gemini-3.5-flash-lite",     # primary — as requested
    "gemini-2.5-flash-lite",     # known-good fallback
    "gemini-2.5-flash",          # higher-quality fallback
    "gemini-2.0-flash-lite",     # last-resort
]
```

If `gemini-3.5-flash-lite` returns "model not found" in your region/quota, drop
that entry — the `gemini-2.5-*` chain will still handle everything.

Also make sure the same model list is used consistently in `routers/upload.py`
(the Gemini PDF-parsing endpoint) if it hardcodes a model there.

### Test immediately (after restarting uvicorn)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@carboniq.in","password":"Demo@1234"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

RUN_ID=$(curl -s http://localhost:8000/runs \
  -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

HOTSPOT_ID=$(curl -s http://localhost:8000/runs/$RUN_ID \
  -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;print(json.load(sys.stdin)['hotspots'][0]['id'])")

curl -X POST http://localhost:8000/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"hotspot_id\":\"$HOTSPOT_ID\"}"
```

Response should contain real personalised rationales — **not** the boilerplate
fallback string.

### Definition of done

- MACC page opens on any existing run and cards show LLM-written 40-80 word
  rationales that reference the SME's actual sector, unit-process, and tCO₂e
  numbers.

---

## Phase 2 — Fire recommendations automatically after baseline calc (45 min)

**Current behaviour:** recommendations only generate when the user clicks "MACC"
on the dashboard (lazy). Result: first MACC page open is slow (10-15s of LLM
calls).

**Target behaviour:** recommendations generate in the background right after
`POST /runs` returns. Dashboard and MACC both load instantly.

### Implementation — FastAPI `BackgroundTasks` (simplest, ships today)

In `api/app/routers/runs.py`, after the baseline computes and the run is
committed:

```python
import logging
from fastapi import BackgroundTasks
from app.services.recommender import create_recommendations
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


@router.post("/runs", ...)
def create_run(
    data: CreateRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = _run_baseline_pipeline(...)   # existing code
    db.commit()
    db.refresh(run)

    # NEW: schedule recommendations for every hotspot in the background
    for hotspot in run.hotspots:
        background_tasks.add_task(
            _safe_create_recommendations,
            run_id=run.id,
            hotspot_id=hotspot.id,
        )
    return run


def _safe_create_recommendations(run_id, hotspot_id):
    """Isolated so a Gemini timeout can't fail the run itself."""
    with SessionLocal() as db:
        try:
            create_recommendations(db, run_id, hotspot_id)
        except Exception as e:
            logger.warning(
                f"Background recommendation for hotspot {hotspot_id} failed: {e}"
            )
```

### Why `BackgroundTasks` (and not a full job queue)

- Returns `POST /runs` response instantly — SME sees the dashboard in 2-3s
  instead of 10-15s.
- Recommendations generate over the next 5-8s server-side.
- Idempotent: if the SME opens MACC before background is done, the existing
  `create_recommendations` check finds no existing rows and generates them (only
  the still-missing ones), so nothing is lost or duplicated.
- Celery / RQ / Redis would be over-engineering for a hackathon.

### Safety net (keep as-is)

The MACC endpoint currently *creates* recommendations if none exist. Keep that
logic — it is the safety net for cases where the background task failed
(Gemini quota, transient network error, etc.). Opening MACC will still generate
what's missing on-demand.

### Definition of done

1. Post a new run via the entry page → within 10 seconds the `recommendations`
   table has rows for each hotspot.
2. Opening MACC for that run returns instantly (no LLM calls fire because the
   DB cache is warm).

---

## Phase 3 — Frontend polish (30 min)

The InterventionCard already renders `item.rationale`. Two small hardening
tweaks make it feel authentically AI-powered.

### 3a. Show a subtle "AI-generated" indicator when rationale came from the LLM

When rationale text is NOT the boilerplate `"Similarity-based match — rationale
unavailable"`, render a tiny chip near the top of the card:

```tsx
{item.rationale && !item.rationale.includes("unavailable") && (
  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-600 mb-2">
    <Sparkles className="w-2.5 h-2.5" />
    AI-generated rationale · cited from library
  </span>
)}
```

Location: `web/components/cards/InterventionCard.tsx`, right above the
`<p className="text-xs text-steel leading-relaxed mb-4">` block that renders
`{item.rationale}`.

### 3b. Remove the wizard tabs from the MACC page

The MACC page still has `1. Baseline · 2. MACC Curve · 3. BRSR Report` at the
top — same wizard cruft that was cleaned from the report page. Kill it, keep
just the page title and description.

File: `web/app/(app)/dashboard/[runId]/macc/page.tsx`, delete the block starting
with `{/* Tab Pills */}` inside the top breadcrumb row.

### Definition of done

- MACC page renders LLM rationales with a tiny "AI-generated · cited from
  library" chip above each rationale.
- No wizard tabs at the top of the MACC page.

---

## Phase 4 — End-to-end validation (30 min)

### Test matrix (~5 minutes each)

| Test                                              | Expected                                                  |
| ------------------------------------------------- | --------------------------------------------------------- |
| Create a new run via UI (log 3 activities)        | Dashboard loads in ~2s                                    |
| Wait 10s, open MACC page                          | Real rationales visible on all intervention cards         |
| Force LLM failure (temporarily blank `LLM_API_KEY`, restart) | Cards show fallback strings, no 500 errors                |
| Restore key, delete recommendation rows, open MACC | Fresh LLM calls fire, new rationales appear               |
| Open the same MACC page twice in a row            | Second load is instant (cached, no LLM cost)              |
| Verify vectors loaded                             | See SQL below                                             |

Verify vectors loaded:

```bash
docker exec -it carboniq-postgres psql -U postgres -d carboniq \
  -c "SELECT intervention_id, vector[0:5] FROM intervention_embeddings LIMIT 3;"
```

Expect 3 rows with real numeric vector slices.

### Retrieval-quality smoke tests (one per sector)

| Seed hotspot                              | Expected top-3 candidates in retrieval                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| Textile dyeing bath, 62 tCO₂e             | hot dye liquor reuse, cold pad batch, high-fixation dyes      |
| Foundry melting, 350 tCO₂e                | divided-blast cupola, recuperator, induction conversion       |
| Food processing refrigeration, 45 tCO₂e   | refrigeration heat recovery, VFD compressors, ammonia refrigerant |

If a hotspot's expected match is missing from the top-5 returned by
`search_candidates()`, tweak the semantic query in
`services/recommender.py`:

```python
semantic_query = (
    f"Carbon reduction interventions for {sector} industry, "
    f"specifically targeting the {process} process, "
    f"which contributes {round(share_pct, 1)}% of total emissions "
    f"({round(magnitude, 2)} tCO2e)."
)
```

Add sector-specific keywords like `boiler`, `thermal`, `electric motor`,
`refrigeration` to nudge retrieval on fuzzy sectors.

---

## Effort breakdown

| Phase                                             |     Time | Owner         | Blocker              |
| ------------------------------------------------- | -------: | ------------- | -------------------- |
| 0 — Verify/seed embeddings                        |   15 min | You           | None                 |
| 1 — Fix Gemini model names                        |   30 min | Pranshu       | None                 |
| 2 — Auto-fire recommendations on run creation     |   45 min | Pranshu       | Depends on Phase 1   |
| 3 — Frontend polish + AI chip                     |   30 min | Anyone        | Depends on Phase 1   |
| 4 — End-to-end validation                         |   30 min | Whole team    | Depends on 1-3       |
| **Total**                                         | **~2.5 hrs** |             |                      |

---

## Cost + latency after this ships

Per new run:

- 3 hotspots × 1 embedding query = 3 embedding calls → **~₹0.05**
- 3 hotspots × 1 LLM call (returns multiple ranked recommendations) → **~₹1-2**
- Total: **~₹2 per run**, cached forever after first generation.
- User-visible latency: **0s** (background), MACC page loads instantly.

At **1000 runs/month**: ₹2,000/mo total AI cost. Sustainable at any SaaS price
point.

---

## Two important gotchas

### 1. `gemini-3.5-flash-lite` may not exist yet

If Phase 1 tests reveal "model not found" errors on the primary model, drop
that entry and let the fallback chain handle it. The `gemini-2.5-flash-lite`
model is publicly available and behaves nearly identically at the same price.

### 2. `search_candidates` swallows errors silently

`services/intervention_index.py` currently has:

```python
except Exception:
    pass
```

That's why an unseeded table doesn't crash — it silently returns `library[:10]`
with no vector ranking. Add a warning so future debugging isn't guesswork:

```python
except Exception as e:
    logger.warning(f"Vector search failed, returning library slice: {e}")
```

---

## Pitch line to memorise for judges

> **"Every recommendation you see was semantically matched from a
> 30-intervention library using pgvector, then re-ranked and given a
> personalised rationale by Gemini — using only the numbers our deterministic
> engine already computed. The LLM literally cannot invent a tCO₂e value
> because we never ask it to. Take out the AI and we're still a compliance
> tool; add the AI and every SME gets consultant-quality personalised advice
> at ₹2 per report."**

---

## Deliverables checklist

- [ ] Phase 0 — verified `intervention_embeddings` has 30 rows (or reseeded)
- [ ] Phase 1 — `RECOMMENDATION_MODELS` fixed in `api/app/llm/client.py`
- [ ] Phase 1 — smoke test confirms real rationales returned from
      `POST /recommendations`
- [ ] Phase 2 — `BackgroundTasks` wired into `POST /runs`
- [ ] Phase 2 — `_safe_create_recommendations` helper added (isolated failure)
- [ ] Phase 3 — `AI-generated · cited from library` chip added to
      `InterventionCard.tsx`
- [ ] Phase 3 — wizard tabs removed from MACC page
- [ ] Phase 4 — five-test matrix passes
- [ ] Phase 4 — retrieval smoke tests pass for all three MVP sectors
- [ ] `logger.warning` added inside the `except` in `search_candidates`

Ship these and the RAG layer is production-ready for demo day.
