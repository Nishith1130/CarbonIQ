"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Totals } from "../../lib/types";

interface ScopeBreakdownPieProps {
  totals: Totals;
}

const COLORS = [
  "#ea580c", // Scope 1: Tangerine
  "#2563eb", // Scope 2: Electric Blue
  "#737373", // Scope 3: Fog
];

export function ScopeBreakdownPie({ totals }: ScopeBreakdownPieProps) {
  const totalVal = Number(totals?.total) || 0.001;
  const s1 = Number(totals?.scope1) || 0;
  const s2 = Number(totals?.scope2) || 0;
  const s3 = Number(totals?.scope3_partial) || 0;

  const data = [
    { name: "Scope 1 (Direct Fuels)", value: s1, color: COLORS[0] },
    { name: "Scope 2 (Purchased Grid)", value: s2, color: COLORS[1] },
    { name: "Scope 3 (Partial / Supply)", value: s3, color: COLORS[2] },
  ].filter((d) => d.value > 0);

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const pct = ((p.value / totalVal) * 100).toFixed(1);
      return (
        <div className="bg-white border border-ash p-2.5 rounded-lg shadow-subtle text-xs">
          <div className="font-medium text-midnight">{p.name}</div>
          <div className="text-charcoal mt-1">
            <span className="font-mono font-semibold">{Number(p.value).toFixed(2)}</span> tCO₂e ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: "No Data", value: 1, color: "#e5e5e5" }]}
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={88}
              stroke="#ffffff"
              strokeWidth={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold tracking-tight text-midnight font-mono">
            {totalVal.toFixed(1)}
          </span>
          <span className="text-[11px] font-medium text-fog uppercase tracking-wider">
            tCO₂e Total
          </span>
        </div>
      </div>

      {/* Legend Rows */}
      <div className="w-full mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-paper">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[0] }}></span>
            <span className="text-steel">Scope 1 (Direct Fuel)</span>
          </div>
          <div className="font-mono text-charcoal">
            {s1.toFixed(2)} t <span className="text-fog">({((s1 / totalVal) * 100).toFixed(1)}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-paper">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[1] }}></span>
            <span className="text-steel">Scope 2 (Grid Electricity)</span>
          </div>
          <div className="font-mono text-charcoal">
            {s2.toFixed(2)} t <span className="text-fog">({((s2 / totalVal) * 100).toFixed(1)}%)</span>
          </div>
        </div>

        {s3 > 0 && (
          <div className="flex items-center justify-between py-1 border-b border-paper">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[2] }}></span>
              <span className="text-steel">Scope 3 (Partial)</span>
            </div>
            <div className="font-mono text-charcoal">
              {s3.toFixed(2)} t <span className="text-fog">({((s3 / totalVal) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
