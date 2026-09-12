"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
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
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Check,
  ChevronDown,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                Fallback catalogue when schema is not loaded                */
/* -------------------------------------------------------------------------- */

interface ActivityOption {
  activity_type: string;
  display_name: string;
  unit: string;
  suggested_unit_process?: string | null;
}

const FALLBACK_CATALOGUE: Record<string, ActivityOption[]> = {
  textile_dyeing: [
    { activity_type: "electricity_grid", display_name: "Grid Electricity", unit: "kWh" },
    { activity_type: "coal_indian_bituminous", display_name: "Coal (Bituminous)", unit: "kg" },
    { activity_type: "biomass_bagasse", display_name: "Biomass (Bagasse / Rice Husk)", unit: "kg" },
    { activity_type: "diesel_hsd", display_name: "Diesel (HSD)", unit: "litre" },
    { activity_type: "lpg_commercial", display_name: "LPG (Commercial)", unit: "kg" },
    { activity_type: "natural_gas_indian_grid", display_name: "Natural Gas", unit: "Nm3" },
    { activity_type: "purchased_cotton_yarn", display_name: "Purchased Cotton Yarn (Scope 3)", unit: "tonne" },
    { activity_type: "road_freight_medium_truck", display_name: "Road Freight — Medium Truck (Scope 3)", unit: "tonne_km" },
    { activity_type: "water_freshwater", display_name: "Freshwater Withdrawal", unit: "kL" },
    { activity_type: "refrigerant_r134a", display_name: "Refrigerant R-134a Top-up", unit: "kg" },
  ],
  foundry: [
    { activity_type: "electricity_grid", display_name: "Grid Electricity", unit: "kWh" },
    { activity_type: "coal_indian_bituminous", display_name: "Coke / Coal", unit: "kg" },
    { activity_type: "natural_gas_indian_grid", display_name: "Natural Gas", unit: "Nm3" },
    { activity_type: "diesel_hsd", display_name: "Diesel (HSD)", unit: "litre" },
    { activity_type: "purchased_steel_scrap", display_name: "Purchased Steel Scrap (Scope 3)", unit: "tonne" },
    { activity_type: "road_freight_medium_truck", display_name: "Road Freight — Medium Truck (Scope 3)", unit: "tonne_km" },
  ],
  food_processing: [
    { activity_type: "electricity_grid", display_name: "Grid Electricity", unit: "kWh" },
    { activity_type: "lpg_commercial", display_name: "LPG (Commercial)", unit: "kg" },
    { activity_type: "diesel_hsd", display_name: "Diesel (HSD)", unit: "litre" },
    { activity_type: "biomass_bagasse", display_name: "Biomass (Briquettes)", unit: "kg" },
    { activity_type: "natural_gas_indian_grid", display_name: "Natural Gas", unit: "Nm3" },
    { activity_type: "refrigerant_r134a", display_name: "Refrigerant R-134a Top-up", unit: "kg" },
    { activity_type: "road_freight_medium_truck", display_name: "Road Freight — Refrigerated (Scope 3)", unit: "tonne_km" },
    { activity_type: "water_freshwater", display_name: "Freshwater Withdrawal", unit: "kL" },
  ],
};

/* -------------------------------------------------------------------------- */

function BillEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [sectorId, setSectorId] = useState<string>("textile_dyeing");
  const [schema, setSchema] = useState<SectorSchemaResponse | null>(null);

  // Start with ONLY electricity — the SME adds everything else themselves.
  const [activities, setActivities] = useState<ActivityInput[]>([
    { activity_type: "electricity_grid", quantity: 0, unit: "kWh" },
  ]);
  const [periodStart, setPeriodStart] = useState("2024-04-01");
  const [periodEnd, setPeriodEnd] = useState("2025-03-31");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    const querySector = searchParams.get("sector") || s?.sector_id || "textile_dyeing";
    setSectorId(querySector);

    apiClient<SectorSchemaResponse>(`/sectors/${querySector}/schema`)
      .then((data) => {
        setSchema(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load sector schema:", err);
        setLoading(false);
      });
  }, [searchParams]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const catalogue: ActivityOption[] = useMemo(() => {
    if (schema?.activities_expected && schema.activities_expected.length > 0) {
      return schema.activities_expected.map((a: any) => ({
        activity_type: a.activity_type,
        display_name: a.display_name || a.activity_type.replace(/_/g, " "),
        unit: a.unit,
        suggested_unit_process: a.suggested_unit_process || null,
      }));
    }
    return FALLBACK_CATALOGUE[sectorId] || FALLBACK_CATALOGUE.textile_dyeing;
  }, [schema, sectorId]);

  const availableToAdd = useMemo(() => {
    const taken = new Set(activities.map((a) => a.activity_type));
    return catalogue.filter((c) => !taken.has(c.activity_type));
  }, [catalogue, activities]);

  const getActivityLabel = (type: string) => {
    const match = catalogue.find((a) => a.activity_type === type);
    return match?.display_name || type.replace(/_/g, " ").toUpperCase();
  };

  const handleUpdateQuantity = (index: number, val: string) => {
    const q = parseFloat(val) || 0;
    const updated = [...activities];
    updated[index].quantity = q;
    setActivities(updated);
  };

  const handleAddLineItem = (opt: ActivityOption) => {
    setActivities((prev) => [
      ...prev,
      {
        activity_type: opt.activity_type,
        quantity: 0,
        unit: opt.unit,
        unit_process: opt.suggested_unit_process || null,
      },
    ]);
    setAddOpen(false);
  };

  const handleRemoveLineItem = (index: number) => {
    // Never allow removing the last remaining row — SME needs at least one line
    if (activities.length <= 1) return;
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

  const sectorDisplay = (schema as any)?.display_name || sectorId.replace(/_/g, " ");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header — no step indicator, since sector is already fixed at signup */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Log Facility Energy &amp; Activity Bills
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sector:{" "}
          <span className="font-medium text-gray-700 capitalize">{sectorDisplay}</span>
          {" · "}
          Enter your monthly or annual utility bills. CarbonIQ disaggregates them
          into process-level hotspots automatically.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5"
      >
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
              Energy &amp; Fuel Line Items
            </h3>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              CEA v20.0 (India Grid Factor: 0.7117 tCO₂/MWh)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
            {activities.map((act, index) => (
              <div
                key={`${act.activity_type}-${index}`}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-all group"
              >
                <div className="flex flex-col overflow-hidden pr-3 min-w-0">
                  <span className="text-[13px] font-semibold text-gray-900 capitalize truncate">
                    {getActivityLabel(act.activity_type)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={act.quantity === 0 ? "" : act.quantity}
                    onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                    placeholder="0"
                    className="w-24 px-2.5 py-1.5 text-[13px] font-semibold border border-gray-200 rounded-md bg-gray-50 text-gray-900 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-gray-400"
                  />
                  <span className="w-14 text-[11px] font-semibold text-gray-500 uppercase text-left">
                    {act.unit}
                  </span>

                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remove bill line"
                      aria-label="Remove line item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add line item — dropdown of remaining catalogue */}
          <div className="relative pt-1" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddOpen((s) => !s)}
              disabled={availableToAdd.length === 0}
              className="flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-700 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                {availableToAdd.length === 0
                  ? "All available line items added"
                  : "Add another utility bill line"}
              </span>
              {availableToAdd.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    addOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {addOpen && availableToAdd.length > 0 && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-30 animate-in fade-in-50 zoom-in-95 duration-100"
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                  Add for sector: {sectorDisplay}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {availableToAdd.map((opt) => (
                    <button
                      key={opt.activity_type}
                      type="button"
                      onClick={() => handleAddLineItem(opt)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-gray-900 capitalize truncate">
                          {opt.display_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                          {opt.unit}
                        </span>
                        <Check className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              Deterministic ISO 14064-1 &amp; GHG Protocol Scope 1, 2, 3 verification
            </span>
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
