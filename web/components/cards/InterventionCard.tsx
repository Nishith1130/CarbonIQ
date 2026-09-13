"use client";

import React from "react";
import { MACCItem } from "@/lib/types";
import {
  BookOpen,
  CheckCircle2,
  Star,
  MinusCircle,
  RotateCcw,
} from "lucide-react";

export type InterventionStatus = "interested" | "implemented" | "not_applicable";

interface InterventionCardProps {
  item: MACCItem;
  rank: number;
  status?: InterventionStatus | null;
  onStatusChange?: (
    interventionId: string,
    next: InterventionStatus | null
  ) => void;
  compact?: boolean;
}

const STATUS_META: Record<
  InterventionStatus,
  { label: string; chipCls: string; icon: any }
> = {
  interested: {
    label: "Interested",
    chipCls: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Star,
  },
  implemented: {
    label: "Already implemented",
    chipCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  not_applicable: {
    label: "Not applicable",
    chipCls: "bg-gray-100 text-gray-600 border-gray-200",
    icon: MinusCircle,
  },
};

export function InterventionCard({
  item,
  rank,
  status = null,
  onStatusChange,
  compact = false,
}: InterventionCardProps) {
  const isNegativeCost = item.cost_per_tco2e < 0;
  const capexLakh = (item.cost_capex_inr / 100000).toFixed(2);
  const annualSavingFormatted = Math.round(item.annual_saving_inr).toLocaleString(
    "en-IN"
  );
  const costPerTonneFormatted = Math.abs(
    Math.round(item.cost_per_tco2e)
  ).toLocaleString("en-IN");

  const setStatus = (next: InterventionStatus) => {
    if (!onStatusChange) return;
    onStatusChange(item.intervention_id, status === next ? null : next);
  };

  const clearStatus = () => onStatusChange?.(item.intervention_id, null);

  // Compact mode = collapsed deferred list — one-liner
  if (compact) {
    const meta = status ? STATUS_META[status] : null;
    const StatusIcon = meta?.icon;
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-paper/50 border border-ash/80 rounded-lg">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {StatusIcon && meta && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${meta.chipCls} flex-shrink-0`}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {meta.label}
            </span>
          )}
          <span className="text-xs font-medium text-midnight truncate">
            {item.intervention_name}
          </span>
          <span className="text-[10px] font-mono text-fog whitespace-nowrap">
            {Number(item.tco2e_reduced_annual).toFixed(1)} tCO₂e/yr
          </span>
        </div>
        {onStatusChange && (
          <button
            type="button"
            onClick={clearStatus}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-steel hover:text-midnight px-2 py-1 rounded hover:bg-canvas transition-colors flex-shrink-0"
            title="Restore to Interested"
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-canvas border rounded-xl p-4 transition-all hover:shadow-subtle ${
        status
          ? "border-ash/60"
          : "border-ash hover:border-smoke"
      }`}
    >
      {/* Header: Rank + Name + Cost Category Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-paper border border-ash flex items-center justify-center text-xs font-mono font-semibold text-charcoal">
            #{rank}
          </span>
          <h4 className="font-semibold text-sm sm:text-base text-midnight">
            {item.intervention_name}
          </h4>
          {status && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_META[status].chipCls}`}
            >
              {React.createElement(STATUS_META[status].icon, {
                className: "w-2.5 h-2.5",
              })}
              {STATUS_META[status].label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {item.circular_type && (
            <span className="px-2 py-0.5 rounded-pill bg-paper border border-ash text-[11px] font-mono text-steel uppercase">
              {item.circular_type.replace("_", " ")}
            </span>
          )}

          <span
            className={`px-2.5 py-0.5 rounded-pill text-[11px] font-mono font-medium border ${
              isNegativeCost
                ? "bg-soft-mint text-vivid-green border-vivid-green/30"
                : "bg-paper text-steel border-ash"
            }`}
          >
            {isNegativeCost
              ? `Save ₹${costPerTonneFormatted} / tCO₂e`
              : `₹${costPerTonneFormatted} / tCO₂e`}
          </span>
        </div>
      </div>

      {/* Rationale text */}
      <p className="text-xs text-steel leading-relaxed mb-4">{item.rationale}</p>

      {/* 4-Column Financial & Carbon Metrics Tile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-paper/60 border border-ash/80 rounded-lg text-xs mb-3">
        <div>
          <span className="text-fog text-[11px] block mb-0.5">Est. CapEx</span>
          <span className="font-mono font-semibold text-midnight">
            ₹{capexLakh} L
          </span>
        </div>

        <div>
          <span className="text-fog text-[11px] block mb-0.5">Annual Savings</span>
          <span className="font-mono font-semibold text-vivid-green">
            ₹{annualSavingFormatted}
          </span>
        </div>

        <div>
          <span className="text-fog text-[11px] block mb-0.5">Annual Abatement</span>
          <span className="font-mono font-semibold text-midnight">
            {Number(item.tco2e_reduced_annual).toFixed(1)} tCO₂e
          </span>
        </div>

        <div>
          <span className="text-fog text-[11px] block mb-0.5">Simple Payback</span>
          <span className="font-mono font-semibold text-midnight">
            {Number(item.payback_years).toFixed(1)} yrs
          </span>
        </div>
      </div>

      {/* Footer: Citation + Status controls */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-fog min-w-0">
          <BookOpen className="w-3 h-3 text-silver flex-shrink-0" />
          <span className="truncate">
            Ref:{" "}
            <span className="font-mono text-steel">{item.source_citation}</span>
          </span>
        </div>

        {onStatusChange ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-fog uppercase tracking-wider mr-1 hidden sm:inline">
              Your call:
            </span>
            <StatusPill
              active={status === "interested"}
              icon={Star}
              label="Interested"
              tone="blue"
              onClick={() => setStatus("interested")}
            />
            <StatusPill
              active={status === "implemented"}
              icon={CheckCircle2}
              label="Implemented"
              tone="emerald"
              onClick={() => setStatus("implemented")}
            />
            <StatusPill
              active={status === "not_applicable"}
              icon={MinusCircle}
              label="Not applicable"
              tone="gray"
              onClick={() => setStatus("not_applicable")}
            />
          </div>
        ) : (
          status && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_META[status].chipCls}`}
              >
                {React.createElement(STATUS_META[status].icon, { className: "w-2.5 h-2.5" })}
                {STATUS_META[status].label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StatusPill({
  active,
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  tone: "blue" | "emerald" | "gray";
  onClick: () => void;
}) {
  const toneActive: Record<string, string> = {
    blue: "bg-blue-600 text-white border-blue-600",
    emerald: "bg-emerald-600 text-white border-emerald-600",
    gray: "bg-gray-700 text-white border-gray-700",
  };
  const toneIdle: Record<string, string> = {
    blue: "text-blue-700 border-blue-200 hover:bg-blue-50",
    emerald: "text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    gray: "text-gray-600 border-gray-200 hover:bg-gray-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
        active ? toneActive[tone] : toneIdle[tone]
      }`}
    >
      <Icon className="w-2.5 h-2.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
