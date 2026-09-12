"use client";

import React from "react";
import { MACCItem } from "@/lib/types";
import { TrendingDown, IndianRupee, Clock, BookOpen, CheckCircle2 } from "lucide-react";

interface InterventionCardProps {
  item: MACCItem;
  rank: number;
}

export function InterventionCard({ item, rank }: InterventionCardProps) {
  const isNegativeCost = item.cost_per_tco2e < 0;
  const capexLakh = (item.cost_capex_inr / 100000).toFixed(2);
  const annualSavingFormatted = Math.round(item.annual_saving_inr).toLocaleString("en-IN");
  const costPerTonneFormatted = Math.abs(Math.round(item.cost_per_tco2e)).toLocaleString("en-IN");

  return (
    <div className="bg-canvas border border-ash rounded-xl p-4 transition-all hover:border-smoke hover:shadow-subtle">
      {/* Header: Rank + Name + Cost Category Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-paper border border-ash flex items-center justify-center text-xs font-mono font-semibold text-charcoal">
            #{rank}
          </span>
          <h4 className="font-semibold text-sm sm:text-base text-midnight">
            {item.intervention_name}
          </h4>
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
            {isNegativeCost ? `Save ₹${costPerTonneFormatted} / tCO₂e` : `₹${costPerTonneFormatted} / tCO₂e`}
          </span>
        </div>
      </div>

      {/* Rationale text */}
      <p className="text-xs text-steel leading-relaxed mb-4">
        {item.rationale}
      </p>

      {/* 4-Column Financial & Carbon Metrics Tile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-paper/60 border border-ash/80 rounded-lg text-xs mb-3">
        <div>
          <span className="text-fog text-[11px] block mb-0.5">Est. CapEx</span>
          <span className="font-mono font-semibold text-midnight">₹{capexLakh} L</span>
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

      {/* Footer: BEE Official Citation */}
      <div className="flex items-center gap-1.5 text-[11px] text-fog">
        <BookOpen className="w-3 h-3 text-silver flex-shrink-0" />
        <span className="truncate">
          Ref: <span className="font-mono text-steel">{item.source_citation}</span>
        </span>
      </div>
    </div>
  );
}
