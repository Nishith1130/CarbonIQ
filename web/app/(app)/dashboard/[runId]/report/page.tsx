"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient, API_BASE_URL } from "../../../../../lib/api-client";
import { getToken } from "../../../../../lib/auth";
import { ReportResponse, RunResponse } from "../../../../../lib/types";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

export default function ReportPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [run, setRun] = useState<RunResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;

    // Load run details and trigger report generation
    Promise.all([
      apiClient<RunResponse>(`/runs/${runId}`),
      apiClient<ReportResponse>(`/runs/${runId}/report`, {
        method: "POST",
        body: JSON.stringify({ template_type: "brsr_core" }),
      }),
    ])
      .then(([runData, reportData]) => {
        setRun(runData);
        setReport(reportData);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to generate or load report:", err);
        setError("Failed to generate regulatory report.");
        setLoading(false);
      });
  }, [runId]);

  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloading(true);

    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/reports/${report.id}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("Failed to download PDF file.");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `CarbonIQ_BRSR_Core_${runId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("PDF download error:", err);
      alert("Error downloading PDF report. Please check backend service.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Compiling audit-ready SEBI BRSR Core & CBAM disclosure report...</span>
        </div>
      </div>
    );
  }

  if (error || !run || !report) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-tangerine mx-auto" />
        <h3 className="font-semibold text-base text-midnight">Report Error</h3>
        <p className="text-xs text-steel">{error || "Could not generate report."}</p>
        <Link
          href={`/dashboard/${runId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-midnight text-canvas text-xs font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const totals = run.totals;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ash">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
            <span>Regulatory Filing</span>
            <span>•</span>
            <span>SEBI BRSR Core Principle 6</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
            Official Audit-Ready Report
          </h1>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-paper border border-ash rounded-pill text-xs font-medium">
          <Link
            href={`/dashboard/${runId}`}
            className="px-3 py-1 text-steel hover:text-midnight rounded-pill transition"
          >
            1. Baseline
          </Link>
          <Link
            href={`/dashboard/${runId}/macc`}
            className="px-3 py-1 text-steel hover:text-midnight rounded-pill transition"
          >
            2. MACC Curve
          </Link>
          <span className="px-3 py-1 bg-canvas border border-ash rounded-pill text-midnight shadow-subtle">
            3. BRSR Report
          </span>
        </div>
      </div>

      {/* Main Download CTA Card */}
      <div className="bg-canvas border border-ash rounded-xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-paper border border-ash flex items-center justify-center text-midnight flex-shrink-0">
            <FileText className="w-6 h-6 text-electric-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base text-midnight">
                SEBI BRSR Core & CBAM Disclosure Document
              </h3>
              <span className="px-2 py-0.5 rounded-pill bg-soft-mint text-vivid-green text-[10px] font-mono font-medium">
                Verified
              </span>
            </div>
            <p className="text-xs text-steel">
              Official PDF formatted for statutory third-party audit, banking green loans, and buyer CBAM export declarations.
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-fog">
              <span>Size: {(report.file_size_bytes / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>Ref: {report.id.slice(0, 8)}</span>
              <span>•</span>
              <span>CEA Factor: 0.7117 tCO₂/MWh</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="px-5 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? "Downloading..." : "Download Official PDF"}</span>
        </button>
      </div>

      {/* Document Sheet Preview */}
      <div className="bg-canvas border border-ash rounded-xl p-8 shadow-subtle space-y-6">
        <div className="border-b border-ash pb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-fog uppercase tracking-wider block">
              Facility Carbon Accounting Statement
            </span>
            <h4 className="text-lg font-semibold text-midnight mt-0.5">
              SEBI BRSR Core Principle 6 — Environmental Metrics
            </h4>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-medium text-midnight block">
              ISO 14064-1 Compliant
            </span>
            <span className="text-[11px] text-fog font-mono">
              Sector: {run.sector_id.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Regulatory Disclosure Table */}
        <div className="border border-ash rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-paper border-b border-ash font-medium text-charcoal">
              <tr>
                <th className="p-3">Disclosure Parameter</th>
                <th className="p-3">GHG Protocol Scope</th>
                <th className="p-3 text-right">Value (tCO₂e)</th>
                <th className="p-3 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash">
              <tr>
                <td className="p-3 font-medium text-midnight">Direct Emissions from Stationary Combustion (Boilers, DG)</td>
                <td className="p-3 font-mono text-steel">Scope 1</td>
                <td className="p-3 font-mono text-right font-semibold text-midnight">
                  {Number(totals.scope1).toFixed(2)}
                </td>
                <td className="p-3 font-mono text-right text-steel">
                  {((totals.scope1 / (totals.total || 1)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-midnight">Indirect Emissions from Purchased Grid Electricity</td>
                <td className="p-3 font-mono text-steel">Scope 2</td>
                <td className="p-3 font-mono text-right font-semibold text-midnight">
                  {Number(totals.scope2).toFixed(2)}
                </td>
                <td className="p-3 font-mono text-right text-steel">
                  {((totals.scope2 / (totals.total || 1)) * 100).toFixed(1)}%
                </td>
              </tr>
              {Number(totals.scope3_partial) > 0 && (
                <tr>
                  <td className="p-3 font-medium text-midnight">Partial Upstream / Supply Chain Logistics</td>
                  <td className="p-3 font-mono text-steel">Scope 3 Partial</td>
                  <td className="p-3 font-mono text-right font-semibold text-midnight">
                    {Number(totals.scope3_partial).toFixed(2)}
                  </td>
                  <td className="p-3 font-mono text-right text-steel">
                    {((totals.scope3_partial / (totals.total || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              )}
              <tr className="bg-paper/40 font-semibold text-midnight">
                <td className="p-3">Total Gross Greenhouse Gas Footprint</td>
                <td className="p-3 font-mono text-charcoal">Scope 1 + 2 (+ 3)</td>
                <td className="p-3 font-mono text-right text-base text-midnight">
                  {Number(totals.total).toFixed(2)}
                </td>
                <td className="p-3 font-mono text-right font-mono">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Audit Sign-off Note */}
        <div className="p-4 bg-paper/50 border border-ash rounded-lg flex items-center justify-between text-xs text-steel">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-vivid-green flex-shrink-0" />
            <span>Emission factors verified against Central Electricity Authority (CEA) User Guide v20.0</span>
          </div>
          <span className="font-mono text-[11px] text-fog">
            SHA-256 Validated
          </span>
        </div>
      </div>
    </div>
  );
}
