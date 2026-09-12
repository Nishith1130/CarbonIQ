"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { RunResponse, TokenResponse } from "@/lib/types";
import {
  Factory,
  Plus,
  TrendingDown,
  Layers,
  FileText,
  BarChart3,
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
      .then((data: RunResponse[]) => {
        setRuns(data || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to load facility runs:", err);
        setError("Could not load calculation history for this facility.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-32 flex justify-center">
        <div className="flex items-center gap-3 text-gray-500 font-medium">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            {session?.org_name || "Facility Overview"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[15px] text-gray-500">
            <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-medium">
              <Factory className="w-4 h-4" />
              {session?.sector_id ? session.sector_id.replace("_", " ").toUpperCase() : "TEXTILE PROCESSING"}
            </span>
            <span>Tenant ID: <span className="font-mono text-gray-600">{session?.org_id?.slice(0, 8) || "demo"}</span></span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span className="hidden sm:inline">Grid: CEA v20.0</span>
          </div>
        </div>
        <Link
          href="/entry"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          <span>New Calculation</span>
        </Link>
      </div>

      {!latestRun ? (
        /* Empty State */
        <div className="mt-16 text-center max-w-lg mx-auto py-16 px-6">
          <div className="w-24 h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-8">
            <Layers className="w-12 h-12 text-[#2563EB]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">No calculations yet</h2>
          <p className="text-gray-500 text-[16px] leading-relaxed mb-10">
            You haven't run any carbon footprint calculations for this facility yet. Start by logging your monthly utility bills or use the demo preset to instantly see your baseline.
          </p>
          <Link
            href="/entry"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[16px] font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Start First Calculation</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Spotlight Card */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Verified Footprint</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    Period: {latestRun.period_start || "2024-04-01"} — {latestRun.period_end || "2025-03-31"}
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
                    {Number(latestRun.totals?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xl sm:text-2xl font-medium text-gray-400 ml-2">tCO₂e</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/dashboard/${latestRun.id}`}
                    className="px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>View Dashboard</span>
                  </Link>
                  <Link
                    href={`/dashboard/${latestRun.id}/macc`}
                    className="px-5 py-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[15px] font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                    <span>MACC Curve</span>
                  </Link>
                  <Link
                    href={`/dashboard/${latestRun.id}/report`}
                    className="px-5 py-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[15px] font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#2563EB]" />
                    <span>BRSR Report</span>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-2 text-sm font-medium">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Scope 1 (Direct)
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {Number(latestRun.totals?.scope1 || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-base text-gray-400 font-normal">tCO₂e</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-2 text-sm font-medium">
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    Scope 2 (Indirect)
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {Number(latestRun.totals?.scope2 || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-base text-gray-400 font-normal">tCO₂e</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-2 text-sm font-medium">
                    Top Unit Process Hotspot
                  </div>
                  <div className="text-xl font-semibold text-gray-900 truncate">
                    {latestRun.hotspots?.[0]?.unit_process_name || latestRun.hotspots?.[0]?.unit_process?.replace("_", " ").toUpperCase() || "N/A"}
                    {latestRun.hotspots?.[0] && (
                      <span className="text-orange-600 ml-2 text-lg">
                        {Number(latestRun.hotspots[0].share_pct || 0).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ledger Table */}
          {runs.length > 1 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Calculation Ledger</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-[15px] text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                    <tr>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4 text-right">Total (tCO₂e)</th>
                      <th className="px-6 py-4 text-right">Scope 1</th>
                      <th className="px-6 py-4 text-right">Scope 2</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {runs.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          {r.period_start?.slice(0,4)} - {r.period_end?.slice(0,4)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {Number(r.totals?.total || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {Number(r.totals?.scope1 || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {Number(r.totals?.scope2 || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/${r.id}`}
                            className="text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
