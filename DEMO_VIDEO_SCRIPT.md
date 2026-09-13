# 🎬 CarbonIQ — HackOut'26 Demo Video Script

**Total runtime target:** 4 min 15 sec
**Login:** `demo@carboniq.in` / `Demo@1234`
**Demo entry:** December 2024 (or January 2025 if Dec already exists)
**Pre-open 3 browser tabs:** `/entry`, `/reports`, plus one blank tab for later — switch tabs, don't navigate.

---

## 🎬 SCENE 1 — Hook & Problem (0:00 – 0:25)

**On screen:** Title card "CarbonIQ" with tagline *"Carbon accounting for the 63 million SMEs India forgot."*

**Narration:**
> "India has 63 million MSMEs. They contribute nearly 40% of national emissions — but almost none of them measure their carbon footprint. Existing tools cost lakhs, take weeks to onboard, and are built for large corporates.
>
> Meanwhile from 2026, CBAM starts taxing Indian exports on embedded carbon. SEBI's BRSR Core is cascading Scope 3 down to SME suppliers. Banks want green metrics before lending.
>
> The SME is stuck. **That's what CarbonIQ solves.**"

---

## 🎬 SCENE 2 — What We Built (0:25 – 0:42)

**On screen:** Login page loaded.

**Narration:**
> "CarbonIQ lets any Indian SME log their monthly bills, get a compliance-grade carbon report in seconds, and receive AI-ranked reduction recommendations. All built in 36 hours. Let me show you how it works — from raw bill to boardroom-ready report."

---

## 🎬 SCENE 3 — Login & Dashboard (0:42 – 1:10)

**On-screen action:**
1. Type `demo@carboniq.in` — pause briefly to show inline email validation.
2. Type `Demo@1234` — click the eye toggle briefly.
3. Login → dashboard loads.
4. Hover the top-right avatar → show dropdown (Profile / Settings / Logout).

**Narration:**
> "Meet Rajesh Mehta — owner of a textile dyeing mill in Surat. He signs in with his email and password. Small touches like inline validation matter for first-time users.
>
> His dashboard shows his FY 2024–25 running total: **5,142 tonnes of CO₂ equivalent** across six months. The trend chart shows emissions climbing as production scales for the festive season."

---

## 🎬 SCENE 4 — Data Entry (1:10 – 1:55)

