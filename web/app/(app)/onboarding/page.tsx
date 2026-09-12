"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { Sector, TokenResponse } from "@/lib/types";
import { ArrowRight, Factory, Flame, Layers, CheckCircle2, AlertCircle } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeSession = getSession();
    setSession(activeSession);

    apiClient<Sector[]>("/sectors")
      .then((data) => {
        setSectors(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load sectors:", err);
        setError("Could not load sector catalog from backend.");
        setLoading(false);
      });
  }, []);

  const handleSelectSector = (sectorId: string) => {
    if (!session) {
      router.push(`/login`);
    } else {
      router.push(`/entry?sector=${sectorId}`);
    }
  };

  const getClusterInfo = (id: string) => {
    switch (id) {
      case "textile_dyeing":
        return {
          cluster: "Surat / Tirupur / Ahmedabad Hubs",
          thermal: "Coal & Steam 70%",
          electric: "Grid Electricity 30%",
          hotspotFocus: "Dyeing Bath • ETP • Stenter",
        };
      case "foundry":
        return {
          cluster: "Rajkot / Coimbatore / Belgaum Hubs",
          thermal: "Cupola Coke & Induction 80%",
          electric: "Compressors & Sand Plant 20%",
          hotspotFocus: "Melting Furnace • Sand Prep • Pouring",
        };
      case "food_processing":
        return {
          cluster: "Punjab / Pune / Haryana Agro-Belts",
          thermal: "Boiler & Pasteurization 60%",
          electric: "Cold Chain Chilling 40%",
          hotspotFocus: "Boiler • Chilling Compressors • CIP",
        };
      default:
        return {
          cluster: "Indian SME Cluster",
          thermal: "Thermal 65%",
          electric: "Electric 35%",
          hotspotFocus: "Process Heating • Drives",
        };
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Fetching sector taxonomies & emission benchmarks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
          <span>Step 1 of 3</span>
          <span>•</span>
          <span>Industrial Sector Baseline Taxonomy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Select Your Facility Sector Template
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 max-w-2xl">
          CarbonIQ applies Ministry of Power Bureau of Energy Efficiency (BEE) benchmark splits to allocate aggregate monthly utility bills into unit-level process emission hotspots.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Sector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sectors.map((sector) => {
          const isUserSector = session?.sector_id === sector.sector_id;
          const meta = getClusterInfo(sector.sector_id);

          return (
            <div
              key={sector.sector_id}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 relative group ${
                isUserSector ? "border-blue-500 ring-1 ring-blue-500/20" : "border-gray-200 hover:border-blue-200"
              }`}
            >
              {isUserSector && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-semibold tracking-wide uppercase text-blue-700 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facility Match</span>
                </div>
              )}

              <div>
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 mb-4 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">
                  <Factory className="w-5 h-5" />
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  {sector.name}
                </h3>
                <div className="text-[13px] font-semibold text-blue-600 mb-3">
                  {meta.cluster}
                </div>

                <p className="text-[13px] text-gray-500 leading-relaxed mb-4 line-clamp-3">
                  {sector.description}
                </p>

                {/* Energy & Hotspot Specs */}
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2 text-[13px] mb-5">
                  <div className="flex items-start justify-between gap-2 text-gray-700">
                    <span className="text-gray-500 font-medium whitespace-nowrap">Fuel Mix:</span>
                    <span className="text-gray-900 font-semibold text-right leading-snug">{meta.thermal}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 text-gray-700">
                    <span className="text-gray-500 font-medium whitespace-nowrap">Electricity:</span>
                    <span className="text-gray-900 font-semibold text-right leading-snug">{meta.electric}</span>
                  </div>
                  <div className="pt-2.5 mt-1 border-t border-gray-200/80">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Core Hotspots</span>
                    <span className="text-gray-900 font-medium leading-snug block">{meta.hotspotFocus}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelectSector(sector.sector_id)}
                className={`w-full py-2.5 px-4 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isUserSector
                    ? "bg-[#0A0A0A] hover:bg-black text-white"
                    : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-700"
                }`}
              >
                <span>Enter Energy Bills</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Cluster Benchmark Reference Note */}
      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3 text-[13px] text-gray-600">
        <Layers className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p>
          <strong className="text-gray-900 font-semibold block mb-0.5">BEE SME Benchmark Integration</strong> 
          Activity entries automatically inherit CEA v20.0 national emission grid factors (0.7117 tCO₂/MWh) and unit process split allocations calibrated from 150+ audited Indian SME industrial clusters.
        </p>
      </div>
    </div>
  );
}
