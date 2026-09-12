import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileCheck2,
  TrendingDown,
  Building2,
  ShieldCheck,
  Globe2,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Quote,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

/* ─── Inline visualisation components ─── */

function CarbonFootprintDashboard() {
  const categories = [
    { label: "Dyeing Bath", co2: 184.2, color: "#1e3a5f" },
    { label: "ETP Aeration", co2: 45.3, color: "#2563eb" },
    { label: "Stenter Dryer", co2: 31.1, color: "#6366f1" },
    { label: "Boiler Aux.", co2: 14.2, color: "#93c5fd" },
    { label: "Lighting & HVAC", co2: 8.5, color: "#bfdbfe" },
  ];
  const total = categories.reduce((s, c) => s + c.co2, 0);

  /* Donut chart segments — hand-computed for a 100-unit circumference ring */
  const circumference = 100;
  let offset = 25; // start at 12 o'clock (SVG circle starts at 3 o'clock, so shift -25%)
  const segments = categories.map((c) => {
    const pct = (c.co2 / total) * 100;
    const seg = { ...c, pct, dashArray: `${pct} ${circumference - pct}`, dashOffset: offset };
    offset -= pct; // counter-clockwise
    return seg;
  });

  /* Stacked bar data — shows increasing emissions through peak season */
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthlyStacks = [
    [10, 2, 2, 1, 1],
    [12, 3, 2, 1, 1],
    [14, 3, 3, 1, 1],
    [15, 4, 3, 2, 1],
    [17, 4, 3, 2, 1],
    [19, 5, 4, 2, 1],
    [21, 5, 4, 2, 1],
    [22, 6, 4, 2, 1],
    [20, 5, 4, 2, 1],
    [18, 5, 3, 2, 1],
    [16, 4, 3, 1, 1],
    [14, 3, 3, 1, 1],
  ];
  const maxStack = Math.max(...monthlyStacks.map((s) => s.reduce((a, b) => a + b, 0)));

  const tableRows = [
    { label: "Dyeing Bath", sub: true, children: [
      { label: "Jigger Machine", co2: "72,180" },
      { label: "Winch Dyeing", co2: "58,400" },
      { label: "Jet Dyeing", co2: "34,120" },
      { label: "Padding Mangle", co2: "19,500" },
    ], co2: "184,200" },
  ];

  return (
    <div>
      {/* Title bar */}
      <h3 className="text-xl font-bold text-midnight mb-1">Carbon Footprint</h3>
      <div className="h-px bg-electric-blue/20 mb-5" />

      {/* Top half: donut + stacked bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Donut chart */}
        <div>
          <div className="text-xs font-semibold text-charcoal mb-3">Emissions by process</div>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 42 42" className="w-28 h-28 shrink-0" aria-label="Donut chart of emissions by process">
              {/* Background ring */}
              <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#e5e7eb" strokeWidth="4" />
              {/* Segments */}
              {segments.map((s) => (
                <circle
                  key={s.label}
                  cx="21"
                  cy="21"
                  r="15.91549"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth="4"
                  strokeDasharray={s.dashArray}
                  strokeDashoffset={s.dashOffset}
                  strokeLinecap="butt"
                />
              ))}
              {/* Center text */}
              <text x="21" y="20" textAnchor="middle" className="text-[4px] font-bold" fill="#0f172a">
                {total.toFixed(0)}
              </text>
              <text x="21" y="24.5" textAnchor="middle" className="text-[2.8px]" fill="#64748b">
                tCO₂e
              </text>
            </svg>
            {/* Legend */}
            <div className="space-y-1.5">
              {categories.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs text-charcoal">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stacked bar chart */}
        <div className="flex-1">
          <div className="text-xs font-semibold text-charcoal mb-3">Emissions over time (tCO₂e)</div>
          <div className="flex gap-2">
            {/* Y-axis */}
            <div className="flex flex-col justify-between h-24 text-[9px] text-steel py-0.5">
              <span>{Math.ceil(maxStack / 10) * 10}</span>
              <span>{Math.ceil(maxStack / 20) * 10}</span>
              <span>0</span>
            </div>
            {/* Chart Area */}
            <div className="flex-1">
              <div className="flex items-end gap-1 h-24 border-b border-ash/40">
                {monthlyStacks.map((stack, i) => {
                  const stackTotal = stack.reduce((a, b) => a + b, 0);
                  const heightPct = (stackTotal / maxStack) * 100;
                  return (
                    <div key={months[i]} className="flex-1 flex flex-col justify-end items-center group h-full relative" title={`${months[i]}: ${stackTotal} tCO₂e`}>
                      <span className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-electric-blue z-10 pointer-events-none bg-canvas/80 px-1 rounded">
                        {stackTotal}
                      </span>
                      <div className="w-full rounded-sm overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:brightness-110" style={{ height: `${heightPct}%`, minHeight: 4 }}>
                        {stack.map((val, j) => (
                          <div
                            key={j}
                            style={{
                              height: `${(val / stackTotal) * 100}%`,
                              backgroundColor: categories[j]?.color ?? "#cbd5e1",
                              minHeight: 1,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Month labels */}
              <div className="flex gap-1 mt-1.5 ml-0">
                {months.map((m) => (
                  <div key={m} className="flex-1 text-center text-[9px] text-fog font-mono">{m}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-electric-blue/10 mb-4" />

      {/* Breakdown table */}
      <div>
        {tableRows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between py-2 border-b border-ash/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-electric-blue">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4" /></svg>
                {row.label}
              </div>
              <span className="text-sm text-charcoal font-mono">{row.co2} <span className="text-xs text-fog">tCO₂e</span></span>
            </div>
            {row.children?.map((child) => (
              <div key={child.label} className="flex items-center justify-between py-1.5 pl-8 border-b border-ash/20">
                <span className="text-xs text-steel">{child.label}</span>
                <span className="text-xs text-charcoal font-mono">{child.co2}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPreviewMockup() {
  return (
    <div className="space-y-4">
      {/* Mini doc header */}
      <div className="flex items-center gap-3 p-3 bg-paper/80 rounded-xl border border-ash/60">
        <div className="w-10 h-10 rounded-lg bg-tangerine/10 flex items-center justify-center shrink-0">
          <FileCheck2 className="w-5 h-5 text-tangerine" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-midnight truncate">BRSR Core – Principle 6</div>
          <div className="text-[11px] text-steel font-mono">FY 2025-26 · 12 pages · PDF</div>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-vivid-green/10 text-[10px] font-bold text-vivid-green uppercase tracking-wide shrink-0">Ready</div>
      </div>
      {/* Skeleton lines representing document content */}
      <div className="p-4 bg-paper/50 rounded-xl border border-ash/40 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal">
          <CheckCircle2 className="w-3.5 h-3.5 text-vivid-green" /> Scope 1 – Direct Emissions
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-midnight">142.8</div>
            <div className="text-[10px] text-steel">tCO₂e</div>
          </div>
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-midnight">38.4</div>
            <div className="text-[10px] text-steel">Coal (t)</div>
          </div>
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-midnight">5,200</div>
            <div className="text-[10px] text-steel">Diesel (L)</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal mt-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-vivid-green" /> Scope 2 – Grid Electricity
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-midnight">283.2</div>
            <div className="text-[10px] text-steel">tCO₂e</div>
          </div>
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-midnight">397.8</div>
            <div className="text-[10px] text-steel">MWh</div>
          </div>
          <div className="p-2 rounded-md bg-canvas border border-ash/40 text-center">
            <div className="text-base font-bold text-electric-blue">0.7117</div>
            <div className="text-[10px] text-steel">EF (tCO₂/MWh)</div>
          </div>
        </div>
      </div>
      {/* Second doc */}
      <div className="flex items-center gap-3 p-3 bg-paper/80 rounded-xl border border-ash/60">
        <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center shrink-0">
          <Globe2 className="w-5 h-5 text-electric-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-midnight truncate">EU CBAM Declaration</div>
          <div className="text-[11px] text-steel font-mono">Q4 2025 · 8 pages · PDF</div>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-tangerine/10 text-[10px] font-bold text-tangerine uppercase tracking-wide shrink-0">Draft</div>
      </div>
    </div>
  );
}

function MACCCurveSVG() {
  return (
    <div className="space-y-4">
      {/* SVG MACC Curve */}
      <div className="bg-paper/50 rounded-xl border border-ash/40 p-4 overflow-hidden">
        <div className="text-xs font-semibold text-charcoal mb-3">Marginal Abatement Cost Curve (₹/tCO₂e)</div>
        <svg viewBox="0 0 400 180" className="w-full" aria-label="MACC Curve showing cost-effective interventions">
          {/* Grid lines */}
          <line x1="50" y1="20" x2="50" y2="150" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="50" y1="90" x2="380" y2="90" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
          <line x1="50" y1="150" x2="380" y2="150" stroke="#e5e7eb" strokeWidth="1" />
          {/* Y-axis labels */}
          <text x="45" y="25" textAnchor="end" className="text-[9px]" fill="#94a3b8">+₹4k</text>
          <text x="45" y="93" textAnchor="end" className="text-[9px]" fill="#94a3b8">₹0</text>
          <text x="45" y="155" textAnchor="end" className="text-[9px]" fill="#94a3b8">-₹4k</text>
          {/* X-axis label */}
          <text x="215" y="175" textAnchor="middle" className="text-[9px]" fill="#94a3b8">Cumulative tCO₂e Abated →</text>
          {/* Negative-cost bars (below zero line = good) */}
          <rect x="60" y="90" width="40" height="50" rx="3" fill="#16a34a" opacity="0.85"><title>Heat Exchanger: -₹2,200/tCO₂e</title></rect>
          <rect x="110" y="90" width="35" height="40" rx="3" fill="#22c55e" opacity="0.85"><title>Condensate Recovery: -₹1,800/tCO₂e</title></rect>
          <rect x="155" y="90" width="50" height="30" rx="3" fill="#4ade80" opacity="0.85"><title>VFD on Pumps: -₹1,200/tCO₂e</title></rect>
          <rect x="215" y="90" width="30" height="15" rx="3" fill="#86efac" opacity="0.85"><title>LED Retrofit: -₹600/tCO₂e</title></rect>
          {/* Positive-cost bars (above zero line) */}
          <rect x="255" y="70" width="35" height="20" rx="3" fill="#f59e0b" opacity="0.85"><title>Solar Rooftop: +₹800/tCO₂e</title></rect>
          <rect x="300" y="50" width="30" height="40" rx="3" fill="#ef4444" opacity="0.75"><title>Biomass Boiler: +₹1,600/tCO₂e</title></rect>
          <rect x="340" y="30" width="30" height="60" rx="3" fill="#dc2626" opacity="0.65"><title>CCS Pilot: +₹2,400/tCO₂e</title></rect>
          {/* Zero line label */}
          <text x="383" y="87" className="text-[8px]" fill="#94a3b8">₹0</text>
        </svg>
      </div>
      {/* Top interventions list */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-vivid-green/5 rounded-xl border border-vivid-green/20">
          <div className="text-[10px] uppercase tracking-wider text-vivid-green font-bold mb-1">Saves Money</div>
          <div className="text-sm font-bold text-midnight">Heat Exchanger</div>
          <div className="text-xs text-steel font-mono">-₹2,200/tCO₂e · 18 mo payback</div>
        </div>
        <div className="p-3 bg-vivid-green/5 rounded-xl border border-vivid-green/20">
          <div className="text-[10px] uppercase tracking-wider text-vivid-green font-bold mb-1">Saves Money</div>
          <div className="text-sm font-bold text-midnight">Condensate Recovery</div>
          <div className="text-xs text-steel font-mono">-₹1,800/tCO₂e · 12 mo payback</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats row ─── */
function StatsRow() {
  const stats = [
    { value: "283 tCO₂e", label: "Average SME footprint measured" },
    { value: "42%", label: "Emissions from negative-cost actions" },
    { value: "< 5 min", label: "Time to generate BRSR report" },
    { value: "3 sectors", label: "Pre-calibrated cluster models" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((s) => (
        <div key={s.label} className="text-center p-6 bg-canvas rounded-2xl border border-ash/60">
          <div className="text-2xl sm:text-3xl font-bold text-midnight mb-1">{s.value}</div>
          <div className="text-sm text-steel leading-snug">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-charcoal font-sans selection:bg-electric-blue/10 selection:text-electric-blue">
      {/* ──── Navigation ──── */}
      <AppHeader />

      {/* ──── Hero: left text + right chart ──── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-canvas via-canvas to-paper/60">
        {/* very subtle mesh — just enough to not be flat white */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-electric-blue/[0.03] rounded-full blur-[100px] pointer-events-none translate-x-1/4 -translate-y-1/4" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left column — editorial copy */}
            <div className="flex-1 max-w-xl">
              <p className="text-sm font-medium text-electric-blue mb-5 tracking-wide">
                Carbon intelligence for Indian SMEs
              </p>
              <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-midnight leading-[1.1] mb-6">
                Turn utility bills into a decarbonization roadmap
              </h1>
              <p className="text-lg text-steel leading-relaxed mb-8 max-w-md">
                CarbonIQ disaggregates aggregate energy data into unit-process hotspots, builds Marginal Abatement Cost Curves, and generates audit-ready BRSR & CBAM disclosures — so your facility can cut emissions and win export contracts.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-lg bg-electric-blue hover:bg-deep-sapphire text-canvas text-sm font-semibold transition-colors shadow-sm"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-lg bg-canvas border border-ash hover:border-charcoal text-charcoal text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right column — product chart mockup */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <div className="bg-canvas border border-ash/60 rounded-2xl shadow-xl p-6 sm:p-8 relative">
                {/* Slight tilt for depth */}
                <div className="absolute -inset-3 bg-gradient-to-br from-electric-blue/[0.04] to-lavender/[0.04] rounded-3xl -z-10 rotate-1" />

                <div className="text-sm font-semibold text-midnight mb-1">Scope 1 + 2 target</div>
                <div className="text-xs text-steel mb-5">Surat Textile Mill · FY 2025–2032</div>

                {/* Line chart SVG */}
                <svg viewBox="0 0 400 200" className="w-full" aria-label="Emission reduction target chart">
                  {/* Grid */}
                  <line x1="50" y1="20" x2="50" y2="170" stroke="#e5e7eb" strokeWidth="0.5" />
                  <line x1="50" y1="170" x2="380" y2="170" stroke="#e5e7eb" strokeWidth="0.5" />
                  {[40, 70, 100, 130, 160].map((y) => (
                    <line key={y} x1="50" y1={y} x2="380" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
                  ))}
                  {/* Y labels */}
                  <text x="44" y="44" textAnchor="end" fill="#94a3b8" fontSize="9">800</text>
                  <text x="44" y="74" textAnchor="end" fill="#94a3b8" fontSize="9">600</text>
                  <text x="44" y="104" textAnchor="end" fill="#94a3b8" fontSize="9">400</text>
                  <text x="44" y="134" textAnchor="end" fill="#94a3b8" fontSize="9">200</text>
                  <text x="44" y="173" textAnchor="end" fill="#94a3b8" fontSize="9">0</text>
                  {/* X labels */}
                  {["2025", "2027", "2029", "2031"].map((yr, i) => (
                    <text key={yr} x={80 + i * 95} y="188" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">{yr}</text>
                  ))}

                  {/* Historical line — dark, solid (Emissions rising slightly) */}
                  <polyline
                    points="80,85 127,80 175,74"
                    fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {/* circles on historical */}
                  <circle cx="80" cy="85" r="3" fill="#0f172a" />
                  <circle cx="127" cy="80" r="3" fill="#0f172a" />
                  <circle cx="175" cy="74" r="3" fill="#0f172a" />

                  {/* Forecast BAU — gray, dashed (Emissions continue rising) */}
                  <polyline
                    points="175,74 222,65 270,56 317,47 365,38"
                    fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round"
                  />
                  {[222, 270, 317, 365].map((x, i) => (
                    <circle key={x} cx={x} cy={[65, 56, 47, 38][i]} r="2.5" fill="#94a3b8" />
                  ))}

                  {/* SBT requirement — green line (Steady reduction) */}
                  <polyline
                    points="175,74 222,85 270,96 317,107 365,118"
                    fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {[222, 270, 317, 365].map((x, i) => (
                    <circle key={`g${x}`} cx={x} cy={[85, 96, 107, 118][i]} r="2.5" fill="#16a34a" />
                  ))}

                  {/* Your target — blue line (Aggressive reduction) */}
                  <polyline
                    points="175,74 222,90 270,106 317,122 365,138"
                    fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {[222, 270, 317, 365].map((x, i) => (
                    <circle key={`b${x}`} cx={x} cy={[90, 106, 122, 138][i]} r="3" fill="#2563eb" />
                  ))}

                  {/* With interventions — light blue, filled area hint (Realistic path) */}
                  <polyline
                    points="175,74 222,88 270,102 317,116 365,130"
                    fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />

                  {/* Dashed vertical line at "now" */}
                  <line x1="175" y1="30" x2="175" y2="170" stroke="#0f172a" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.3" />
                </svg>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                  {[
                    { color: "#0f172a", label: "Historical" },
                    { color: "#94a3b8", label: "Forecast" },
                    { color: "#16a34a", label: "SBT requirement" },
                    { color: "#2563eb", label: "Your target" },
                    { color: "#93c5fd", label: "With interventions" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-charcoal">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── MEASURE / REPORT / ACT ──────────── */}
      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-midnight mb-6">
              A single platform to run your sustainability program.
            </h2>
            <p className="text-lg text-steel leading-relaxed">
              CarbonIQ takes you from messy utility bills to board-ready ESG reports
              and actionable capital allocation strategies — in days, not months.
            </p>
          </div>

          <div className="space-y-28">
            {/* ── MEASURE ── */}
            <div className="flex flex-col lg:flex-row items-stretch gap-12 lg:gap-16">
              {/* Visual card */}
              <div className="flex-1 order-2 lg:order-1">
                <div className="bg-canvas border border-ash/70 rounded-2xl shadow-lg overflow-hidden h-full flex">
                  {/* Left sidebar accent like Watershed */}
                  <div className="w-10 shrink-0 bg-gradient-to-b from-midnight to-electric-blue/80 flex flex-col items-center pt-5 gap-4">
                    <div className="w-6 h-6 rounded-full border-2 border-canvas/30 flex items-center justify-center text-canvas text-[8px] font-bold">C</div>
                    <div className="w-4 h-px bg-canvas/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-canvas/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-canvas/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-canvas/20" />
                  </div>
                  <div className="flex-1 p-6">
                    <CarbonFootprintDashboard />
                  </div>
                </div>
              </div>
              {/* Text column */}
              <div className="flex-1 order-1 lg:order-2 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-electric-blue/5 border border-electric-blue/20 text-sm font-semibold text-electric-blue w-fit">
                  <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
                  Measure
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-midnight mb-6">
                  Build an audit-ready footprint in minutes.
                </h3>
                <p className="text-lg text-steel leading-relaxed mb-6">
                  Skip expensive IoT sub-meters. CarbonIQ ingests raw energy bills and
                  uses sector-calibrated clustering algorithms to disaggregate totals into
                  precise unit-process hotspots — showing you exactly where emissions
                  originate.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-electric-blue shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Supports 15+ Indian SME clusters including Textile, Foundry, and Food Processing</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-electric-blue shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Calibrated to CEA v20.0 grid emission factor (0.7117 tCO₂/MWh)</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-electric-blue shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Pareto-ranked hotspots identify the top 20% of processes causing 80% of emissions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ── REPORT ── */}
            <div className="flex flex-col lg:flex-row items-stretch gap-12 lg:gap-16">
              {/* Text column */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-tangerine/5 border border-tangerine/20 text-sm font-semibold text-tangerine w-fit">
                  <span className="w-2 h-2 rounded-full bg-tangerine animate-pulse" />
                  Report
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-midnight mb-6">
                  Share your progress with confidence.
                </h3>
                <p className="text-lg text-steel leading-relaxed mb-6">
                  Export audit-ready disclosures in one click. Whether you need SEBI BRSR Core
                  Principle 6 reports for Indian regulators, or CBAM declarations for EU export
                  clients, CarbonIQ generates perfectly formatted PDFs with full data traceability.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-tangerine shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">SEBI BRSR Core Principle 6 environmental disclosures</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-tangerine shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">EU CBAM quarterly export declarations</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-tangerine shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Full audit trail with emission factor citations and methodology notes</span>
                  </li>
                </ul>
              </div>
              {/* Visual card */}
              <div className="flex-1">
                <div className="bg-canvas border border-ash/70 rounded-2xl shadow-lg overflow-hidden h-full">
                  <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-ash/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] font-mono text-fog">CarbonIQ — Compliance Reports</span>
                  </div>
                  <div className="p-6">
                    <ReportPreviewMockup />
                  </div>
                </div>
              </div>
            </div>

            {/* ── ACT ── */}
            <div className="flex flex-col lg:flex-row items-stretch gap-12 lg:gap-16">
              {/* Visual card */}
              <div className="flex-1 order-2 lg:order-1">
                <div className="bg-canvas border border-ash/70 rounded-2xl shadow-lg overflow-hidden h-full">
                  <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-ash/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] font-mono text-fog">CarbonIQ — MACC Optimizer</span>
                  </div>
                  <div className="p-6">
                    <MACCCurveSVG />
                  </div>
                </div>
              </div>
              {/* Text column */}
              <div className="flex-1 order-1 lg:order-2 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-vivid-green/5 border border-vivid-green/20 text-sm font-semibold text-vivid-green w-fit">
                  <span className="w-2 h-2 rounded-full bg-vivid-green animate-pulse" />
                  Act
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-midnight mb-6">
                  Fund interventions that drive real ROI.
                </h3>
                <p className="text-lg text-steel leading-relaxed mb-6">
                  Measurement is only the beginning. CarbonIQ constructs a Marginal Abatement
                  Cost Curve (MACC) for your facility&apos;s hotspots, ranking 200+ circular
                  interventions by ₹/tCO₂e — so you invest where returns are highest.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-vivid-green shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Green bars = interventions that <strong>save money</strong> while cutting emissions</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-vivid-green shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Payback period, CAPEX, and annual savings calculated per intervention</span>
                  </li>
                  <li className="flex items-start gap-3 text-charcoal">
                    <CheckCircle2 className="w-5 h-5 text-vivid-green shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">Exportable for green finance applications and ESG investor pitches</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── TESTIMONIAL / SOCIAL PROOF ──────────── */}
      <section className="relative bg-midnight text-canvas overflow-hidden border-y border-midnight">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 h-[400px] w-[800px] rounded-full bg-electric-blue opacity-10 blur-[120px]"></div>

        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 py-24 sm:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-10 rounded-full bg-canvas/10 border border-canvas/20 text-xs font-mono text-canvas font-medium">
            Enterprise Grade
          </div>
          
          <Quote className="w-12 h-12 text-electric-blue/50 mb-8" />
          
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.2] mb-12 max-w-4xl">
            "CarbonIQ replaced our scattered spreadsheets with an automated platform. We generated our first BRSR report in days, not months."
          </h3>
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-canvas/10 flex items-center justify-center text-xl font-bold shadow-lg">
              AJ
            </div>
            <div>
              <div className="font-semibold text-lg">Arjun Jain</div>
              <div className="text-steel">Sustainability Director, Surat Textiles</div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── SECTOR CLUSTERS ──────────── */}
      <section className="py-20 bg-paper/40 border-y border-ash/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-midnight mb-4">
              Pre-calibrated for Indian SME clusters.
            </h2>
            <p className="text-lg text-steel leading-relaxed">
              Each sector model ships with BEE-benchmarked process splits, curated emission
              factors, and a library of proven interventions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Textile Dyeing & Processing",
                hub: "Surat & Tirupur",
                thermal: "70%",
                top: "Counter-current hot liquor heat exchanger",
                desc: "Steam boilers, dye baths, stenter dryers, ETP aeration.",
                color: "electric-blue",
              },
              {
                title: "Foundry & Metal Casting",
                hub: "Rajkot & Coimbatore",
                thermal: "80%",
                top: "Divided blast cupola conversion",
                desc: "Cupola furnaces, induction melting, sand conditioning.",
                color: "tangerine",
              },
              {
                title: "Food Processing & Agro-Dairy",
                hub: "Punjab & Maharashtra",
                thermal: "40%",
                top: "VFD on ammonia compressors",
                desc: "Pasteurizers, steam cookers, ammonia chillers, CIP systems.",
                color: "vivid-green",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="bg-canvas border border-ash/70 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-paper border border-ash text-[10px] font-mono text-charcoal font-semibold uppercase tracking-wider">
                    {s.hub}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md bg-${s.color}/10 text-xs font-mono text-${s.color} font-bold`}>
                    Thermal {s.thermal}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-midnight mb-2">{s.title}</h3>
                <p className="text-sm text-steel mb-auto leading-relaxed">{s.desc}</p>
                <div className="text-[11px] font-mono text-fog pt-4 mt-4 border-t border-ash/50">
                  <span className="font-semibold text-charcoal">Top Action:</span> {s.top}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── BOTTOM CTA ──────────── */}
      <section className="py-24 bg-midnight relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-electric-blue/20 via-midnight to-midnight pointer-events-none" />
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-canvas mb-6">
            Ready to decarbonize your supply chain?
          </h2>
          <p className="text-lg text-steel/80 mb-10 max-w-2xl mx-auto">
            Join forward-thinking Indian SME manufacturers already using CarbonIQ
            to future-proof operations and win global export contracts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-canvas text-midnight text-base font-bold shadow-lg hover:bg-paper hover:-translate-y-0.5 transition-all duration-300"
            >
              Get Started for Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-canvas/30 text-canvas/80 hover:text-canvas hover:border-canvas/60 text-base font-medium transition-all duration-300"
            >
              Sign In
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="border-t border-ash/20 bg-midnight py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-steel/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-charcoal flex items-center justify-center text-canvas font-bold text-[10px]">
              C
            </div>
            <span className="font-semibold text-canvas">CarbonIQ</span>
            <span className="mx-2">•</span>
            <span>HackOut&apos;26 Circular Carbon Ecosystem Track</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-canvas transition-colors">Privacy</a>
            <a href="#" className="hover:text-canvas transition-colors">Terms</a>
            <a href="#" className="hover:text-canvas transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
