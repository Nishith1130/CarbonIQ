"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { MACCItem } from "@/lib/types";

interface MACCChartProps {
  items: MACCItem[];
}

export function MACCChart({ items }: MACCChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-fog text-sm border border-dashed border-ash rounded-xl">
        No abatement curve data available.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = items.map((item, idx) => ({
    name: item.intervention_name.length > 22
      ? item.intervention_name.slice(0, 20) + "..."
      : item.intervention_name,
    fullName: item.intervention_name,
    costPerTonne: Math.round(item.cost_per_tco2e),
    abatement: Number(item.tco2e_reduced_annual).toFixed(1),
    payback: Number(item.payback_years).toFixed(1),
    annualSaving: Math.round(item.annual_saving_inr).toLocaleString("en-IN"),
    capex: (item.cost_capex_inr / 100000).toFixed(1),
    isNegative: item.cost_per_tco2e < 0,
  }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border border-ash p-3 rounded-xl shadow-subtle text-xs space-y-1 max-w-xs">
          <div className="font-semibold text-midnight text-sm">{d.fullName}</div>
          <div className="pt-1 border-t border-paper flex items-center justify-between">
            <span className="text-steel">Cost of Abatement:</span>
            <span
              className={`font-mono font-bold ${
                d.isNegative ? "text-vivid-green" : "text-charcoal"
              }`}
            >
              ₹{d.costPerTonne.toLocaleString("en-IN")} / tCO₂e
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-steel">Annual Abatement:</span>
            <span className="font-mono text-midnight font-medium">{d.abatement} tCO₂e/yr</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-steel">CapEx Required:</span>
            <span className="font-mono text-midnight font-medium">₹{d.capex} Lakh</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-steel">Annual Energy Savings:</span>
            <span className="font-mono text-vivid-green font-medium">₹{d.annualSaving}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-steel">Payback Period:</span>
            <span className="font-mono text-midnight font-medium">{d.payback} years</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-vivid-green"></span>
            <span className="text-charcoal font-medium">Cost-Saving Negative Curve (ROI Positive)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-subslate"></span>
            <span className="text-charcoal font-medium">Net-Cost Interventions</span>
          </div>
        </div>
        <span className="text-fog font-mono text-[11px]">Unit: ₹ / tCO₂e Abated</span>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <XAxis
              dataKey="name"
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={customTooltip} />
            <ReferenceLine y={0} stroke="#737373" strokeWidth={1} />
            <Bar dataKey="costPerTonne" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isNegative ? "#16a34a" : "#404040"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
