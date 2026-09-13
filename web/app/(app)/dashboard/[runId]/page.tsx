"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  ArrowLeft,
  Download,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  TrendingDown,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = params.runId as string;
  const isFresh = searchParams.get("fresh") === "1";

  const [run, setRun] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-4">
      {/* Compact header with sibling-page actions on the right */}
      <div className="pb-2 border-b border-ash flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-fog uppercase tracking-wider mb-0.5">
            <span>Facility Baseline</span>
            <span>•</span>
            <span>Run {run.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-midnight">
            Executive GHG Emission Footprint
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/${runId}/macc${isFresh ? "?fresh=1" : ""}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ash text-midnight hover:bg-paper text-[13px] font-medium transition-colors whitespace-nowrap"
          >
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            View MACC Interventions
          </Link>

          <Link
            href={`/dashboard/${runId}/report`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors shadow-sm whitespace-nowrap ${
              isFresh
                ? "bg-midnight hover:bg-charcoal text-canvas"
                : "border border-ash text-midnight hover:bg-paper font-medium"
            }`}
          >
            {isFresh ? (
              <>
                Generate BRSR Report
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                View BRSR Report
              </>
            )}
          </Link>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Emissions */}
        <div className="bg-canvas border border-ash rounded-xl p-3 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium">Total GHG Footprint</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-paper border border-ash text-charcoal">
              tCO₂e
            </span>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-midnight tabular-nums">
            {totalEmissions.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1 flex items-center gap-1 font-mono">
            <span>CEA Grid v20.0 factor</span>
          </div>
        </div>

        {/* Scope 1 Direct */}
        <div className="bg-canvas border border-ash rounded-xl p-3 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-tangerine" />
              Scope 1 Direct
            </span>
            <span className="font-mono text-[10px] text-charcoal">
              {((scope1 / (totalEmissions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-midnight tabular-nums">
            {scope1.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Coal & Diesel Boilers
          </div>
        </div>

        {/* Scope 2 Electricity */}
        <div className="bg-canvas border border-ash rounded-xl p-3 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1.5">
            <span className="font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-electric-blue" />
              Scope 2 Purchased
            </span>
            <span className="font-mono text-[10px] text-charcoal">
              {((scope2 / (totalEmissions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-midnight tabular-nums">
            {scope2.toFixed(2)}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Grid Substation Power
          </div>
        </div>

        {/* Top Hotspot */}
        <div className="bg-canvas border border-ash rounded-xl p-3 transition hover:border-smoke">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Scope Breakdown Donut */}
        <div className="lg:col-span-5 bg-canvas border border-ash rounded-xl p-3 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-midnight">
              GHG Protocol Scope Breakdown
            </h3>
            <span className="text-[11px] font-mono text-fog">ISO 14064-1</span>
          </div>
          <ScopeBreakdownPie totals={run.totals} />
        </div>

        {/* Pareto Top Hotspots */}
        <div className="lg:col-span-7 bg-canvas border border-ash rounded-xl p-3 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-midnight">
              Pareto Unit-Process Hotspots
            </h3>
            <span className="text-[11px] font-mono text-fog">BEE Benchmark Split</span>
          </div>
          <HotspotBar hotspots={run.hotspots} />
        </div>
      </div>

    </div>
  );
}
