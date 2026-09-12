"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiClient, API_BASE_URL } from "@/lib/api-client";
import { getSession, getToken } from "@/lib/auth";
import { ReportResponse, RunResponse, TokenResponse } from "@/lib/types";
import {
  Download,
  AlertCircle,
  Building2,
  Layers,
  Copy,
  Mail,
  Printer,
  ChevronDown,
  ShieldCheck,
  Clock,
  CheckCircle2,
  TrendingDown,
  BarChart3,
  Info,
  ArrowUpRight,
} from "lucide-react";

type ViewMode = "executive" | "full";

/* -------------------------------------------------------------------------- */
/*                            Verification tier map                           */
/* -------------------------------------------------------------------------- */

type VerificationTier = "none" | "self-declared" | "3rd-party pending" | "assured";

const TIER_CONFIG: Record<
  VerificationTier,
  {
    short: string;
    long: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
    icon: any;
    signatoryLine: (org: string) => string;
  }
> = {
  none: {
    short: "Draft",
    long: "Draft (Unverified)",
    chipBg: "bg-gray-100",
    chipText: "text-gray-700",
    chipBorder: "border-gray-200",
    icon: AlertCircle,
    signatoryLine: () => "Internal working draft — no sign-off",
  },
  "self-declared": {
    short: "Self-Declared",
    long: "Self-Declared under SEBI BRSR Core",
    chipBg: "bg-blue-50",
    chipText: "text-blue-800",
    chipBorder: "border-blue-200",
    icon: ShieldCheck,
    signatoryLine: (org) =>
      `Self-Certified by ${org || "Facility Management"} under BRSR Core self-declaration`,
  },
  "3rd-party pending": {
    short: "3rd-Party Pending",
    long: "3rd-Party Audit Pending (ISO 14064-3)",
    chipBg: "bg-amber-50",
    chipText: "text-amber-800",
    chipBorder: "border-amber-200",
    icon: Clock,
    signatoryLine: () =>
      "Under review by an accredited assurance body (ISO 14064-3)",
  },
  assured: {
    short: "Assured",
    long: "3rd-Party Reasonable Assurance (ISO 14064-3)",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-800",
    chipBorder: "border-emerald-200",
    icon: CheckCircle2,
    signatoryLine: () =>
      "Third-Party Assured (ISO 14064-3) — reasonable assurance certificate",
  },
};

/* -------------------------------------------------------------------------- */

interface ProfileBlock {
  fullName?: string;
  signatureTitle?: string;
  role?: string;
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = params.runId as string;

