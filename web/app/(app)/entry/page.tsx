"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "../../../lib/api-client";
import { getSession } from "../../../lib/auth";
import {
  SectorSchemaResponse,
  ActivityInput,
  RunResponse,
  TokenResponse,
} from "../../../lib/types";
import {
  Zap,
  Flame,
  Fuel,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

function BillEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [sectorId, setSectorId] = useState<string>("textile_dyeing");
  const [schema, setSchema] = useState<SectorSchemaResponse | null>(null);

  // Form State
  const [activities, setActivities] = useState<ActivityInput[]>([
    { activity_type: "electricity_grid", quantity: 0, unit: "kWh" },
    { activity_type: "coal_indian_bituminous", quantity: 0, unit: "kg" },
    { activity_type: "diesel_hsd", quantity: 0, unit: "litre" },
  ]);
  const [periodStart, setPeriodStart] = useState("2024-04-01");
  const [periodEnd, setPeriodEnd] = useState("2025-03-31");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    const querySector = searchParams.get("sector") || s?.sector_id || "textile_dyeing";
    setSectorId(querySector);

    apiClient<SectorSchemaResponse>(`/sectors/${querySector}/schema`)
      .then((data: any) => {
        setSchema(data);
        if (data.activities_expected && data.activities_expected.length > 0) {
          setActivities(
            data.activities_expected.map((item: any) => ({
              activity_type: item.activity_type,
              quantity: 0,
              unit: item.unit,
              unit_process: item.suggested_unit_process || null,
            }))
          );
        }
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to load sector schema:", err);
        setLoading(false);
      });
  }, [searchParams]);

  // Surat Textile Mill Golden Demo Preset
  const handleLoadSuratDemo = () => {
    setSectorId("textile_dyeing");
    setPeriodStart("2024-04-01");
    setPeriodEnd("2025-03-31");
    setActivities([
      {
        activity_type: "electricity_grid",
        quantity: 100000,
        unit: "kWh",
        unit_process: null,
      },
      {
        activity_type: "coal_indian_bituminous",
        quantity: 40000,
        unit: "kg",
        unit_process: null,
      },
      {
        activity_type: "diesel_hsd",
        quantity: 1000,
        unit: "litre",
        unit_process: null,
      },
    ]);
  };

  const handleUpdateQuantity = (index: number, val: string) => {
    const q = parseFloat(val) || 0;
    const updated = [...activities];
    updated[index].quantity = q;
    setActivities(updated);
  };

  const handleAddLineItem = () => {
    setActivities([
      ...activities,
      {
        activity_type: "electricity_grid",
        quantity: 0,
        unit: "kWh",
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validActivities = activities.filter((a) => a.quantity > 0);
    if (validActivities.length === 0) {
      setError("Please enter at least one utility bill quantity greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        org_id: session?.org_id || null,
        sector_id: sectorId,
        period_start: periodStart,
        period_end: periodEnd,
        region: "IN_all_india",
        activities: validActivities,
      };

      const result = await apiClient<RunResponse>("/runs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/${result.id}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error processing emission calculation run.");
      }
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    if (type.includes("electric")) return <Zap className="w-4 h-4 text-electric-blue" />;
    if (type.includes("coal") || type.includes("biomass") || type.includes("gas"))
      return <Flame className="w-4 h-4 text-tangerine" />;
    return <Fuel className="w-4 h-4 text-graphite" />;
  };

  const getActivityLabel = (type: string) => {
    if (schema) {
      const match = schema.activities_expected?.find((a) => a.activity_type === type);
      if (match) return match.display_name;
    }
    return type.replace(/_/g, " ").toUpperCase();
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Loading sector bill templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
            <span>Step 2 of 3</span>
            <span>•</span>
            <span>Utility & Fuel Bill Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
            Log Facility Energy & Activity Bills
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-steel">
            Enter your monthly or annual utility bills. CarbonIQ disaggregates into process hotspots automatically.
          </p>
        </div>

        {/* 1-Click Golden Demo Preset Button */}
        <div>
          <button
            type="button"
            onClick={handleLoadSuratDemo}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-paper border border-ash hover:border-smoke hover:bg-canvas text-xs font-medium text-midnight shadow-subtle transition"
          >
            <Sparkles className="w-4 h-4 text-electric-blue" />
            <span>Load Surat Textile Mill Demo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-canvas border border-ash rounded-xl p-6 shadow-subtle space-y-6">
        {/* Accounting Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-ash">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Billing Period Start Date
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-ash rounded-input bg-canvas text-midnight focus:outline-none focus:border-midnight"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Billing Period End Date
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-ash rounded-input bg-canvas text-midnight focus:outline-none focus:border-midnight"
            />
          </div>
        </div>

        {/* Activity Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-midnight">
              Energy & Fuel Line Items
            </h3>
            <span className="text-[11px] font-mono text-fog">
              CEA v20.0 (India Grid Factor: 0.7117 tCO₂/MWh)
            </span>
          </div>

          <div className="space-y-2.5">
            {activities.map((act, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-paper/50 border border-ash rounded-lg transition hover:border-smoke"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                  <div className="p-1.5 rounded bg-canvas border border-ash flex items-center justify-center">
                    {getActivityIcon(act.activity_type)}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-midnight block">
                      {getActivityLabel(act.activity_type)}
                    </span>
                    <span className="text-[10px] font-mono text-fog uppercase">
                      {act.activity_type}
                    </span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="flex items-center gap-2 sm:w-64">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={act.quantity === 0 ? "" : act.quantity}
                      onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 text-sm font-mono border border-ash rounded-input bg-canvas text-midnight text-right focus:outline-none focus:border-midnight"
                    />
                  </div>
                  <span className="w-16 text-xs font-mono text-steel">
                    {act.unit}
                  </span>

                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-1.5 text-silver hover:text-red-600 transition"
                      title="Remove bill line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddLineItem}
            className="flex items-center gap-1.5 text-xs text-electric-blue hover:text-deep-sapphire font-medium pt-2 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add another utility bill line</span>
          </button>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-ash flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-steel">
            <ShieldCheck className="w-4 h-4 text-vivid-green flex-shrink-0" />
            <span>Deterministic ISO 14064-1 & GHG Protocol Scope 1, 2, 3 verification</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {submitting ? (
              <span>Calculating Baseline Hotspots...</span>
            ) : (
              <>
                <span>Calculate Emission Baseline</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BillEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs font-mono text-fog">
          Loading Bill Entry...
        </div>
      }
    >
      <BillEntryContent />
    </Suspense>
  );
}
