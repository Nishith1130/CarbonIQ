"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { RunResponse } from "@/lib/types";
import { ScopeBreakdownPie } from "@/components/charts/ScopeBreakdownPie";
import { HotspotBar } from "@/components/charts/HotspotBar";
import {
  TrendingUp,
  Zap,
  Flame,
  AlertTriangle,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  Bot,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [run, setRun] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI State
  const [aiRecommendations, setAiRecommendations] = useState<any[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const generateAiRecommendations = async () => {
    setLoadingAi(true);
    try {
      const res = await apiClient<any>(`/runs/${runId}/recommend`, { method: "POST" });
      if (res.recommendations) {
        // Sort by rank across hotspots if needed, or just display as returned
        setAiRecommendations(res.recommendations);
      }
    } catch (err) {
      console.error("Failed to generate AI recommendations", err);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (!runId) return;

    apiClient<RunResponse>(`/runs/${runId}`)
      .then((data) => {
        setRun(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load run:", err);
        setError("Could not retrieve calculation run details.");
        setLoading(false);
      });
  }, [runId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Loading emission baseline & hotspot diagnostics...</span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-tangerine mx-auto" />
        <h3 className="font-semibold text-base text-midnight">Run Not Found</h3>
        <p className="text-xs text-steel">{error || "Could not find calculation run."}</p>
        <Link
          href="/entry"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-midnight text-canvas text-xs font-medium"
        >
          Create New Bill Entry
        </Link>
      </div>
    );
  }

  const topHotspot = run.hotspots?.[0];
  const totalEmissions = Number(run.totals?.total) || 0;
  const scope1 = Number(run.totals?.scope1) || 0;
  const scope2 = Number(run.totals?.scope2) || 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ash">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
            <span>Facility Baseline</span>
            <span>•</span>
            <span>Run ID: {run.id.slice(0, 8)}...</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
            Executive GHG Emission Footprint
          </h1>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-paper border border-ash rounded-pill text-xs font-medium">
          <span className="px-3 py-1 bg-canvas border border-ash rounded-pill text-midnight shadow-subtle">
            1. Baseline
          </span>
          <Link
            href={`/dashboard/${runId}/macc`}
            className="px-3 py-1 text-steel hover:text-midnight rounded-pill transition"
          >
            2. MACC Curve
          </Link>
          <Link
            href={`/dashboard/${runId}/report`}
            className="px-3 py-1 text-steel hover:text-midnight rounded-pill transition"
          >
            3. BRSR Report
          </Link>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Emissions */}
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium">Total GHG Footprint</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-paper border border-ash text-charcoal">
              tCO₂e
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-midnight">
            {totalEmissions.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1 flex items-center gap-1 font-mono">
            <span>CEA Grid v20.0 factor</span>
          </div>
        </div>

        {/* Scope 1 Direct */}
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-tangerine" />
              Scope 1 Direct
            </span>
            <span className="font-mono text-[10px] text-charcoal">
              {((scope1 / (totalEmissions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-midnight">
            {scope1.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Coal & Diesel Boilers
          </div>
        </div>

        {/* Scope 2 Electricity */}
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-electric-blue" />
              Scope 2 Purchased
            </span>
            <span className="font-mono text-[10px] text-charcoal">
              {((scope2 / (totalEmissions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-midnight">
            {scope2.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Grid Substation Power
          </div>
        </div>

        {/* Top Hotspot */}
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium">#1 Pareto Hotspot</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-tangerine/10 text-tangerine font-semibold">
              {Number(topHotspot?.share_pct || 0).toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-bold truncate text-midnight tracking-tight">
            {topHotspot?.unit_process_name || topHotspot?.unit_process?.replace("_", " ").toUpperCase() || "N/A"}
          </div>
          <div className="text-[11px] font-mono text-steel mt-1">
            {Number(topHotspot?.tCO2e || 0).toFixed(2)} tCO₂e contribution
          </div>
        </div>
      </div>

      {/* Two Column Layout: Donut on Left, Hotspots on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scope Breakdown Donut */}
        <div className="lg:col-span-5 bg-canvas border border-ash rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-midnight">
                GHG Protocol Scope Breakdown
              </h3>
              <span className="text-[11px] font-mono text-fog">ISO 14064-1</span>
            </div>
            <p className="text-xs text-steel mb-4">
              Direct combustion vs. purchased electricity vs. partial supply chain.
            </p>
          </div>

          <ScopeBreakdownPie totals={run.totals} />
        </div>

        {/* Pareto Top Hotspots */}
        <div className="lg:col-span-7 bg-canvas border border-ash rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-midnight">
                Pareto Unit-Process Hotspots
              </h3>
              <span className="text-[11px] font-mono text-fog">BEE Benchmark Split</span>
            </div>
            <p className="text-xs text-steel mb-4">
              Unit processes ranked by decarbonization priority and abatement potential.
            </p>
          </div>

          <HotspotBar hotspots={run.hotspots} />
        </div>
      </div>

      {/* AI RAG Recommendations Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-blue-600 mb-1">
              <Bot className="w-4 h-4" />
              <span>AI Strategic Insights</span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              Generate Contextual RAG Recommendations
            </h3>
            <p className="text-xs text-gray-600 mt-1 max-w-xl">
              Use our AI engine to retrieve domain-specific interventions tailored to your top hotspots. The LLM ranks options and provides rationale while keeping emissions deterministic.
            </p>
          </div>

          <button
            onClick={generateAiRecommendations}
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loadingAi ? "Analyzing Hotspots..." : "Generate Insights"}
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {aiRecommendations && aiRecommendations.length > 0 && (
          <div className="mt-5 space-y-3">
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {rec.rank}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
                      {rec.intervention_id.replace(/_/g, " ")}
                    </h4>
                    <p className="text-[13px] text-gray-700 leading-relaxed mb-2">
                      {rec.rationale}
                    </p>
                    <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Citation: {rec.source_citation}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Callout to MACC Abatement Curve */}
      <div className="p-5 bg-midnight rounded-xl text-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog mb-1">
            <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
            <span>Recommended Next Action</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-canvas">
            Explore Marginal Abatement Cost Curve (MACC)
          </h3>
          <p className="text-xs text-silver mt-0.5">
            Identify circular interventions that yield negative abatement costs (net cost savings and quick payback).
          </p>
        </div>

        <Link
          href={`/dashboard/${runId}/macc`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-canvas text-midnight hover:bg-paper text-sm font-medium transition"
        >
          <span>View MACC Interventions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
