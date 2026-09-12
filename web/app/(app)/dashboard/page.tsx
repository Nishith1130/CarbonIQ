"use client";

import React, { useEffect, useState, useRef } from "react";
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
  ShieldCheck,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Check,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export type VerificationTier = "none" | "self-declared" | "3rd-party pending" | "assured";

interface VerificationConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: any;
  who: (orgName?: string) => string;
  desc: string;
}

const VERIFICATION_CONFIGS: Record<VerificationTier, VerificationConfig> = {
  none: {
    label: "Verified: None (Draft Entry)",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    badgeBorder: "border-gray-200",
    icon: AlertCircle,
    who: () => "Unverified (Internal Working Draft)",
    desc: "Preliminary activity data. Not formally signed off or certified.",
  },
  "self-declared": {
    label: "Verified: Self-Declared",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
    icon: ShieldCheck,
    who: (org) => `Self-Certified by ${org || "Facility Admin"} (Management Sign-Off)`,
    desc: "Formally submitted and signed off under SEBI BRSR Core self-declaration provisions.",
  },
  "3rd-party pending": {
    label: "Verified: 3rd-Party Audit Pending",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
    icon: Clock,
    who: () => "Submitted to Accredited Assurance Body (ISO 14064-3)",
    desc: "Documentation under review by an accredited auditor for CBAM / BRSR external assurance.",
  },
  assured: {
    label: "Verified: 3rd-Party Assured",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    icon: CheckCircle2,
    who: () => "Third-Party Assured (ISO 14064-3 / SEBI Reasonable Assurance)",
    desc: "Full external assurance certificate issued with verified evidence trail.",
  },
};

