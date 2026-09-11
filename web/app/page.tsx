import React from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Factory, Cpu, FileText } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
              C
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              Carbon<span className="text-emerald-400">IQ</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Docs: :8000/docs
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          HackOut'26 · Circular Carbon Ecosystem Track
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          SME Emission Detector & <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Circular Recommender
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Turn utility bills and sector context into ranked, verifiable circular actions with
          cost, payback, and regulator-ready reports.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/onboarding"
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            Launch Onboarding
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="http://localhost:8000/health"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium transition-all"
          >
            Backend Health Check
          </a>
        </div>

        {/* 6 MVP Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Factory className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">1. Sector Baseline Calculator</h3>
            <p className="text-xs text-slate-400 mt-1">Scope 1, 2 & partial 3 accounting with India-specific CEA v20.0 and IPCC factors.</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">2. Sector Process Templates</h3>
            <p className="text-xs text-slate-400 mt-1">BEE-aligned process maps for Textile Dyeing, Foundry, and Food Processing.</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">3. Hotspot Pareto Ranking</h3>
            <p className="text-xs text-slate-400 mt-1">Automatic Pareto sorting pinpointing the top-3 emissions unit-processes.</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">4. Circular Recommender</h3>
            <p className="text-xs text-slate-400 mt-1">RAG over curated interventions with LLM re-ranking; no number hallucination.</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">5. MACC Curve</h3>
            <p className="text-xs text-slate-400 mt-1">Marginal Abatement Cost Curve in ₹/tCO2e and payback years per action.</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">6. One-Click Report Export</h3>
            <p className="text-xs text-slate-400 mt-1">BRSR Core, CBAM data sheet, and buyer compliance questionnaires.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        CarbonIQ · Locked MVP Architecture · Phase 1 Scaffold Active
      </footer>
    </main>
  );
}
