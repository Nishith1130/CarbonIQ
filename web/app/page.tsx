import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Factory,
  BarChart3,
  TrendingDown,
  FileCheck2,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-charcoal flex flex-col justify-between selection:bg-electric-blue/10 selection:text-electric-blue font-sans">
      {/* Editorial Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-canvas/90 backdrop-blur border-b border-ash">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-midnight flex items-center justify-center text-canvas font-bold text-sm tracking-tight group-hover:bg-electric-blue transition-colors">
                C
              </div>
              <span className="font-semibold text-base tracking-tight text-midnight">
                Carbon<span className="text-electric-blue">IQ</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-pill bg-paper border border-ash text-[11px] font-mono text-steel">
              HackOut&apos;26 • Circular Carbon Track
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-steel hover:text-midnight hidden md:inline-block"
            >
              API Docs :8000/docs
            </a>
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs text-steel hover:text-midnight transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-xs font-medium transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        {/* Floating Feature Pills (Dub / Linear signature) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border border-ash text-xs text-charcoal font-medium">
            <span className="w-2 h-2 rounded-full bg-tangerine"></span>
            <span>Pareto Hotspot Ranker</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border border-ash text-xs text-charcoal font-medium">
            <span className="w-2 h-2 rounded-full bg-vivid-green"></span>
            <span>Negative-Cost MACC Curves</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border border-ash text-xs text-charcoal font-medium">
            <span className="w-2 h-2 rounded-full bg-electric-blue"></span>
            <span>BEE SME Benchmark Splits</span>
          </div>
        </div>

        {/* Display Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-midnight max-w-4xl mx-auto leading-[1.08]">
          Decarbonize SME Industrial Facilities with Audit-Grade Precision.
        </h1>

        {/* Editorial Subheading */}
        <p className="mt-5 text-sm sm:text-base text-steel max-w-2xl mx-auto leading-relaxed">
          Transform aggregate utility bills and fuel receipts into unit-process emission hotspots, Marginal Abatement Cost Curves (MACC), and statutory SEBI BRSR Core disclosures.
        </p>

        {/* CTA Cluster */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition"
          >
            <span>Launch SME Facility Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-lg bg-canvas border border-ash hover:border-smoke hover:bg-paper text-charcoal text-sm font-medium transition"
          >
            Explore Sector Taxonomies
          </Link>
        </div>

        {/* Regulatory Badge */}
        <div className="mt-10 inline-flex items-center gap-2 text-xs font-mono text-fog">
          <ShieldCheck className="w-4 h-4 text-vivid-green" />
          <span>Calibrated to CEA v20.0 (0.7117 tCO₂/MWh) • Bureau of Energy Efficiency</span>
        </div>
      </section>

      {/* 4-Step Technical Workflow Showcase */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 border-t border-ash">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-mono text-fog uppercase tracking-wider block mb-1">
            Engineered for Industrial Decarbonization
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-midnight">
            From Raw Energy Bills to Green Capex Allocation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-canvas border border-ash rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-paper border border-ash flex items-center justify-center text-midnight mb-3 text-xs font-mono font-semibold">
              01
            </div>
            <h3 className="font-semibold text-sm text-midnight mb-1">
              Monthly Bill Ingestion
            </h3>
            <p className="text-xs text-steel leading-relaxed">
              Enter electricity kWh, boiler coal kg, and generator diesel litres without requiring expensive sub-metering hardware.
            </p>
          </div>

          <div className="p-5 bg-canvas border border-ash rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-paper border border-ash flex items-center justify-center text-midnight mb-3 text-xs font-mono font-semibold">
              02
            </div>
            <h3 className="font-semibold text-sm text-midnight mb-1">
              BEE Process Split
            </h3>
            <p className="text-xs text-steel leading-relaxed">
              Cluster-calibrated algorithms disaggregate facility totals into unit processes (e.g. Dyeing Bath 65.1%, ETP 16.2%).
            </p>
          </div>

          <div className="p-5 bg-canvas border border-ash rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-paper border border-ash flex items-center justify-center text-midnight mb-3 text-xs font-mono font-semibold">
              03
            </div>
            <h3 className="font-semibold text-sm text-midnight mb-1">
              MACC Optimization
            </h3>
            <p className="text-xs text-steel leading-relaxed">
              Marginal Abatement Cost Curve ranks circular interventions by ₹/tCO₂e, identifying high-ROI actions with fast payback.
            </p>
          </div>

          <div className="p-5 bg-canvas border border-ash rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-paper border border-ash flex items-center justify-center text-midnight mb-3 text-xs font-mono font-semibold">
              04
            </div>
            <h3 className="font-semibold text-sm text-midnight mb-1">
              Audit-Ready PDF Export
            </h3>
            <p className="text-xs text-steel leading-relaxed">
              Generate 1-click SEBI BRSR Core Principle 6 environmental disclosures and CBAM export declaration documents.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Supported Cluster Showcases */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 border-t border-ash">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-mono text-fog uppercase tracking-wider block mb-1">
              Pre-Calibrated Sector Models
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-midnight">
              Indian SME Industrial Clusters
            </h2>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-xs text-electric-blue hover:text-deep-sapphire font-medium"
          >
            <span>View All Taxonomies</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-canvas border border-ash rounded-xl p-5 hover:border-smoke transition">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded-pill bg-paper border border-ash text-[10px] font-mono text-steel">
                Surat & Tirupur Hubs
              </span>
              <span className="text-xs font-mono text-tangerine font-semibold">
                Thermal 70%
              </span>
            </div>
            <h3 className="font-semibold text-base text-midnight mb-1">
              Textile Dyeing & Processing
            </h3>
            <p className="text-xs text-steel mb-4">
              Steam boilers, hot dye liquor baths, stenter drying chambers, and effluent treatment aeration plants.
            </p>
            <div className="text-[11px] font-mono text-fog pt-3 border-t border-ash">
              Top Action: Counter-current hot liquor heat exchanger
            </div>
          </div>

          <div className="bg-canvas border border-ash rounded-xl p-5 hover:border-smoke transition">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded-pill bg-paper border border-ash text-[10px] font-mono text-steel">
                Rajkot & Coimbatore Hubs
              </span>
              <span className="text-xs font-mono text-tangerine font-semibold">
                Thermal 80%
              </span>
            </div>
            <h3 className="font-semibold text-base text-midnight mb-1">
              Foundry & Metal Casting
            </h3>
            <p className="text-xs text-steel mb-4">
              Divided blast cupola furnaces, induction melting crucibles, sand conditioning, and knock-out operations.
            </p>
            <div className="text-[11px] font-mono text-fog pt-3 border-t border-ash">
              Top Action: Divided blast cupola conversion & waste heat recuperator
            </div>
          </div>

          <div className="bg-canvas border border-ash rounded-xl p-5 hover:border-smoke transition">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded-pill bg-paper border border-ash text-[10px] font-mono text-steel">
                Punjab & Maharashtra Agro-Belts
              </span>
              <span className="text-xs font-mono text-electric-blue font-semibold">
                Electric 40%
              </span>
            </div>
            <h3 className="font-semibold text-base text-midnight mb-1">
              Food Processing & Agro-Dairy
            </h3>
            <p className="text-xs text-steel mb-4">
              Industrial pasteurizers, high-pressure steam cookers, ammonia chilling compressors, and clean-in-place (CIP).
            </p>
            <div className="text-[11px] font-mono text-fog pt-3 border-t border-ash">
              Top Action: VFD on ammonia compressors & condensate recovery
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ash py-6 bg-paper/30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-steel">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-midnight">CarbonIQ</span>
            <span>•</span>
            <span>HackOut&apos;26 Circular Carbon Ecosystem Track</span>
          </div>
          <div className="font-mono text-fog text-[11px]">
            Zero-hallucination deterministic carbon accounting
          </div>
        </div>
      </footer>
    </div>
  );
}
