"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { RunResponse, TokenResponse } from "@/lib/types";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Search,
  Plus,
} from "lucide-react";

const PAGE_SIZE = 4;

type VerificationTier = "none" | "self-declared" | "3rd-party pending" | "assured";

const TIER_CONFIG: Record<
  VerificationTier,
  { short: string; chipBg: string; chipText: string; chipBorder: string; icon: any }
> = {
  none: {
    short: "Draft",
    chipBg: "bg-gray-100",
    chipText: "text-gray-700",
    chipBorder: "border-gray-200",
    icon: AlertCircle,
  },
  "self-declared": {
    short: "Self-Declared",
    chipBg: "bg-blue-50",
    chipText: "text-blue-800",
    chipBorder: "border-blue-200",
    icon: ShieldCheck,
  },
  "3rd-party pending": {
    short: "3rd-Party Pending",
    chipBg: "bg-amber-50",
    chipText: "text-amber-800",
    chipBorder: "border-amber-200",
    icon: Clock,
  },
  assured: {
    short: "Assured",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-800",
    chipBorder: "border-emerald-200",
    icon: CheckCircle2,
  },
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fyOfDate(iso?: string | null): string {
  if (!iso) return "Unknown period";
  const d = new Date(iso);
  const y = d.getFullYear();
  return d.getMonth() >= 3
    ? `FY ${y}-${String(y + 1).slice(2)}`
    : `FY ${y - 1}-${String(y).slice(2)}`;
}

function formatPeriod(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startLabel = `${MONTH_SHORT[s.getMonth()]} ${sameYear ? "" : s.getFullYear()}`.trim();
  const endLabel = `${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  return `${startLabel} — ${endLabel}`;
}

function periodMonthDurationDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

export default function ReportsListPage() {
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<VerificationTier>("self-declared");

  const [search, setSearch] = useState("");
  const [fyFilter, setFyFilter] = useState<string>("all");
  const [fyMenuOpen, setFyMenuOpen] = useState(false);
  const fyMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the filter or search changes
  useEffect(() => {
    setPage(1);
  }, [search, fyFilter]);

  useEffect(() => {
    setSession(getSession());
    const savedTier = localStorage.getItem(
      "carboniq_verification_tier"
    ) as VerificationTier | null;
    if (savedTier && TIER_CONFIG[savedTier]) setTier(savedTier);

    apiClient<RunResponse[]>("/runs")
      .then((data) => {
        // sort by period_end descending, fallback to created_at
        const sorted = [...(data || [])].sort((a, b) => {
          const ax = a.period_end || a.created_at || "";
          const bx = b.period_end || b.created_at || "";
          return bx.localeCompare(ax);
        });
        setRuns(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load runs:", err);
        setError("Could not load reports.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (fyMenuRef.current && !fyMenuRef.current.contains(e.target as Node)) {
        setFyMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Build list of unique FYs from runs
  const fyOptions = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => set.add(fyOfDate(r.period_end || r.created_at)));
    return Array.from(set);
  }, [runs]);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const runFy = fyOfDate(r.period_end || r.created_at);
      if (fyFilter !== "all" && runFy !== fyFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          r.sector_id,
          r.id,
          r.period_start,
          r.period_end,
          runFy,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [runs, fyFilter, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedRuns = filteredRuns.slice(pageStart, pageEnd);

  // Group PAGED runs by FY for readability
  const grouped = useMemo(() => {
    const buckets: Record<string, RunResponse[]> = {};
    pagedRuns.forEach((r) => {
      const fy = fyOfDate(r.period_end || r.created_at);
      if (!buckets[fy]) buckets[fy] = [];
      buckets[fy].push(r);
    });
    return Object.entries(buckets); // [[fy, runs[]], ...]
  }, [pagedRuns]);

  const totalsForGroup = (list: RunResponse[]) => {
    return list.reduce(
      (acc, r) => ({
        scope1: acc.scope1 + Number(r.totals?.scope1 || 0),
        scope2: acc.scope2 + Number(r.totals?.scope2 || 0),
        scope3: acc.scope3 + Number(r.totals?.scope3_partial || 0),
        total: acc.total + Number(r.totals?.total || 0),
      }),
      { scope1: 0, scope2: 0, scope3: 0, total: 0 }
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header — single line, compact */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Click any row to open the full BRSR Core disclosure.
          </p>
        </div>
        <Link
          href="/entry"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-[13px] font-semibold shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New calculation
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
        {/* FY filter */}
        <div className="relative" ref={fyMenuRef}>
          <button
            type="button"
            onClick={() => setFyMenuOpen((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Period
            </span>
            <span className="text-gray-900">
              {fyFilter === "all" ? "All periods" : fyFilter}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                fyMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {fyMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-30">
              <button
                type="button"
                onClick={() => {
                  setFyFilter("all");
                  setFyMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] hover:bg-gray-50 ${
                  fyFilter === "all" ? "text-blue-700 font-semibold" : "text-gray-700"
                }`}
              >
                <span>All periods</span>
                {fyFilter === "all" && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </button>
              {fyOptions.map((fy) => (
                <button
                  key={fy}
                  type="button"
                  onClick={() => {
                    setFyFilter(fy);
                    setFyMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] hover:bg-gray-50 ${
                    fyFilter === fy ? "text-blue-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  <span>{fy}</span>
                  {fyFilter === fy && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by period, sector, or run ID"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <span className="text-xs text-gray-500 whitespace-nowrap">
          {filteredRuns.length}{" "}
          {filteredRuns.length === 1 ? "report" : "reports"}
        </span>
      </div>

      {/* States */}
      {loading && (
        <div className="py-16 text-center text-sm text-gray-500 flex justify-center items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Loading reports...
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="mt-4 text-center max-w-lg mx-auto py-16 px-6 border border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-5">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
            No reports yet
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Every time you log a month&apos;s utility bills, we generate a full
            BRSR Core disclosure. Log your first month to see it here.
          </p>
          <Link
            href="/entry"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-[13px] font-semibold"
          >
            <Plus className="w-4 h-4" />
            Log this month&apos;s data
          </Link>
        </div>
      )}

      {!loading && !error && runs.length > 0 && filteredRuns.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-2xl">
          No reports match this filter or search.
        </div>
      )}

      {/* Grouped list */}
      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(([fy, list]) => {
            const summary = totalsForGroup(list);
            const TierIcon = TIER_CONFIG[tier].icon;
            return (
              <section key={fy}>
                {/* FY group header — compact one-line */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                      {fy}
                    </h2>
                    <span className="text-[11px] text-gray-500">
                      {list.length} {list.length === 1 ? "report" : "reports"}{" "}
                      · {summary.total.toFixed(2)} tCO₂e
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-500 font-mono tabular-nums">
                    <span>S1 {summary.scope1.toFixed(1)}</span>
                    <span className="text-gray-300">·</span>
                    <span>S2 {summary.scope2.toFixed(1)}</span>
                    <span className="text-gray-300">·</span>
                    <span>S3 {summary.scope3.toFixed(1)}</span>
                  </div>
                </div>

                {/* Report cards */}
                <div className="space-y-1.5">
                  {list.map((r) => {
                    const days = periodMonthDurationDays(r.period_start, r.period_end);
                    const durationLabel =
                      days >= 350
                        ? "Annual"
                        : days >= 80
                        ? "Quarterly"
                        : days >= 25
                        ? "Monthly"
                        : `${days}d`;
                    const total = Number(r.totals?.total || 0);
                    const top = r.hotspots?.[0];
                    return (
                      <Link
                        key={r.id}
                        href={`/dashboard/${r.id}/report`}
                        className="group block bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
                      >
                        <div className="px-4 py-3 flex items-center gap-3">
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>

                          {/* Meta */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-[14px] font-semibold text-gray-900 truncate">
                                {formatPeriod(r.period_start, r.period_end)}
                              </div>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-50 border-gray-200 text-gray-600">
                                {durationLabel}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${TIER_CONFIG[tier].chipBg} ${TIER_CONFIG[tier].chipText} ${TIER_CONFIG[tier].chipBorder}`}
                              >
                                <TierIcon className="w-3 h-3" />
                                {TIER_CONFIG[tier].short}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
                              {top && (
                                <span className="inline-flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-gray-400" />
                                  <span className="capitalize text-gray-700">
                                    {(top.unit_process_name || top.unit_process)
                                      .replace(/_/g, " ")}
                                  </span>{" "}
                                  ({Number(top.share_pct || 0).toFixed(1)}%)
                                </span>
                              )}
                              <span className="font-mono tabular-nums">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-1 -mb-px" />
                                S1 {Number(r.totals?.scope1 || 0).toFixed(1)}
                                {"  "}
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mx-1 -mb-px" />
                                S2 {Number(r.totals?.scope2 || 0).toFixed(1)}
                                {"  "}
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mx-1 -mb-px" />
                                S3 {Number(r.totals?.scope3_partial || 0).toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Totals */}
                          <div className="hidden md:flex flex-col items-end min-w-[86px]">
                            <div className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                              {total.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-gray-500 uppercase tracking-wider">
                              tCO₂e total
                            </div>
                          </div>

                          {/* Chevron */}
                          <div className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-3">
              <div className="text-xs text-gray-500 tabular-nums">
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {pageStart + 1}–{Math.min(pageEnd, filteredRuns.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">
                  {filteredRuns.length}
                </span>{" "}
                reports
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-3 py-1.5 text-[13px] font-semibold text-gray-700 bg-gray-50 rounded-lg border border-gray-200 tabular-nums">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