export default function FacilityHubPage() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification Tier State
  const [verificationTier, setVerificationTier] = useState<VerificationTier>("self-declared");
  const [isTierMenuOpen, setIsTierMenuOpen] = useState(false);
  const tierMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    // Load saved verification tier preference from localStorage if available
    const savedTier = localStorage.getItem("carboniq_verification_tier") as VerificationTier;
    if (savedTier && VERIFICATION_CONFIGS[savedTier]) {
      setVerificationTier(savedTier);
    }

    apiClient<RunResponse[]>("/runs")
      .then((data: RunResponse[]) => {
        setRuns(data || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to load facility runs:", err);
        setError("Could not load activity history for this facility.");
        setLoading(false);
      });
  }, []);

  // Handle click outside verification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tierMenuRef.current && !tierMenuRef.current.contains(event.target as Node)) {
        setIsTierMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTier = (tier: VerificationTier) => {
    setVerificationTier(tier);
    localStorage.setItem("carboniq_verification_tier", tier);
    setIsTierMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="py-32 flex justify-center">
        <div className="flex items-center gap-3 text-gray-500 font-medium">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Loading facility hub...</span>
        </div>
      </div>
    );
  }

  const latestRun = runs.length > 0 ? runs[0] : null;
  const currentTierConfig = VERIFICATION_CONFIGS[verificationTier];
  const TierIcon = currentTierConfig.icon;

  // --------------------------------------------------------------------------
  // FY aggregate — sum all runs whose period_end falls within the same FY as
  // the latest run. Indian FY runs April 1 → March 31.
  // --------------------------------------------------------------------------
  const fyOfDate = (iso?: string | null) => {
    if (!iso) return { label: "FY —", startYear: 0, endYear: 0 };
    const d = new Date(iso);
    const y = d.getFullYear();
    const startYear = d.getMonth() >= 3 ? y : y - 1;
    const endYear = startYear + 1;
    return {
      label: `FY ${startYear}-${String(endYear).slice(2)}`,
      startYear,
      endYear,
    };
  };

  const currentFy = fyOfDate(latestRun?.period_end || latestRun?.created_at);
  const fyStart = new Date(`${currentFy.startYear}-04-01`);
  const fyEnd = new Date(`${currentFy.endYear}-03-31`);

  const fyRuns = runs.filter((r) => {
    const end = new Date(r.period_end || r.created_at || "");
    return end >= fyStart && end <= fyEnd;
  });

  const fyAggregate = fyRuns.reduce(
    (acc, r) => ({
      scope1: acc.scope1 + Number(r.totals?.scope1 || 0),
      scope2: acc.scope2 + Number(r.totals?.scope2 || 0),
      scope3_partial: acc.scope3_partial + Number(r.totals?.scope3_partial || 0),
      total: acc.total + Number(r.totals?.total || 0),
    }),
    { scope1: 0, scope2: 0, scope3_partial: 0, total: 0 }
  );

  // Merge hotspots across all FY runs, ranking by summed tCO2e per unit_process.
  const hotspotMap: Record<string, { unit_process: string; unit_process_name?: string; tCO2e: number }> = {};
  fyRuns.forEach((r) => {
    (r.hotspots || []).forEach((h) => {
      const key = h.unit_process;
      if (!hotspotMap[key]) {
        hotspotMap[key] = {
          unit_process: h.unit_process,
          unit_process_name: h.unit_process_name,
          tCO2e: 0,
        };
      }
      hotspotMap[key].tCO2e += Number(h.tCO2e || 0);
    });
  });
  const rankedHotspots = Object.values(hotspotMap).sort((a, b) => b.tCO2e - a.tCO2e);
  const topHotspot = rankedHotspots[0];
  const topHotspotShare =
    topHotspot && fyAggregate.total > 0
      ? (topHotspot.tCO2e / fyAggregate.total) * 100
      : 0;

  const latestPeriodLabel = latestRun?.period_end
    ? new Date(latestRun.period_end).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  // Format verification timestamp (use run creation date or fallback)
  const verificationDate = latestRun?.created_at
    ? new Date(latestRun.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          {session?.org_name || "Surat Modern Dyeing Mills LLP"}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-ink-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Factory className="w-3 h-3" />
            Textile Dyeing
          </span>
          <span>·</span>
          <span>Reporting {currentFy.label}</span>
          <span>·</span>
          <span>
            {fyRuns.length} {fyRuns.length === 1 ? "submission" : "submissions"} · Latest {latestPeriodLabel}
          </span>
        </div>
      </div>

      {!latestRun ? (
        /* Empty State */
        <div className="mt-16 text-center max-w-lg mx-auto py-16 px-6">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Layers className="w-10 h-10 text-[#2563EB]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            No activity data logged yet
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
            You haven&apos;t logged any utility bills or production records for this facility yet.
            Start by logging this month&apos;s activity data to view your baseline footprint, MACC recommendations, and BRSR report.
          </p>
          <Link
            href="/entry"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>+ Log First Month&apos;s Data</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Spotlight Card: Facility GHG Inventory Overview */}
          <section>
            {/* Header with Verification Tier Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Facility GHG Footprint Inventory
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Calculated in accordance with GHG Protocol Corporate Standard &amp; ISO 14064-1
                </p>
              </div>

              {/* Interactive Verification Tier Selector */}
              <div className="relative" ref={tierMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTierMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${currentTierConfig.badgeBg} ${currentTierConfig.badgeText} ${currentTierConfig.badgeBorder} hover:brightness-95`}
                >
                  <TierIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{currentTierConfig.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isTierMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu to Choose Verification Tier */}
                {isTierMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-40 space-y-1 animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                      Select Verification &amp; Assurance Tier
                    </div>
                    {(Object.keys(VERIFICATION_CONFIGS) as VerificationTier[]).map((tierKey) => {
                      const tier = VERIFICATION_CONFIGS[tierKey];
                      const isSelected = verificationTier === tierKey;
                      const Icon = tier.icon;
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          onClick={() => handleSelectTier(tierKey)}
                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                            isSelected
                              ? "bg-blue-50/80 text-blue-900 font-medium"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold flex items-center justify-between">
                              <span>{tier.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </div>
                            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                              {tier.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Main Footprint Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm transition-all hover:border-gray-300">
              
              {/* Top Section: Period, Big Number & Actions — single line */}
              <div className="pb-6 border-b border-gray-100">
                {/* Period on its own line, above the big number */}
                <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>
                    {currentFy.label} · Running total across {fyRuns.length}{" "}
                    {fyRuns.length === 1 ? "submission" : "submissions"}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="tabular-nums">
                    Latest {latestPeriodLabel}:{" "}
                    {Number(latestRun.totals?.total || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    tCO₂e
                  </span>
                </div>

                {/* Big number + action buttons on ONE row */}
                <div className="flex items-center justify-between gap-4 flex-nowrap">
                  <div className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight flex items-baseline tabular-nums flex-shrink-0">
                    {fyAggregate.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    <span className="text-lg sm:text-xl font-medium text-gray-400 ml-2">tCO₂e</span>
                  </div>

                  <div className="flex items-center gap-2 flex-nowrap">
                    <Link
                      href={`/dashboard/${latestRun.id}`}
                      className="px-3.5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-gray-300" />
                      <span>View Full Breakdown</span>
                    </Link>

                    <Link
                      href={`/dashboard/${latestRun.id}/macc`}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Recommendations</span>
                    </Link>

                    <Link
                      href={`/dashboard/${latestRun.id}/report`}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>BRSR Report</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Middle Section: FY-aggregate Scopes & Top Hotspot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-b border-gray-100">
                <Link
                  href={`/dashboard/${latestRun.id}`}
                  className="group p-3 rounded-xl -m-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs font-semibold uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Scope 1 (Direct Fuels)
                  </div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {fyAggregate.scope1.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                    <span className="text-sm text-gray-400 font-normal">tCO₂e</span>
                  </div>
                </Link>

                <Link
                  href={`/dashboard/${latestRun.id}`}
                  className="group p-3 rounded-xl -m-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs font-semibold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-[#2563EB]" />
                    Scope 2 (Grid Power)
                  </div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {fyAggregate.scope2.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                    <span className="text-sm text-gray-400 font-normal">tCO₂e</span>
                  </div>
                </Link>

                <div className="p-3 -m-3">
                  <div className="text-gray-500 mb-1 text-xs font-semibold uppercase tracking-wider">
                    Top Unit Process Hotspot
                  </div>
                  <div className="text-lg font-bold text-gray-900 truncate capitalize">
                    {topHotspot
                      ? (topHotspot.unit_process_name || topHotspot.unit_process).replace(/_/g, " ")
                      : "N/A"}
                    {topHotspot && (
                      <span className="text-orange-600 ml-2 text-base font-semibold">
                        {topHotspotShare.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Audit Verification Metadata & Assurance Trail */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-700">Audit Status:</span>
                  <span>{currentTierConfig.who(session?.org_name)}</span>
                  <span className="text-gray-300">•</span>
                  <span>As of: {verificationDate}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SEBI BRSR Core • ISO 14064-1 Compliant</span>
                </div>
              </div>

            </div>
          </section>

          {/* Ledger moved to /reports — the dashboard now only shows the       */}
          {/* headline card; historical submissions live on the Reports page.  */}
          {runs.length > 1 && (
            <div className="text-xs text-gray-500 text-center">
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
              >
                View all {runs.length} historical reports
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
