"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import {
  SectorSchemaResponse,
  ActivityInput,
  RunResponse,
  TokenResponse,
} from "@/lib/types";
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
      .then((data) => {
        setSchema(data);
        if (data.activities_expected && data.activities_expected.length > 0) {
          setActivities(
            data.activities_expected.map((item) => ({
              activity_type: item.activity_type,
              quantity: 0,
              unit: item.unit,
              unit_process: item.suggested_unit_process || null,
            }))
          );
        }
        setLoading(false);
      })
      .catch((err) => {
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
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Step and Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
            <span>Step 2 of 3</span>
            <span>•</span>
            <span>Utility & Fuel Bill Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Log Facility Energy & Activity Bills
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your monthly or annual utility bills. CarbonIQ disaggregates into process hotspots automatically.
          </p>
        </div>

        {/* 1-Click Golden Demo Preset Button */}
        <div>
          <button
            type="button"
            onClick={handleLoadSuratDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 text-sm font-semibold text-blue-700 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
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
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
        {/* Accounting Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Billing Period Start Date
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Billing Period End Date
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Activity Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">
              Energy & Fuel Line Items
            </h3>
            <span className="text-xs font-medium text-gray-500">
              CEA v20.0 (India Grid Factor: 0.7117 tCO₂/MWh)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
            {activities.map((act, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 pl-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <div className="p-1.5 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(act.activity_type)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[13px] font-semibold text-gray-900 truncate">
                      {getActivityLabel(act.activity_type)}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                      {act.activity_type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={act.quantity === 0 ? "" : act.quantity}
                    onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                    placeholder="0"
                    className="w-24 px-2.5 py-1.5 text-[13px] font-semibold border border-gray-200 rounded-md bg-gray-50 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-gray-400"
                  />
                  <span className="w-10 text-[11px] font-semibold text-gray-500 uppercase">
                    {act.unit}
                  </span>

                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remove bill line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddLineItem}
            className="flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-700 font-semibold pt-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add another utility bill line</span>
          </button>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Deterministic ISO 14064-1 & GHG Protocol Scope 1, 2, 3 verification</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0A0A0A] hover:bg-black text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
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
