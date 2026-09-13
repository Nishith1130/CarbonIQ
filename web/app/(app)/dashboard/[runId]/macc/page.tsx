"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { MACCResponse, MACCItem, TokenResponse } from "@/lib/types";
import { MACCChart } from "@/components/charts/MACCChart";
import {
  InterventionCard,
  InterventionStatus,
} from "@/components/cards/InterventionCard";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle2,
  MinusCircle,
  Sparkles,
} from "lucide-react";

type StatusMap = Record<string, InterventionStatus>;
type Phase = "triage" | "results";

function loadStatuses(orgId: string | null): StatusMap {
  if (!orgId || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`carboniq_intervention_status:${orgId}`);
    return raw ? (JSON.parse(raw) as StatusMap) : {};
  } catch {
    return {};
  }
}

function saveStatuses(orgId: string | null, map: StatusMap) {
  if (!orgId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `carboniq_intervention_status:${orgId}`,
      JSON.stringify(map)
    );
  } catch {
    /* ignore quota */
  }
}

export default function MACCPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const runId = params.runId as string;
  const isFresh = searchParams.get("fresh") === "1";

  const [session, setSession] = useState<TokenResponse | null>(null);
  const [macc, setMacc] = useState<MACCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<StatusMap>({});
  const [phase, setPhase] = useState<Phase>("triage");
  const [deferredExpanded, setDeferredExpanded] = useState(false);

  useEffect(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    if (session?.org_id) {
      setStatuses(loadStatuses(session.org_id));
    }
  }, [session?.org_id]);

  useEffect(() => {
    if (!runId) return;

    apiClient<MACCResponse>(`/runs/${runId}/macc`, {
      method: "POST",
    })
      .then((data) => {
        setMacc(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to generate MACC:", err);
        setError("Could not generate Marginal Abatement Cost Curve.");
        setLoading(false);
      });
  }, [runId]);

  const handleStatusChange = useCallback(
    (interventionId: string, next: InterventionStatus | null) => {
      setStatuses((prev) => {
        const copy = { ...prev };
        if (next === null) delete copy[interventionId];
        else copy[interventionId] = next;
        saveStatuses(session?.org_id || null, copy);
        return copy;
      });
    },
    [session?.org_id]
  );

  const items = macc?.items || [];

  // Partition — hooks must run before any early return
  const { activeItems, deferredItems, taggedCount, interestedCount } = useMemo(() => {
    const active: MACCItem[] = [];
    const deferred: MACCItem[] = [];
    let tagged = 0;
    let interested = 0;
    for (const item of items) {
      const s = statuses[item.intervention_id];
      if (s) tagged += 1;
      if (s === "implemented" || s === "not_applicable") {
        deferred.push(item);
      } else {
        active.push(item);
        if (s === "interested") interested += 1;
      }
    }
    return {
      activeItems: active,
      deferredItems: deferred,
      taggedCount: tagged,
      interestedCount: interested,
    };
  }, [items, statuses]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
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

  const totalCount = items.length;
  const untaggedCount = totalCount - taggedCount;

  return (
    <div className="space-y-5">
      {/* Header (same on both phases) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ash">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
            <span>Decarbonization Roadmap</span>
            <span>•</span>
            <span>BEE SME Technology Bank</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
            Recommended Interventions
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/${runId}${isFresh ? "?fresh=1" : ""}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ash text-midnight hover:bg-paper text-[13px] font-medium transition-colors whitespace-nowrap"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            View Breakdown
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

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PHASE 1: TRIAGE — titles only, tag each                    */}
      {/* ─────────────────────────────────────────────────────────── */}
      {phase === "triage" && (
        <TriageView
          items={items}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          totalCount={totalCount}
          taggedCount={taggedCount}
          interestedCount={interestedCount}
          untaggedCount={untaggedCount}
          onCompute={() => setPhase("results")}
        />
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PHASE 2: RESULTS — chart, KPIs, detailed cards              */}
      {/* ─────────────────────────────────────────────────────────── */}
      {phase === "results" && (
        <ResultsView
          activeItems={activeItems}
          deferredItems={deferredItems}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          deferredExpanded={deferredExpanded}
          setDeferredExpanded={setDeferredExpanded}
          onBackToTriage={() => setPhase("triage")}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             PHASE 1 — TRIAGE                                */
/* -------------------------------------------------------------------------- */

interface TriageViewProps {
  items: MACCItem[];
  statuses: StatusMap;
  onStatusChange: (id: string, next: InterventionStatus | null) => void;
  totalCount: number;
  taggedCount: number;
  interestedCount: number;
  untaggedCount: number;
  onCompute: () => void;
}

function TriageView({
  items,
  statuses,
  onStatusChange,
  totalCount,
  taggedCount,
  interestedCount,
  untaggedCount,
  onCompute,
}: TriageViewProps) {
  const canProceed = taggedCount > 0;

  return (
    <>
      {/* Instruction banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-900 mb-0.5">
            Step 1 — Tag each recommendation
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            The AI has shortlisted {totalCount} interventions for your facility. Tell us which
            you&apos;ve already implemented, which don&apos;t apply, and which you&apos;re
            interested in. We&apos;ll compute annual savings, payback, and the MACC curve for the
            interested ones only.
          </p>
        </div>
      </div>

      {/* Progress + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-paper/60 border border-ash">
        <div className="text-xs text-steel flex items-center gap-3 flex-wrap tabular-nums">
          <span className="font-mono">
            Progress:{" "}
            <span className="text-midnight font-semibold">
              {taggedCount} / {totalCount}
            </span>{" "}
            tagged
          </span>
          {taggedCount > 0 && (
            <>
              <span className="text-ash">·</span>
              <span className="inline-flex items-center gap-1 text-blue-700">
                <Star className="w-3 h-3" /> {interestedCount} interested
              </span>
            </>
          )}
          {untaggedCount > 0 && (
            <>
              <span className="text-ash">·</span>
              <span className="text-fog">{untaggedCount} untagged</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onCompute}
          disabled={!canProceed}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Compute savings plan
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title-only list */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <TriageRow
            key={item.intervention_id || idx}
            item={item}
            rank={idx + 1}
            status={statuses[item.intervention_id] || null}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* Sticky bottom CTA (mobile-friendly) */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-canvas/80 backdrop-blur border-t border-ash flex items-center justify-between gap-3">
        <span className="text-[11px] text-fog">
          {canProceed
            ? "Tag more items or continue with what you've marked so far."
            : "Tag at least one intervention to see your savings plan."}
        </span>
        <button
          type="button"
          onClick={onCompute}
          disabled={!canProceed}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Compute savings plan
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
}

/* Simple triage row: rank + name + circular type + 3 tag buttons */
function TriageRow({
  item,
  rank,
  status,
  onStatusChange,
}: {
  item: MACCItem;
  rank: number;
  status: InterventionStatus | null;
  onStatusChange: (id: string, next: InterventionStatus | null) => void;
}) {
  const setStatus = (next: InterventionStatus) => {
    onStatusChange(item.intervention_id, status === next ? null : next);
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-canvas border rounded-lg transition-all ${
        status ? "border-ash/70" : "border-ash hover:border-smoke"
      }`}
    >
      <span className="w-6 h-6 rounded-full bg-paper border border-ash flex items-center justify-center text-[10px] font-mono font-semibold text-charcoal flex-shrink-0">
        #{rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-midnight truncate">
          {item.intervention_name}
        </div>
        {item.circular_type && (
          <div className="text-[10px] font-mono text-fog uppercase mt-0.5">
            {item.circular_type.replace("_", " ")}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <TagButton
          active={status === "interested"}
          tone="blue"
          icon={Star}
          label="Interested"
          onClick={() => setStatus("interested")}
        />
        <TagButton
          active={status === "implemented"}
          tone="emerald"
          icon={CheckCircle2}
          label="Implemented"
          onClick={() => setStatus("implemented")}
        />
        <TagButton
          active={status === "not_applicable"}
          tone="gray"
          icon={MinusCircle}
          label="N/A"
          onClick={() => setStatus("not_applicable")}
        />
      </div>
    </div>
  );
}

function TagButton({
  active,
  tone,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: "blue" | "emerald" | "gray";
  icon: any;
  label: string;
  onClick: () => void;
}) {
  const activeCls: Record<string, string> = {
    blue: "bg-blue-600 text-white border-blue-600",
    emerald: "bg-emerald-600 text-white border-emerald-600",
    gray: "bg-gray-700 text-white border-gray-700",
  };
  const idleCls: Record<string, string> = {
    blue: "text-blue-700 border-blue-200 hover:bg-blue-50",
    emerald: "text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    gray: "text-gray-600 border-gray-200 hover:bg-gray-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md border text-[10px] font-semibold transition-colors ${
        active ? activeCls[tone] : idleCls[tone]
      }`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                             PHASE 2 — RESULTS                               */
/* -------------------------------------------------------------------------- */

interface ResultsViewProps {
  activeItems: MACCItem[];
  deferredItems: MACCItem[];
  statuses: StatusMap;
  onStatusChange: (id: string, next: InterventionStatus | null) => void;
  deferredExpanded: boolean;
  setDeferredExpanded: (b: boolean) => void;
  onBackToTriage: () => void;
}

function ResultsView({
  activeItems,
  deferredItems,
  statuses,
  onStatusChange,
  deferredExpanded,
  setDeferredExpanded,
  onBackToTriage,
}: ResultsViewProps) {
  // Sort state for live interventions
  const [sortType, setSortType] = React.useState<"roi" | "impact" | "payback">("roi");

  const sortedActiveItems = React.useMemo(() => {
    const arr = [...activeItems];
    if (sortType === "roi") {
      return arr.sort((a, b) => a.cost_per_tco2e - b.cost_per_tco2e);
    }
    if (sortType === "impact") {
      return arr.sort((a, b) => Number(b.tco2e_reduced_annual) - Number(a.tco2e_reduced_annual));
    }
    if (sortType === "payback") {
      return arr.sort((a, b) => a.payback_years - b.payback_years);
    }
    return arr;
  }, [activeItems, sortType]);
  // KPIs from active items only
  const negativeCostItems = activeItems.filter((i) => i.cost_per_tco2e < 0);
  const totalSavingsAnnual = activeItems.reduce(
    (acc, i) => acc + (Number(i.annual_saving_inr) || 0),
    0
  );
  const totalAbatement = activeItems.reduce(
    (acc, i) => acc + (Number(i.tco2e_reduced_annual) || 0),
    0
  );

  const implementedCount = deferredItems.filter(
    (i) => statuses[i.intervention_id] === "implemented"
  ).length;
  const notApplicableCount = deferredItems.filter(
    (i) => statuses[i.intervention_id] === "not_applicable"
  ).length;

  return (
    <>
      {/* Return to triage */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToTriage}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-steel hover:text-midnight transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to tagging
        </button>
        <span className="text-[11px] text-fog font-mono">
          Personalised for your tagged interventions
        </span>
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Remaining Opportunity</span>
            <span className="w-2 h-2 rounded-full bg-electric-blue"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-midnight tabular-nums">
            {totalAbatement.toFixed(1)}{" "}
            <span className="text-xs font-sans text-fog font-normal">tCO₂e / yr</span>
          </div>
          <div className="text-[11px] text-steel mt-1">
            Across {activeItems.length} live interventions
            {deferredItems.length > 0 && <span> · {deferredItems.length} deferred</span>}
          </div>
        </div>

        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Annual Energy Cost Savings</span>
            <span className="w-2 h-2 rounded-full bg-vivid-green"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-vivid-green tabular-nums">
            ₹{Math.round(totalSavingsAnnual).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-steel mt-1">
            Cumulative recovery from live actions only
          </div>
        </div>

        <div className="bg-canvas border border-ash rounded-xl p-4 transition hover:border-smoke">
          <div className="flex items-center justify-between text-xs text-fog mb-1">
            <span className="font-medium">Net-Negative Cost Interventions</span>
            <span className="px-1.5 py-0.5 rounded bg-soft-mint text-vivid-green text-[10px] font-mono font-semibold">
              Immediate ROI
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-midnight tabular-nums">
            {negativeCostItems.length}{" "}
            <span className="text-xs font-sans text-fog font-normal">
              of {activeItems.length} live
            </span>
          </div>
          <div className="text-[11px] text-steel mt-1">Payback &lt; 2.5 years</div>
        </div>
      </div>

      {/* MACC chart */}
      {activeItems.length > 0 && (
        <div className="bg-canvas border border-ash rounded-xl p-5 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-ash">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-midnight">
                Intervention Marginal Abatement Cost Curve
              </h3>
              <p className="text-xs text-steel">
                Bars below the horizontal line represent cost-saving interventions with
                positive financial return. Deferred items are excluded.
              </p>
            </div>
          </div>

          <MACCChart items={sortedActiveItems} />
        </div>
      )}

      {/* Live intervention detail cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-midnight">
            Live Interventions{" "}
            <span className="text-fog font-mono text-xs">({activeItems.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-fog">Sort by:</span>
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as any)}
              className="text-xs font-mono bg-canvas border border-ash rounded px-2 py-1 text-midnight focus:outline-none focus:border-smoke cursor-pointer hover:bg-paper transition-colors"
            >
              <option value="roi">₹ / tCO₂e (ROI) Asc</option>
              <option value="impact">CO₂ Abated (Impact) Desc</option>
              <option value="payback">Payback Time (Liquidity) Asc</option>
            </select>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-ash rounded-xl text-sm text-steel">
            All interventions have been deferred. Restore any from the list below to compute
            savings.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActiveItems.map((item, idx) => (
              <InterventionCard
                key={item.intervention_id || idx}
                item={item}
                rank={idx + 1}
                status={statuses[item.intervention_id] || null}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deferred collapsed */}
      {deferredItems.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setDeferredExpanded(!deferredExpanded)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-paper/60 border border-ash rounded-xl hover:border-smoke transition-colors"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-midnight">Deferred</span>
              <span className="text-xs font-mono text-fog">({deferredItems.length})</span>
              <span className="text-[11px] text-steel">
                {implementedCount > 0 && `${implementedCount} implemented`}
                {implementedCount > 0 && notApplicableCount > 0 && " · "}
                {notApplicableCount > 0 && `${notApplicableCount} not applicable`}
              </span>
            </div>
            {deferredExpanded ? (
              <ChevronUp className="w-4 h-4 text-steel" />
            ) : (
              <ChevronDown className="w-4 h-4 text-steel" />
            )}
          </button>
          {deferredExpanded && (
            <div className="space-y-1.5 pl-2">
              {deferredItems.map((item, idx) => (
                <InterventionCard
                  key={item.intervention_id || idx}
                  item={item}
                  rank={0}
                  status={statuses[item.intervention_id] || null}
                  onStatusChange={onStatusChange}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
