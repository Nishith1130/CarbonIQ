"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, API_BASE_URL, ApiError } from "@/lib/api-client";
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
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedBillResponse {
  activities: ActivityInput[];
  file_count: number;
  warnings: string[];
}

// ─── Tab Toggle ───────────────────────────────────────────────────────────────

type ActiveTab = "manual" | "pdf";

// ─── Main Content ─────────────────────────────────────────────────────────────

function BillEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [sectorId, setSectorId] = useState<string>("textile_dyeing");
  const [schema, setSchema] = useState<SectorSchemaResponse | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("manual");

  // Manual entry state
  const [activities, setActivities] = useState<ActivityInput[]>([
    { activity_type: "electricity_grid", quantity: 0, unit: "kWh" },
    { activity_type: "coal_indian_bituminous", quantity: 0, unit: "kg" },
    { activity_type: "diesel_hsd", quantity: 0, unit: "litre" },
  ]);
  const [periodStart, setPeriodStart] = useState("2024-04-01");
  const [periodEnd, setPeriodEnd] = useState("2025-03-31");

  // PDF upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseSuccess, setParseSuccess] = useState(false);

  // Common state
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
      .catch(() => setLoading(false));
  }, [searchParams]);

  // ── Demo preset ─────────────────────────────────────────────────────────────
  const handleLoadSuratDemo = () => {
    setSectorId("textile_dyeing");
    setPeriodStart("2024-04-01");
    setPeriodEnd("2025-03-31");
    setActivities([
      { activity_type: "electricity_grid", quantity: 100000, unit: "kWh", unit_process: null },
      { activity_type: "coal_indian_bituminous", quantity: 40000, unit: "kg", unit_process: null },
      { activity_type: "diesel_hsd", quantity: 1000, unit: "litre", unit_process: null },
    ]);
    setActiveTab("manual");
  };

  // ── Manual entry helpers ─────────────────────────────────────────────────────
  const handleUpdateQuantity = (index: number, val: string) => {
    const q = parseFloat(val) || 0;
    const updated = [...activities];
    updated[index].quantity = q;
    setActivities(updated);
  };

  const handleAddLineItem = () => {
    setActivities([...activities, { activity_type: "electricity_grid", quantity: 0, unit: "kWh" }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  // ── PDF upload helpers ───────────────────────────────────────────────────────
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

      const token = typeof window !== "undefined" ? localStorage.getItem("carboniq_token") : null;
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
        // Auto-fill the manual entry table and switch to it
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
        // Switch to manual tab so user can review
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

  // ── Submit ───────────────────────────────────────────────────────────────────
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
      const result = await apiClient<RunResponse>("/runs", {
        method: "POST",
        body: JSON.stringify({
          org_id: session?.org_id || null,
          sector_id: sectorId,
          period_start: periodStart,
          period_end: periodEnd,
          region: "IN_all_india",
          activities: validActivities,
        }),
      });
      router.push(`/dashboard/${result.id}`);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Error processing emission calculation run.");
      setSubmitting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getActivityIcon = (type: string) => {
    if (type.includes("electric")) return <Zap className="w-4 h-4 text-blue-600" />;
    if (type.includes("coal") || type.includes("biomass") || type.includes("gas"))
      return <Flame className="w-4 h-4 text-orange-500" />;
    return <Fuel className="w-4 h-4 text-gray-500" />;
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
        <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Loading sector bill templates...</span>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Step and Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
            <span>Step 2 of 3</span>
            <span>•</span>
            <span>Utility &amp; Fuel Bill Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Log Facility Energy &amp; Activity Bills
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter bills manually or upload PDFs — CarbonIQ extracts and disaggregates into process hotspots.
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

      {/* Tab Switcher */}
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
          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">AI</span>
        </button>
      </div>

      {/* ── PDF UPLOAD PANEL ─────────────────────────────────────────────────── */}
      {activeTab === "pdf" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI-Powered Bill Extraction</h2>
            <p className="text-xs text-gray-500 mt-1">
              Upload one or more PDF utility bills. Gemini AI will read them and auto-fill the entry table below. You can review &amp; edit before submitting.
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
            <div className={`p-3 rounded-full border ${isDragging ? "border-blue-300 bg-blue-100" : "border-gray-200 bg-white"} transition`}>
              <Upload className={`w-6 h-6 ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {isDragging ? "Drop files here" : "Drag & drop PDF bills here"}
              </p>
              <p className="text-xs text-gray-400 mt-1">or click to browse — PDF, PNG, JPG supported</p>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Selected Files ({uploadedFiles.length})</p>
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{file.name}</span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-gray-400 hover:text-red-600 transition"
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
                Data extracted successfully! Switching to Manual Entry so you can review and edit before submitting.
              </span>
            </div>
          )}
          {parseWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[11px] font-semibold text-amber-700 mb-1">Warnings:</p>
              {parseWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600">{w}</p>
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
                <span>Extract Data from {uploadedFiles.length || 0} File{uploadedFiles.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── MANUAL ENTRY FORM ─────────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* If auto-filled from PDF, show a notice */}
          {parseSuccess && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                The table below was auto-filled from your uploaded bills. Please review and correct any values before submitting.
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
              <h3 className="text-sm font-semibold text-gray-900">Energy &amp; Fuel Line Items</h3>
              <span className="text-[11px] font-mono text-gray-400">
                CEA v20.0 (India Grid Factor: 0.7117 tCO₂/MWh)
              </span>
            </div>

            <div className="space-y-2.5">
              {activities.map((act, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-lg transition hover:border-gray-300"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <div className="p-1.5 rounded bg-white border border-gray-200 flex items-center justify-center">
                      {getActivityIcon(act.activity_type)}
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-900 block">
                        {getActivityLabel(act.activity_type)}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
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
                        className="w-full px-3 py-1.5 text-sm font-mono border border-gray-200 rounded-lg bg-white text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <span className="w-16 text-xs font-mono text-gray-500">{act.unit}</span>
                    {activities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
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
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium pt-2 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another utility bill line</span>
            </button>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Deterministic ISO 14064-1 &amp; GHG Protocol Scope 1, 2, 3 verification</span>
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