**On-screen action:**
1. Switch to the `/entry` tab.
2. Show **Manual** and **PDF Upload** tabs — electricity is pre-selected.
3. **Type in the 4 line items** (copy-paste the numbers, don't hand-type):

| # | Field | Value | Unit |
|---|---|---:|---|
| 1 | Grid electricity *(pre-filled)* | `100000` | kWh |
| 2 | + Add → Coal (Indian bituminous) | `40000` | kg |
| 3 | + Add → Diesel (HSD) | `450` | litre |
| 4 | + Add → Purchased cotton yarn | `200` | tonne |

4. Set period `2024-12-01` → `2024-12-31`.
5. Briefly switch to **PDF Upload** tab, show the drop zone, switch back.
6. Click **Calculate**.

**Narration (while typing):**
> "This is where Rajesh logs a new month — December 2024. We keep the default view minimal: just electricity. He adds only what applies to him from this dropdown. No 200-field form to scare him off.
>
> One hundred thousand units of grid electricity from Torrent Power. Forty tonnes of coal for the boiler. Four-fifty litres of diesel for the backup genset. And two hundred tonnes of cotton yarn from his upstream supplier.
>
> If he'd rather just drop his electricity bill PDF, our parser extracts the units and cost automatically. This is the difference between a three-week onboarding and a three-minute one."

---

## 🎬 SCENE 5 — Breakdown / Calculation Result (1:55 – 2:30)

**On-screen action:** Breakdown page loads. Point at each scope card, then scroll to the hotspot table.

**Numbers on screen (approx):**
- Scope 1: ~96 tCO₂e (11%)
- Scope 2: ~72 tCO₂e (8%)
- Scope 3: ~683 tCO₂e (81%)
- **Total: ~851 tCO₂e**

**Narration:**
> "Two seconds later — here's the answer. We split emissions into Scope 1 — his coal boiler and diesel gensets, about 96 tonnes. Scope 2 — the grid electricity, 72 tonnes. And Scope 3 — the cotton yarn he purchased upstream, 683 tonnes.
>
> Total for December: **851 tonnes CO₂ equivalent**. But look at this — **81% is Scope 3**. That single insight tells Rajesh his real reduction levers aren't inside his factory, they're in his supply chain. Most Indian SMEs never see this because their auditor stops at Scope 2."

---

## 🎬 SCENE 6 — MACC Triage (2:30 – 3:00)

**On-screen action:**
1. From breakdown header, click **View MACC Interventions**.
2. Triage view opens — list of intervention titles only, no charts yet.
3. Tag on camera in this order:

| Intervention | Tag |
|---|---|
| LED lighting retrofit | ✅ Interested |
| Rooftop solar PV (100 kWp) | ✅ Interested |
| Coal-to-biomass boiler conversion | ✅ Interested |
| Heat recovery from stenter exhaust | ⏳ Already Implemented |
| VFDs on process pumps | ⏳ Already Implemented |
| Sustainable cotton sourcing pilot | ✅ Interested |
| Rainwater harvesting | ❌ Not Applicable |

4. Click **Show Results**.

**Narration:**
> "Now here's where the AI kicks in. Our RAG pipeline pulls from a library of 60-plus interventions and re-ranks them for Rajesh's specific hotspots using Gemini.
>
> But we don't dump ten charts on him. First he does a quick triage — three states per intervention: **Interested**, **Already Implemented**, or **Not Applicable**. He tags LED, solar and boiler switch as interested. Heat recovery and VFDs he's already done — good, we credit him. Rainwater harvesting doesn't apply to his site. Now show me the results."

---

## 🎬 SCENE 7 — MACC Results (3:00 – 3:25)

**On-screen action:** Results view loads — MACC chart + KPI cards.

**Numbers on screen (approx):**
- Total abatement potential: **~380 tCO₂e/yr**
- Total CapEx: **~₹1.4 Cr**
- Weighted payback: **~3.2 years**
- Chart: green bars on the left (cost-saving), red bars on the right (cost-per-tonne)

**Narration:**
> "This is the marginal abatement cost curve — the industry standard for prioritising decarbonisation. Green bars on the left **save money AND cut carbon** — those are no-brainers, do them tomorrow. Red bars on the right cost money per tonne — but now Rajesh can prioritise instead of guess.
>
> If he acts on just his interested items: **380 tonnes of CO₂ avoided per year, roughly 45% of his footprint, at a weighted payback of 3.2 years**. That's a decision-ready plan — not a static PDF."

---

## 🎬 SCENE 8 — BRSR Report (3:25 – 3:55)

**On-screen action:**
1. From breakdown header, click **View / Generate Report**.
2. Report page loads in **Executive** view.
3. Point at headline number, top 3 hotspots, intensity metric.
4. Toggle to **Full** view.
5. Scroll through: methodology, Scope 3 row, Appendix A audit trail, signature block.
6. Optional: click **Download PDF**.

**Narration:**
> "And here's the compliance layer — a full **BRSR Core**-compliant report. Two views, one toggle apart.
>
> The **executive** view is a one-pager for his bank or export buyer: headline number, top three hotspots, emission intensity per rupee of turnover.
>
> The **full** view is for his auditor: methodology with emission factor sources cited, Scope 3 breakdown, and Appendix A — every calculation traceable back to the input activity. This is what makes it defensible. Not just a pretty chart."

---

## 🎬 SCENE 9 — Tech Stack Flash (3:55 – 4:05)

**On screen:** Logo grid — Next.js 14 · FastAPI · Postgres + pgvector · Gemini · WeasyPrint · Recharts.

**Narration:**
> "Built on Next.js 14, FastAPI, Postgres with pgvector for the RAG index, and Gemini for LLM re-ranking. Deterministic math on the backend, AI only on the recommendation layer — so numbers never hallucinate."

---

## 🎬 SCENE 10 — Closing (4:05 – 4:20)

**On screen:** Team card + logo + *"CarbonIQ — Circular Carbon Ecosystem, HackOut'26"*

**Narration:**
> "CarbonIQ makes carbon accounting practical for the businesses that need it most, but can afford it least. From compliance to circularity — in one platform.
>
> We're **Team CarbonIQ**. Thanks for watching."

---

## ⏱️ Full timing sheet

| Scene | Duration | Cumulative |
|---|---:|---:|
| 1. Hook | 0:25 | 0:25 |
| 2. What we built | 0:17 | 0:42 |
| 3. Login + dashboard | 0:28 | 1:10 |
| 4. Data entry | 0:45 | 1:55 |
| 5. Breakdown | 0:35 | 2:30 |
| 6. MACC triage | 0:30 | 3:00 |
| 7. MACC results | 0:25 | 3:25 |
| 8. BRSR report | 0:30 | 3:55 |
| 9. Tech stack | 0:10 | 4:05 |
| 10. Closing | 0:15 | **4:20** |

---

## 📋 Demo values reference card

Copy these into a scratchpad before you record so you can paste — don't hand-type long numbers on camera.

```
Period:   2024-12-01  to  2024-12-31

Grid electricity          100000    kWh
Coal (Indian bituminous)   40000    kg
Diesel (HSD)                 450    litre
Purchased cotton yarn        200    tonne
```

**Expected result after Calculate:**
- Scope 1 ≈ 96 tCO₂e
- Scope 2 ≈ 72 tCO₂e
- Scope 3 ≈ 683 tCO₂e
- **Total ≈ 851 tCO₂e**

---

## 🎯 Pre-recording checklist

- [ ] Backend running on port 8000 (one clean uvicorn worker)
- [ ] Frontend running on port 3000
- [ ] Logged in once already → refresh so first login on camera is fast
- [ ] **Delete Dec 2024 test entries** if you did dry runs, else switch to Jan 2025
- [ ] Copy `100000`, `40000`, `450`, `200` to a scratchpad for fast paste
- [ ] Browser at 110–125% zoom
- [ ] Close all other tabs; hide bookmarks bar
- [ ] Do-not-disturb ON, notifications OFF
- [ ] OBS/Loom set to 1080p 30fps
- [ ] Microphone level tested — do one throwaway "one two three" recording first

---

## 🎬 Recording tips

- **Cursor:** slow, deliberate. Pause 1 sec before each click so the viewer's eye catches up.
- **Zoom:** if UI text is small, zoom the browser to 110–125%.
- **Cut mercilessly:** if the login takes 3 sec, speed it 2× in the edit.
- **Music:** low-volume royalty-free (Uppbeat, Pixabay) — instrumental, no lyrics.
- **Voiceover:** record in one take per scene using phone voice memo; denoise in Audacity.
- **Screen tool:** OBS Studio (free) or Loom (fastest for hackathon).
- **Export:** 1080p 30fps, MP4, ideally under 100 MB for easy upload.