  const [run, setRun] = useState<RunResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [profile, setProfile] = useState<ProfileBlock>({});
  const [tier, setTier] = useState<VerificationTier>("self-declared");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Executive vs Full disclosure view mode (persisted in URL for share links)
  const initialView: ViewMode =
    (searchParams.get("view") as ViewMode) === "full" ? "full" : "executive";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  const switchView = (next: ViewMode) => {
    setViewMode(next);
    const q = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === "full") q.set("view", "full");
    else q.delete("view");
    router.replace(`?${q.toString()}`, { scroll: false });
  };

  // Report type dropdown (BRSR / CBAM etc.)
  const [reportType, setReportType] = useState("brsr_core");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(getSession());

    const savedTier = localStorage.getItem(
      "carboniq_verification_tier"
    ) as VerificationTier | null;
    if (savedTier && TIER_CONFIG[savedTier]) setTier(savedTier);

    const savedProfile = localStorage.getItem("carboniq_profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      apiClient<RunResponse>(`/runs/${runId}`),
      apiClient<ReportResponse>(`/runs/${runId}/report`, {
        method: "POST",
        body: JSON.stringify({ template_type: reportType }),
      }),
    ])
      .then(([runData, reportData]) => {
        setRun(runData);
        setReport(reportData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to generate or load report:", err);
        setError("Failed to generate regulatory report.");
        setLoading(false);
      });
  }, [runId, reportType]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setTypeMenuOpen(false);
      }
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const sectorDisplay = useMemo(() => {
    if (!run) return "";
    return run.sector_id
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }, [run]);

  const periodLabel = useMemo(() => {
    if (!run?.period_start || !run?.period_end) return "Reporting period";
    const s = new Date(run.period_start);
    const e = new Date(run.period_end);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    return `${fmt(s)} — ${fmt(e)}`;
  }, [run]);

  const fyLabel = useMemo(() => {
    if (!run?.period_start) return "";
    const start = new Date(run.period_start);
    const y = start.getFullYear();
    return start.getMonth() >= 3
      ? `FY ${y}-${String(y + 1).slice(2)}`
      : `FY ${y - 1}-${String(y).slice(2)}`;
  }, [run]);

  const totals = run?.totals;
  const totalTotal = Number(totals?.total || 0);
  const scope1 = Number(totals?.scope1 || 0);
  const scope2 = Number(totals?.scope2 || 0);
  const scope3 = Number(totals?.scope3_partial || 0);
  const pct = (v: number) => (totalTotal > 0 ? (v / totalTotal) * 100 : 0);

  // ---- actions ----
  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloading(true);
    setDownloadMenuOpen(false);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/reports/${report.id}`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to download PDF file.");
      const blob = await res.blob();
      const dl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `CarbonIQ_${reportType}_${runId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(dl);
    } catch (err: any) {
      console.error("PDF download error:", err);
      alert("Error downloading PDF report. Please check backend service.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Could not copy link");
    }
  };

  const handleSendEmail = () => {
    const subject = `BRSR Core Report — ${session?.org_name || "Facility"} · ${fyLabel}`;
    const body = `Please find our BRSR Core disclosure at:%0D%0A%0D%0A${window.location.href}%0D%0A%0D%0AReport ID: ${report?.id || "n/a"}%0D%0AGenerated: ${new Date().toISOString()}%0D%0AVerification: ${TIER_CONFIG[tier].long}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${body}`;
  };

  const handlePrint = () => window.print();

  // ---- loading / error ----
  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>
            Compiling audit-ready SEBI BRSR Core &amp; CBAM disclosure report...
          </span>
        </div>
      </div>
    );
  }

  if (error || !run || !report) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-semibold text-base text-gray-900">Report Error</h3>
        <p className="text-xs text-gray-500">
          {error || "Could not generate report."}
        </p>
        <Link
          href={`/dashboard/${runId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const TierIcon = TIER_CONFIG[tier].icon;
  const orgName = session?.org_name || "Surat Modern Dyeing Mills LLP";
  const signatoryName = profile.fullName || "Rajesh Mehta";
  const signatoryTitle = profile.signatureTitle || "Managing Partner";
  const generatedAt = new Date(report.generated_at || Date.now()).toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const hotspots = run.hotspots || [];
  const byProcess = run.baseline_by_process || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none">
      {/* ---------------------------------------------------------------- */}
      {/* Breadcrumb + Title                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <Link href="/dashboard" className="hover:text-gray-900">
            Facility
          </Link>
          <span>›</span>
          <Link href="/dashboard" className="hover:text-gray-900">
            Reports
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">BRSR Core · {fyLabel}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              BRSR Core Report — {fyLabel || "FY 2024-25"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{orgName}</span>
              <span>·</span>
              <span>{sectorDisplay}</span>
              <span>·</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TIER_CONFIG[tier].chipBg} ${TIER_CONFIG[tier].chipText} ${TIER_CONFIG[tier].chipBorder}`}
              >
                <TierIcon className="w-3 h-3" />
                {TIER_CONFIG[tier].short}
              </span>
              <span>·</span>
              <span className="font-mono text-xs">
                v1 · Ref {report.id.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* Executive / Full disclosure switch */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200 print:hidden">
            <button
              type="button"
              onClick={() => switchView("executive")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                viewMode === "executive"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              aria-pressed={viewMode === "executive"}
            >
              Executive
            </button>
            <button
              type="button"
              onClick={() => switchView("full")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                viewMode === "full"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              aria-pressed={viewMode === "full"}
            >
              Full disclosure
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Action toolbar                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Report type selector */}
          <div className="relative" ref={typeMenuRef}>
            <button
              type="button"
              onClick={() => setTypeMenuOpen((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Type
              </span>
              <span className="text-gray-900">
                {reportType === "brsr_core"
                  ? "BRSR Core"
                  : reportType === "cbam"
                  ? "CBAM Disclosure"
                  : reportType === "ghg_protocol"
                  ? "GHG Protocol"
                  : reportType}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  typeMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {typeMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-30">
                {[
                  { id: "brsr_core", label: "BRSR Core", desc: "SEBI Principle 6" },
                  {
                    id: "cbam",
                    label: "CBAM Disclosure",
                    desc: "EU exporter (roadmap)",
                    disabled: true,
                  },
                  {
                    id: "ghg_protocol",
                    label: "GHG Protocol",
                    desc: "Standalone (roadmap)",
                    disabled: true,
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={t.disabled}
                    onClick={() => {
                      setReportType(t.id);
                      setTypeMenuOpen(false);
                    }}
                    className={`w-full flex items-start justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      t.disabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{t.label}</div>
                      <div className="text-[11px] text-gray-500">{t.desc}</div>
                    </div>
                    {reportType === t.id && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-gray-500 tabular-nums">
            {periodLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <Copy className="w-3.5 h-3.5 text-gray-400" />
            {copied ? "Link copied" : "Share link"}
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            Email
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5 text-gray-400" />
            Print
          </button>

          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setDownloadMenuOpen((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-[13px] font-semibold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "Preparing..." : "Download"}
              <ChevronDown className="w-3 h-3" />
            </button>
            {downloadMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-30">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">
                      Download PDF
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Official audit-ready PDF · {(report.file_size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left text-gray-300 cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mt-0.5" />
                  <div>
                    <div className="text-[13px] font-semibold">
                      Export CSV
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Activity ledger · roadmap
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left text-gray-300 cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mt-0.5" />
                  <div>
                    <div className="text-[13px] font-semibold">
                      Export XLSX (auditor pack)
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Workbook · roadmap
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Document sheet                                                   */}
      {/* ---------------------------------------------------------------- */}
      <article className="bg-white border border-gray-200 rounded-2xl shadow-sm print:shadow-none print:border-0">
        {/* Document header ------------------------------------------------ */}
        <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Facility Carbon Accounting Statement
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                SEBI BRSR Core Principle 6 · Environmental Metrics
              </h2>
              <div className="text-sm text-gray-500 mt-1">
                Prepared under the GHG Protocol Corporate Standard, aligned with
                ISO 14064-1:2018.
              </div>
            </div>
            <div className="text-right space-y-0.5 flex-shrink-0">
              <div className="text-[11px] font-semibold text-gray-500">
                Emission Factor Version
              </div>
              <div className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                {run.ef_version}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Reporting entity ------------------------------------------- */}
        <Section number="1" title="Reporting Entity" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <KV label="Legal Entity">{orgName}</KV>
            <KV label="Sector">{sectorDisplay}</KV>
            <KV label="Reporting Period">{periodLabel}</KV>
            <KV label="Financial Year">{fyLabel || "—"}</KV>
            <KV label="Facility ID (Tenant)" mono>
              {run.org_id.slice(0, 8)}
            </KV>
            <KV label="Run Reference" mono>
              {run.id.slice(0, 8)}
            </KV>
            <KV label="Report Generated">{generatedAt}</KV>
            <KV label="Verification Tier">{TIER_CONFIG[tier].long}</KV>
          </div>
        </Section>

        {/* 2. Executive summary ------------------------------------------ */}
        <Section number="2" title="Executive Summary" icon={BarChart3}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI
              label="Total emissions"
              value={totalTotal.toFixed(2)}
              unit="tCO₂e"
            />
            <KPI
              label="Scope 1 (Direct)"
              value={scope1.toFixed(2)}
              unit="tCO₂e"
              tone="orange"
            />
            <KPI
              label="Scope 2 (Grid)"
              value={scope2.toFixed(2)}
              unit="tCO₂e"
              tone="blue"
            />
            <KPI
              label="Scope 3 (Partial)"
              value={scope3.toFixed(2)}
              unit="tCO₂e"
              tone="green"
              hint={scope3 === 0 ? "Categories 1, 4, 9 not disclosed" : undefined}
            />
          </div>
        </Section>

        {/* 3. GHG emissions summary -------------------------------------- */}
        <Section number="3" title="Greenhouse Gas Emissions Summary" icon={Layers}>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 font-semibold">Disclosure Parameter</th>
                  <th className="p-3 font-semibold">Scope</th>
                  <th className="p-3 font-semibold text-right">
                    Value (tCO₂e)
                  </th>
                  <th className="p-3 font-semibold text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <ScopeRow
                  label="Direct emissions from stationary combustion (boilers, DG)"
                  scope="Scope 1"
                  value={scope1}
                  share={pct(scope1)}
                />
                <ScopeRow
                  label="Indirect emissions from purchased grid electricity"
                  scope="Scope 2"
                  value={scope2}
                  share={pct(scope2)}
                />
                <ScopeRow
                  label="Value-chain emissions (partial — upstream materials, freight)"
                  scope="Scope 3 (Partial)"
                  value={scope3}
                  share={pct(scope3)}
                  faded={scope3 === 0}
                  fadedNote="Not disclosed in this release"
                />
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="p-3">Total gross greenhouse gas footprint</td>
                  <td className="p-3 text-xs text-gray-600">Scope 1 + 2 + 3</td>
                  <td className="p-3 text-right text-base tabular-nums">
                    {totalTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-xs tabular-nums">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Callout tone="info">
            Scope 2 accounting follows the location-based method under GHG
            Protocol. Grid emission factor: {run.ef_version} — CEA CO₂ Baseline
            Database v20.0 (0.7117 tCO₂/MWh).
          </Callout>
        </Section>

        {/* Executive-mode teaser: what's inside Full disclosure ---------- */}
        {viewMode === "executive" && (
          <section className="px-6 sm:px-10 py-5 border-b border-gray-100 print:hidden">
            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <div className="font-semibold text-gray-900 mb-0.5">
                    More detail available
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    Unit-process breakdown, top hotspots, energy footprint, water
                    &amp; waste placeholders, audit trail (Appendix A), and
                    methodology (Appendix B) — hidden in Executive view.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchView("full")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-[13px] font-semibold whitespace-nowrap"
              >
                View full disclosure
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* 4. Emissions by unit-process ---------------------------------- */}
        {viewMode === "full" && (
        <>
        <Section number="4" title="Emissions by Unit-Process" icon={Layers}>
          {byProcess.length === 0 ? (
            <Empty>No unit-process allocation recorded for this run.</Empty>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Unit process</th>
                    <th className="p-3 font-semibold text-right">tCO₂e</th>
                    <th className="p-3 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byProcess.map((p) => (
                    <tr key={p.unit_process}>
                      <td className="p-3 capitalize text-gray-800">
                        {(p.unit_process_name || p.unit_process).replace(
                          /_/g,
                          " "
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">
                        {Number(p.tCO2e).toFixed(2)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-gray-600">
                        {Number(p.share_pct || pct(Number(p.tCO2e))).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 5. Hotspots --------------------------------------------------- */}
        <Section number="5" title="Top Emission Hotspots" icon={TrendingDown}>
          {hotspots.length === 0 ? (
            <Empty>No hotspots identified in this run.</Empty>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold w-14">Rank</th>
                    <th className="p-3 font-semibold">Unit process</th>
                    <th className="p-3 font-semibold text-right">tCO₂e</th>
                    <th className="p-3 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hotspots.slice(0, 5).map((h) => (
                    <tr key={h.rank}>
                      <td className="p-3 font-bold text-gray-900">#{h.rank}</td>
                      <td className="p-3 capitalize text-gray-800">
                        {(h.unit_process_name || h.unit_process).replace(
                          /_/g,
                          " "
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">
                        {Number(h.tCO2e).toFixed(2)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-orange-600 font-semibold">
                        {Number(h.share_pct).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Full intervention roadmap available on the{" "}
            <Link
              href={`/dashboard/${runId}/macc`}
              className="text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5"
            >
              MACC page <ArrowUpRight className="w-3 h-3" />
            </Link>
            .
          </div>
        </Section>

        {/* 6. Energy footprint ------------------------------------------- */}
        <Section number="6" title="Energy Footprint" icon={Layers}>
          <Callout tone="warn">
            Energy footprint KPIs (total GJ, renewable share, fuel breakdown) are
            not computed in this MVP release. Roadmap: total_gj,
            renewable_share_pct, grid_kwh, fossil_gj, biomass_gj.
          </Callout>
        </Section>

        {/* 7. Water and waste -------------------------------------------- */}
        <Section number="7" title="Water and Waste" icon={Layers}>
          <Callout tone="warn">
            Water withdrawal, discharge and waste-to-landfill KPIs (BRSR Core
            Principles 6.2 and 6.4) are not disclosed in this MVP release. The
            buyer or auditor may request these separately.
          </Callout>
        </Section>

        {/* Appendix A — Audit trail -------------------------------------- */}
        <Section number="A" appendix title="Audit Trail" icon={ShieldCheck}>
          <p className="text-sm text-gray-600 mb-3">
            Every emission line above is computed as{" "}
            <em className="text-gray-900">activity × emission factor</em>. Below
            is the per-unit-process reconciliation. The full activity-level
            ledger (activity × quantity × factor × source) is embedded in the
            downloadable PDF for third-party reproduction.
          </p>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="p-2.5 font-semibold">Unit process</th>
                  <th className="p-2.5 font-semibold">Scope 1</th>
                  <th className="p-2.5 font-semibold">Scope 2</th>
                  <th className="p-2.5 font-semibold">Scope 3</th>
                  <th className="p-2.5 font-semibold text-right">Sub-total</th>
                  <th className="p-2.5 font-semibold">EF version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byProcess.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-gray-500 text-center">
                      No process-level breakdown available.
                    </td>
                  </tr>
                ) : (
                  byProcess.map((p) => (
                    <tr key={p.unit_process}>
                      <td className="p-2.5 capitalize text-gray-800">
                        {(p.unit_process_name || p.unit_process).replace(
                          /_/g,
                          " "
                        )}
                      </td>
                      <td className="p-2.5 tabular-nums text-gray-700">
                        {Number(p.scope1 || 0).toFixed(3)}
                      </td>
                      <td className="p-2.5 tabular-nums text-gray-700">
                        {Number(p.scope2 || 0).toFixed(3)}
                      </td>
                      <td className="p-2.5 tabular-nums text-gray-700">
                        {Number(p.scope3_partial || 0).toFixed(3)}
                      </td>
                      <td className="p-2.5 tabular-nums font-semibold text-gray-900 text-right">
                        {Number(p.tCO2e).toFixed(3)}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-gray-500">
                        {run.ef_version}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Appendix B — Methodology -------------------------------------- */}
        <Section number="B" appendix title="Methodology" icon={Info}>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li>
              <strong className="text-gray-900">Framework:</strong> GHG Protocol
              Corporate Standard (WRI &amp; WBCSD) with SEBI BRSR Core Principle
              6 alignment.
            </li>
            <li>
              <strong className="text-gray-900">Scope 2 accounting:</strong>{" "}
              Location-based, using the CEA all-India grid emission factor
              (0.7117 tCO₂/MWh, FY 2024-25).
            </li>
            <li>
              <strong className="text-gray-900">Global warming potentials:</strong>{" "}
              IPCC AR6 100-year values (CH₄ 28×, N₂O 265×).
            </li>
            <li>
              <strong className="text-gray-900">Emission factor sources:</strong>{" "}
              CEA CO₂ Baseline Database v20.0, IPCC AR6, India GHG Program, DEFRA
              2024, PPAC coal calorific values.
            </li>
            <li>
              <strong className="text-gray-900">Unit-process allocation:</strong>{" "}
              Sector-benchmark shares from BEE cluster audits (typical
              accuracy ±15-25% for process-level split; total accuracy ±5-8%).
            </li>
            <li>
              <strong className="text-gray-900">Reference data version:</strong>{" "}
              <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                {run.ef_version}
              </code>
              .
            </li>
            <li>
              <strong className="text-gray-900">Recommendation engine:</strong>{" "}
              Retrieval-augmented reasoning over a curated intervention library
              (BEE Technology Bank, TERI, CII manuals). Emission and cost
              calculations are deterministic; no ML predictions are used in the
              primary numbers.
            </li>
          </ul>
        </Section>
        </>
        )}

        {/* Signature block ----------------------------------------------- */}
        <div className="px-6 sm:px-10 py-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Certified by
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {signatoryName}
              </div>
              <div className="text-sm text-gray-700">{signatoryTitle}</div>
              <div className="text-xs text-gray-500 mt-0.5">{orgName}</div>
              <div className="text-xs text-gray-500 mt-2 italic">
                {TIER_CONFIG[tier].signatoryLine(orgName)}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-0.5">
              <div>Date: {generatedAt}</div>
              <div className="font-mono">
                Report ID: {report.id.slice(0, 8)}
              </div>
              <div className="font-mono">Run ID: {run.id.slice(0, 8)}</div>
            </div>
          </div>
        </div>
      </article>

      {/* Footer disclaimer */}
      <p className="text-[11px] text-gray-500 leading-relaxed px-1">
        This report is a first-pass disclosure prepared under the SEBI BRSR
        Core framework and is not a substitute for third-party limited or
        reasonable assurance. Ranges shown reflect published benchmark
        uncertainty and should be validated against local unit conditions before
        commercial commitment or regulatory filing.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Small helpers                               */
/* -------------------------------------------------------------------------- */

function Section({
  number,
  title,
  icon: Icon,
  appendix = false,
  children,
}: {
  number: string;
  title: string;
  icon?: any;
  appendix?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 sm:px-10 py-6 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold ${
            appendix
              ? "bg-indigo-50 text-indigo-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {number}
        </span>
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          {appendix ? `Appendix ${number} — ${title}` : title}
        </h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function KV({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm text-gray-900 ${
          mono ? "font-mono text-xs" : "font-medium"
        }`}
      >
        {children || "—"}
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  unit,
  tone,
  hint,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: "orange" | "blue" | "green";
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    orange: "border-orange-200 bg-orange-50/40",
    blue: "border-blue-200 bg-blue-50/40",
    green: "border-emerald-200 bg-emerald-50/40",
  };
  return (
    <div
      className={`p-3 rounded-xl border ${
        tone ? toneMap[tone] : "border-gray-200 bg-gray-50/40"
      }`}
    >
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-gray-900 tabular-nums">
          {value}
        </span>
        <span className="text-[11px] text-gray-500 font-medium">{unit}</span>
      </div>
      {hint && <div className="text-[10px] text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

function ScopeRow({
  label,
  scope,
  value,
  share,
  faded = false,
  fadedNote,
}: {
  label: string;
  scope: string;
  value: number;
  share: number;
  faded?: boolean;
  fadedNote?: string;
}) {
  return (
    <tr>
      <td className={`p-3 ${faded ? "text-gray-400" : "text-gray-900 font-medium"}`}>
        <div>{label}</div>
        {faded && fadedNote && (
          <div className="text-[11px] text-gray-400 italic mt-0.5">
            {fadedNote}
          </div>
        )}
      </td>
      <td className={`p-3 text-xs ${faded ? "text-gray-400" : "text-gray-600"}`}>
        {scope}
      </td>
      <td
        className={`p-3 text-right tabular-nums font-semibold ${
          faded ? "text-gray-400" : "text-gray-900"
        }`}
      >
        {value.toFixed(2)}
      </td>
      <td
        className={`p-3 text-right tabular-nums text-xs ${
          faded ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {share.toFixed(1)}%
      </td>
    </tr>
  );
}

function Callout({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-blue-50 border-blue-200 text-blue-900";
  return (
    <div
      className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${cls}`}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-500 text-center">
      {children}
    </div>
  );
}
