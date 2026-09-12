"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient } from "../../../../../lib/api-client";
import { MACCResponse, MACCItem } from "../../../../../lib/types";
import { MACCChart } from "../../../../../components/charts/MACCChart";
import { InterventionCard } from "../../../../../components/cards/InterventionCard";
import {
  TrendingDown,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function MACCPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [macc, setMacc] = useState<MACCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;

    apiClient<MACCResponse>(`/runs/${runId}/macc`, {
      method: "POST",
    })
      .then((data: any) => {
        setMacc(data);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to generate MACC:", err);
        setError("Could not generate Marginal Abatement Cost Curve.");
        setLoading(false);
      });
  }, [runId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Matching BEE technology bank interventions & ranking by ₹/tCO₂e...</span>
        </div>
      </div>
    );
  }

  if (error || !macc) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-tangerine mx-auto" />
        <h3 className="font-semibold text-base text-midnight">MACC Generation Failed</h3>
        <p className="text-xs text-steel">{error || "Could not retrieve MACC recommendations."}</p>
        <Link
          href={`/dashboard/${runId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-midnight text-canvas text-xs font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate aggregates
  const items = macc.items || [];
  const negativeCostItems = items.filter((i) => i.cost_per_tco2e < 0);
  const totalSavingsAnnual = items.reduce((acc: any, i: any) => acc + (Number(i.annual_saving_inr) || 0), 0);
  const totalAbatement = items.reduce((acc: any, i: any) => acc + (Number(i.tco2e_reduced_annual) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ash">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
            <span>Decarbonization Roadmap</span>
            <span>•</span>
            <span>BEE SME Technology Bank</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
            Marginal Abatement Cost Curve (MACC)
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
          <span className="px-3 py-1 bg-canvas border border-ash rounded-pill text-midnight shadow-subtle">
            2. MACC Curve
          </span>
          <Link
            href={`/dashboard/${runId}/report`}
            className="px-3 py-1 text-steel hover:text-midnight rounded-pill transition"
          >
            3. BRSR Report
          </Link>
        </div>
      </div>

      {/* 3 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Total Potential Abatement</span>
            <span className="w-2 h-2 rounded-full bg-electric-blue"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-midnight">
            {totalAbatement.toFixed(1)} <span className="text-xs font-sans text-fog font-normal">tCO₂e / yr</span>
          </div>
          <div className="text-[11px] text-steel mt-1">
            Across {items.length} verified interventions
          </div>
        </div>

        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Annual Energy Cost Savings</span>
            <span className="w-2 h-2 rounded-full bg-vivid-green"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-vivid-green">
            ₹{Math.round(totalSavingsAnnual).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Cumulative annual cash flow recovery
          </div>
        </div>

        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Net-Negative Cost Interventions</span>
            <span className="px-1.5 py-0.5 rounded bg-soft-mint text-vivid-green text-[10px] font-mono font-semibold">
              Immediate ROI
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-midnight">
            {negativeCostItems.length} <span className="text-xs font-sans text-fog font-normal">of {items.length} actions</span>
          </div>
          <div className="text-[11px] text-steel mt-1">
            Payback &lt; 2.5 years
          </div>
        </div>
      </div>

      {/* MACC Waterfall Visualizer Container */}
      <div className="bg-canvas border border-ash rounded-xl p-5 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-ash">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-midnight">
              Intervention Marginal Abatement Cost Curve
            </h3>
            <p className="text-xs text-steel">
              Bars below the horizontal line represent cost-saving interventions with positive financial return.
            </p>
          </div>
        </div>

        <MACCChart items={items} />
      </div>

      {/* Interventions Stack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-midnight">
            Ranked Circular & Energy Efficiency Interventions
          </h3>
          <span className="text-xs font-mono text-fog">
            Sorted by ₹ / tCO₂e Ascending
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item: any, idx: number) => (
            <InterventionCard key={item.intervention_id || idx} item={item} rank={idx + 1} />
          ))}
        </div>
      </div>

      {/* Bottom Action Card */}
      <div className="p-5 bg-midnight rounded-xl text-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog mb-1">
            <FileText className="w-3.5 h-3.5 text-electric-blue" />
            <span>Official Regulatory Filing</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-canvas">
            Generate Audit-Ready BRSR Core PDF Report
          </h3>
          <p className="text-xs text-silver mt-0.5">
            Export compliant SEBI Principle 6 disclosure with CEA emission factors and MACC abatement plan.
          </p>
        </div>

        <Link
          href={`/dashboard/${runId}/report`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-canvas text-midnight hover:bg-paper text-sm font-medium transition"
        >
          <span>Preview & Download Report</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
