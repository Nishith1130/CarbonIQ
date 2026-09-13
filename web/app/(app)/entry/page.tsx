"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, API_BASE_URL, ApiError } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import {
  SectorSchemaResponse,
  ActivityInput,
  RunResponse,
  TokenResponse,
  ProcessOverride,
} from "@/lib/types";
import {
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Sliders,
  RotateCcw,
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

interface ParsedBillResponse {
  activities: ActivityInput[];
  file_count: number;
  warnings: string[];
}

type ActiveTab = "manual" | "pdf";

function BillEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [sectorId, setSectorId] = useState<string>("textile_dyeing");
  const [schema, setSchema] = useState<SectorSchemaResponse | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("manual");

  // Manual entry — start with ONLY electricity. SME adds everything else.
  const [activities, setActivities] = useState<ActivityInput[]>([
    { activity_type: "electricity_grid", quantity: 0, unit: "kWh" },
  ]);
  const [periodStart, setPeriodStart] = useState("2024-04-01");
  const [periodEnd, setPeriodEnd] = useState("2025-03-31");

  // "Add another line" dropdown
  const [addOpen, setAddOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // PDF upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseSuccess, setParseSuccess] = useState(false);

  // --- Option 2: Process energy breakdown overrides ---
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [overridesEnabled, setOverridesEnabled] = useState(false);
  const [electricOverrides, setElectricOverrides] = useState<Record<string, number>>({});
  const [thermalOverrides, setThermalOverrides] = useState<Record<string, number>>({});

  // Common
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
        // Initialize overrides from sector template defaults
        if (data?.unit_processes) {
          const elec: Record<string, number> = {};
          const therm: Record<string, number> = {};
          for (const p of data.unit_processes) {
            elec[p.id] = p.typical_electric_share_pct ?? 0;
            therm[p.id] = p.typical_thermal_share_pct ?? 0;
          }
          setElectricOverrides(elec);
          setThermalOverrides(therm);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  // ── Manual entry helpers ────────────────────────────────────────────────
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
    if (activities.length <= 1) return;
    setActivities(activities.filter((_, i) => i !== index));
  };

  // ── PDF upload helpers ──────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type.startsWith("image/") ||
        f.name.endsWith(".pdf")
    );
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
    setParseSuccess(false);
    setParseWarnings([]);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setParseSuccess(false);
  };

  const handleParsePDFs = async () => {
    if (!uploadedFiles.length) return;
    setParsing(true);
    setError(null);
    setParseWarnings([]);
    setParseSuccess(false);

    try {
      const formData = new FormData();
      uploadedFiles.forEach((f) => formData.append("files", f));

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("carboniq_token")
          : null;
      const res = await fetch(`${API_BASE_URL}/upload/bills`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.detail || "Parsing failed.");
      }

      const data: ParsedBillResponse = await res.json();

      if (data.activities && data.activities.length > 0) {
        setActivities(
          data.activities.map((a) => ({
            activity_type: a.activity_type,
            quantity: Number(a.quantity) || 0,
            unit: a.unit,
            unit_process: a.unit_process || null,
            month: a.month || undefined,
          }))
        );
        setParseSuccess(true);
        setParseWarnings(data.warnings || []);
        setTimeout(() => setActiveTab("manual"), 1200);
      } else {
        setError("No activity data could be extracted from the uploaded files.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during parsing.");
    } finally {
      setParsing(false);
    }
  };

  // ── Option 2: Override helpers ─────────────────────────────────────────
  const unitProcesses = schema?.unit_processes || [];

  const electricTotal = useMemo(
    () => Object.values(electricOverrides).reduce((s, v) => s + v, 0),
    [electricOverrides]
  );
  const thermalTotal = useMemo(
    () => Object.values(thermalOverrides).reduce((s, v) => s + v, 0),
    [thermalOverrides]
  );

  const handleElectricSlider = (pid: string, val: number) => {
    setElectricOverrides((prev) => ({ ...prev, [pid]: val }));
    if (!overridesEnabled) setOverridesEnabled(true);
  };
  const handleThermalSlider = (pid: string, val: number) => {
    setThermalOverrides((prev) => ({ ...prev, [pid]: val }));
    if (!overridesEnabled) setOverridesEnabled(true);
  };

  const resetOverridesToDefaults = () => {
    if (schema?.unit_processes) {
      const elec: Record<string, number> = {};
      const therm: Record<string, number> = {};
      for (const p of schema.unit_processes) {
        elec[p.id] = p.typical_electric_share_pct ?? 0;
        therm[p.id] = p.typical_thermal_share_pct ?? 0;
      }
      setElectricOverrides(elec);
      setThermalOverrides(therm);
    }
    setOverridesEnabled(false);
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validActivities = activities.filter((a) => a.quantity > 0);
    if (validActivities.length === 0) {
      setError("Please enter at least one utility bill quantity greater than zero.");
      return;
    }

    // Build process_overrides payload if user adjusted sliders
    let processOverrides: ProcessOverride[] | null = null;
    if (overridesEnabled && unitProcesses.length > 0) {
      processOverrides = unitProcesses.map((p) => ({
        unit_process_id: p.id,
        electric_share_pct: electricOverrides[p.id] ?? 0,
        thermal_share_pct: thermalOverrides[p.id] ?? 0,
      }));
    }

    setSubmitting(true);
    try {
      const result = await apiClient<RunResponse>("/runs", {
        method: "POST",
        body: JSON.stringify({
          org_id: session?.org_id || null,
          sector_id: sectorId,
          period_start: periodStart,
          period_end: periodEnd,
          region: "IN_all_india",
          activities: validActivities,
          process_overrides: processOverrides,
        }),
      });
      router.push(`/dashboard/${result.id}?fresh=1`);
    } catch (err: any) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Error processing emission calculation run."
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Loading sector bill templates...</span>
        </div>
      </div>
    );
  }

  const sectorDisplay = (schema as any)?.display_name || sectorId.replace(/_/g, " ");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header — no step indicator, sector is fixed at signup */}
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

      {/* Tab switcher — Manual Entry / PDF Upload */}
      <div className="flex gap-1 p-1 bg-gray-100 border border-gray-200 rounded-xl w-fit">
        <button
          id="tab-manual"
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === "manual"
              ? "bg-white border border-gray-200 shadow-sm text-gray-900 font-semibold"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Manual Entry
        </button>
        <button
          id="tab-pdf"
          type="button"
          onClick={() => setActiveTab("pdf")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === "pdf"
              ? "bg-white border border-gray-200 shadow-sm text-gray-900 font-semibold"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          PDF Upload
          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
            AI
          </span>
        </button>
      </div>

      {/* ── PDF UPLOAD PANEL ─────────────────────────────────────────────── */}
      {activeTab === "pdf" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              AI-Powered Bill Extraction
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Upload one or more PDF utility bills. Gemini AI will read them and
              auto-fill the entry table below. You can review &amp; edit before
              submitting.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            id="pdf-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
            }`}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div
              className={`p-3 rounded-full border ${
                isDragging
                  ? "border-blue-300 bg-blue-100"
                  : "border-gray-200 bg-white"
              } transition`}
            >
              <Upload
                className={`w-6 h-6 ${
                  isDragging ? "text-blue-600" : "text-gray-400"
                }`}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {isDragging ? "Drop files here" : "Drag & drop PDF bills here"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                or click to browse — PDF, PNG, JPG supported
              </p>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Selected Files ({uploadedFiles.length})
              </p>
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 tabular-nums">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-gray-400 hover:text-red-600 transition"
                    aria-label="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Status feedback */}
          {parseSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>
                Data extracted successfully! Switching to Manual Entry so you can
                review and edit before submitting.
              </span>
            </div>
          )}
          {parseWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[11px] font-semibold text-amber-700 mb-1">
                Warnings:
              </p>
              {parseWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600">
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Extract Button */}
          <button
            id="btn-extract-pdf"
            type="button"
            onClick={handleParsePDFs}
            disabled={parsing || uploadedFiles.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gemini is reading your bills...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Extract Data from {uploadedFiles.length || 0} File
                  {uploadedFiles.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── MANUAL ENTRY FORM ────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6"
        >
          {/* Auto-fill notice from PDF parse */}
          {parseSuccess && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                The table below was auto-filled from your uploaded bills. Please
                review and correct any values before submitting.
              </span>
            </div>
          )}

          {/* Accounting Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Billing Period Start Date
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Billing Period End Date
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Activity Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Energy &amp; Fuel Line Items
              </h3>
              <span className="text-[11px] font-mono text-gray-400 tabular-nums">
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
                    Add for sector:{" "}
                    <span className="capitalize">{sectorDisplay}</span>
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

          {/* ── OPTION 2: CUSTOMISE ENERGY BREAKDOWN PANEL ───────────── */}
          {unitProcesses.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden transition-all">
              {/* Panel Header — toggle */}
              <button
                type="button"
                onClick={() => setOverridesOpen((s) => !s)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
                    <Sliders className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <span className="text-[13px] font-semibold text-gray-900 block">
                      Customise Process Energy Shares
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {overridesEnabled
                        ? "Using your custom breakdown"
                        : "Using BEE sector-template defaults"}
                    </span>
                  </div>
                  {overridesEnabled && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                      Custom
                    </span>
                  )}
                </div>
                {overridesOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Panel Body — sliders */}
              {overridesOpen && (
                <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-100">
                  <p className="text-[11px] text-gray-500">
                    Adjust how your total electricity and fuel consumption is split across factory processes.
                    Shares should sum to 100%. If you don't know, leave the defaults.
                  </p>

                  {/* Electrical Shares */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Electrical Energy Shares
                      </h4>
                      <span
                        className={`text-[11px] font-mono font-semibold tabular-nums ${
                          Math.abs(electricTotal - 100) < 0.5
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {electricTotal}%{" "}
                        {Math.abs(electricTotal - 100) < 0.5 ? "✓" : "≠ 100%"}
                      </span>
                    </div>
                    {unitProcesses.map((p) => (
                      <div key={`elec-${p.id}`} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] text-gray-700 truncate max-w-[60%]">
                            {p.name}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={electricOverrides[p.id] ?? 0}
                              onChange={(e) =>
                                handleElectricSlider(p.id, Number(e.target.value))
                              }
                              className="w-28 h-1.5 accent-blue-600 cursor-pointer"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={electricOverrides[p.id] ?? 0}
                              onChange={(e) =>
                                handleElectricSlider(p.id, Number(e.target.value) || 0)
                              }
                              className="w-14 px-1.5 py-1 text-[12px] font-semibold text-right border border-gray-200 rounded-md bg-gray-50 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 w-3">%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Thermal Shares */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Thermal Energy Shares
                      </h4>
                      <span
                        className={`text-[11px] font-mono font-semibold tabular-nums ${
                          Math.abs(thermalTotal - 100) < 0.5
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {thermalTotal}%{" "}
                        {Math.abs(thermalTotal - 100) < 0.5 ? "✓" : "≠ 100%"}
                      </span>
                    </div>
                    {unitProcesses.map((p) => (
                      <div key={`therm-${p.id}`} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] text-gray-700 truncate max-w-[60%]">
                            {p.name}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={thermalOverrides[p.id] ?? 0}
                              onChange={(e) =>
                                handleThermalSlider(p.id, Number(e.target.value))
                              }
                              className="w-28 h-1.5 accent-orange-500 cursor-pointer"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={thermalOverrides[p.id] ?? 0}
                              onChange={(e) =>
                                handleThermalSlider(p.id, Number(e.target.value) || 0)
                              }
                              className="w-14 px-1.5 py-1 text-[12px] font-semibold text-right border border-gray-200 rounded-md bg-gray-50 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                            <span className="text-[10px] text-gray-400 w-3">%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reset Button */}
                  <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetOverridesToDefaults}
                      className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to BEE Sector Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>
                Deterministic ISO 14064-1 &amp; GHG Protocol Scope 1, 2, 3
                verification
              </span>
            </div>

            <button
              id="btn-calculate"
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating Baseline Hotspots...</span>
                </>
              ) : (
                <>
                  <span>Calculate Emission Baseline</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function BillEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs font-mono text-gray-400">
          Loading Bill Entry...
        </div>
      }
    >
      <BillEntryContent />
    </Suspense>
  );
}
