"use client";

import React from "react";
import { Hotspot } from "../../lib/types";
import { Flame, Zap, AlertCircle } from "lucide-react";

interface HotspotBarProps {
  hotspots: Hotspot[];
}

function formatProcessName(raw: string): string {
  return raw
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function HotspotBar({ hotspots }: HotspotBarProps) {
  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="py-8 text-center text-fog text-sm border border-dashed border-ash rounded-xl">
        No hotspot analysis available for this run.
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
      {hotspots.map((hotspot) => {
        const sharePct = Number(hotspot.share_pct) || 0;
        const tco2e = Number(hotspot.tCO2e) || 0;
        const s1 = Number(hotspot.scope1) || 0;
        const s2 = Number(hotspot.scope2) || 0;

        return (
          <div
            key={hotspot.unit_process || hotspot.rank}
            className="p-3.5 bg-canvas border border-ash rounded-xl transition hover:border-smoke"
          >
            {/* Top row: Rank badge + Unit Process Title + Value */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full ${
                    hotspot.rank === 1
                      ? "bg-tangerine text-white"
                      : hotspot.rank === 2
                      ? "bg-charcoal text-white"
                      : "bg-paper text-steel border border-ash"
                  }`}
                >
                  {hotspot.rank}
                </span>
                <span className="font-medium text-sm text-midnight">
                  {hotspot.unit_process_name || formatProcessName(hotspot.unit_process)}
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono font-semibold text-sm text-midnight">
                  {tco2e.toFixed(2)}
                </span>
                <span className="text-xs text-fog ml-1">tCO₂e</span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-paper border border-ash text-[11px] font-mono font-medium text-charcoal">
                  {sharePct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 bg-paper rounded-full overflow-hidden mb-2 border border-ash/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hotspot.rank === 1
                    ? "bg-tangerine"
                    : hotspot.rank === 2
                    ? "bg-electric-blue"
                    : "bg-graphite"
                }`}
                style={{ width: `${Math.min(Math.max(sharePct, 3), 100)}%` }}
              />
            </div>

            {/* Bottom mini badges: Scope 1 vs Scope 2 breakdown */}
            <div className="flex items-center gap-3 text-[11px] text-steel font-mono">
              {s1 > 0 && (
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-tangerine" />
                  Thermal: {s1.toFixed(2)} t
                </span>
              )}
              {s2 > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-electric-blue" />
                  Electric: {s2.toFixed(2)} t
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
