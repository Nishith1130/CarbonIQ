"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { RunResponse, TokenResponse } from "@/lib/types";
import {
  Factory,
  Plus,
  ArrowRight,
  TrendingDown,
  Calendar,
  Layers,
  FileText,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Zap,
  Flame,
} from "lucide-react";

export default function FacilityHubPage() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    apiClient<RunResponse[]>("/runs")
      .then((data) => {
        setRuns(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load facility runs:", err);
        setError("Could not load calculation history for this facility.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Loading facility workspace and calculation history...</span>
        </div>
      </div>
    );
  }

  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="space-y-8">
      {/* Facility Header Card */}
      <div className="bg-canvas border border-ash rounded-xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-paper border border-ash flex items-center justify-center text-midnight flex-shrink-0">
            <Factory className="w-6 h-6 text-graphite" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-midnight">
                {session?.org_name || "Industrial Facility Workspace"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-pill bg-paper border border-ash text-[10px] font-mono text-steel uppercase">
                {session?.sector_id ? session.sector_id.replace("_", " ") : "Textile Processing"}
              </span>
              <span className="px-2 py-0.5 rounded-pill bg-soft-mint text-vivid-green text-[10px] font-mono font-medium">
                Active Tenant
              </span>
            </div>
            <p className="text-xs text-steel">
              Multi-tenant isolated carbon accounting, Pareto unit-process detection, and SEBI BRSR compliance.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-fog">
              <span>Tenant ID: {session?.org_id ? session.org_id.slice(0, 8) : "demo"}...</span>
              <span>•</span>
              <span>Grid Factor: CEA v20.0 (0.7117 tCO₂/MWh)</span>
              <span>•</span>
              <span>Audit Scope: Scope 1, 2, partial 3</span>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          href="/entry"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-xs font-medium transition shadow-subtle flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Period Bills</span>
        </Link>
      </div>

      {/* If Runs Exist: Latest Run Spotlight Card */}
      {latestRun ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-midnight uppercase tracking-wider font-mono text-fog">
              Latest Verified Calculation Spotlight
            </h2>
            <span className="text-xs font-mono text-fog">
              Run ID: {latestRun.id.slice(0, 8)}...
            </span>
          </div>

          <div className="bg-canvas border border-ash rounded-xl p-5 shadow-subtle">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-ash">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-midnight">
                    Accounting Period:
                  </span>
                  <span className="text-xs font-mono text-steel">
                    {latestRun.period_start || "2024-04-01"} to {latestRun.period_end || "2025-03-31"}
                  </span>
                </div>
                <div className="text-3xl font-bold font-mono text-midnight tracking-tight mt-1">
                  {Number(latestRun.totals?.total || 0).toFixed(2)}{" "}
                  <span className="text-xs font-sans font-normal text-fog">tCO₂e Gross Footprint</span>
                </div>
              </div>

              {/* 3 Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/${latestRun.id}`}
                  className="px-3.5 py-2 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Full Dashboard</span>
                </Link>
                <Link
                  href={`/dashboard/${latestRun.id}/macc`}
                  className="px-3.5 py-2 rounded-lg bg-paper hover:bg-canvas border border-ash text-charcoal text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-vivid-green" />
                  <span>MACC Curve</span>
                </Link>
                <Link
                  href={`/dashboard/${latestRun.id}/report`}
                  className="px-3.5 py-2 rounded-lg bg-paper hover:bg-canvas border border-ash text-charcoal text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-electric-blue" />
                  <span>BRSR Report</span>
                </Link>
              </div>
            </div>

            {/* Quick 3-Tile Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
              <div className="p-3 rounded-lg bg-paper/50 border border-ash/60">
                <span className="text-fog block mb-0.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-tangerine" />
                  Scope 1 Direct (Combustion)
                </span>
                <span className="font-mono font-semibold text-midnight text-sm">
                  {Number(latestRun.totals?.scope1 || 0).toFixed(2)} tCO₂e
                </span>
              </div>

              <div className="p-3 rounded-lg bg-paper/50 border border-ash/60">
                <span className="text-fog block mb-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-electric-blue" />
                  Scope 2 Indirect (Grid Power)
                </span>
                <span className="font-mono font-semibold text-midnight text-sm">
                  {Number(latestRun.totals?.scope2 || 0).toFixed(2)} tCO₂e
                </span>
              </div>

              <div className="p-3 rounded-lg bg-paper/50 border border-ash/60">
                <span className="text-fog block mb-0.5">
                  #1 Unit Process Hotspot
                </span>
                <span className="font-medium text-midnight text-sm truncate block">
                  {latestRun.hotspots?.[0]?.unit_process_name || latestRun.hotspots?.[0]?.unit_process?.replace("_", " ").toUpperCase() || "N/A"}{" "}
                  <span className="font-mono font-semibold text-tangerine">
                    ({Number(latestRun.hotspots?.[0]?.share_pct || 0).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-canvas border border-dashed border-ash rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-paper border border-ash flex items-center justify-center text-midnight mx-auto">
            <Layers className="w-6 h-6 text-silver" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-semibold text-base text-midnight">
              No Calculation Runs Recorded Yet
            </h3>
            <p className="text-xs text-steel mt-1">
              Start by logging your monthly utility bills or use the 1-click Surat Textile Mill demo preset to calculate your baseline.
            </p>
          </div>
          <Link
            href="/entry"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-xs font-medium transition"
          >
            <span>Log Facility Utility Bills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Historical Runs Ledger Table */}
      {runs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-midnight">
              Facility Calculation Ledger ({runs.length} Runs Recorded)
            </h2>
            <span className="text-xs font-mono text-fog">
              ISO 14064-1 Audit Trail
            </span>
          </div>

          <div className="bg-canvas border border-ash rounded-xl overflow-hidden shadow-subtle">
            <table className="w-full text-xs text-left">
              <thead className="bg-paper border-b border-ash font-medium text-charcoal">
                <tr>
                  <th className="p-3 font-mono">Run ID</th>
                  <th className="p-3">Period</th>
                  <th className="p-3 text-right">Total (tCO₂e)</th>
                  <th className="p-3 text-right">Scope 1</th>
                  <th className="p-3 text-right">Scope 2</th>
                  <th className="p-3">Top Hotspot</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash">
                {runs.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-paper/40 transition">
                    <td className="p-3 font-mono text-steel">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="p-3 font-mono text-charcoal">
                      {r.period_start || "2024-04-01"} - {r.period_end || "2025-03-31"}
                    </td>
                    <td className="p-3 font-mono text-right font-semibold text-midnight">
                      {Number(r.totals?.total || 0).toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right text-steel">
                      {Number(r.totals?.scope1 || 0).toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right text-steel">
                      {Number(r.totals?.scope2 || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-charcoal">
                      <span className="font-medium">
                        {r.hotspots?.[0]?.unit_process_name || r.hotspots?.[0]?.unit_process?.replace("_", " ") || "N/A"}
                      </span>{" "}
                      <span className="text-[11px] font-mono text-fog">
                        ({Number(r.hotspots?.[0]?.share_pct || 0).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/${r.id}`}
                          className="px-2.5 py-1 rounded bg-paper border border-ash hover:border-smoke text-charcoal text-[11px] font-medium transition"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/${r.id}/macc`}
                          className="px-2.5 py-1 rounded bg-paper border border-ash hover:border-smoke text-vivid-green text-[11px] font-medium transition"
                        >
                          MACC
                        </Link>
                        <Link
                          href={`/dashboard/${r.id}/report`}
                          className="px-2.5 py-1 rounded bg-paper border border-ash hover:border-smoke text-electric-blue text-[11px] font-medium transition"
                        >
                          PDF
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
