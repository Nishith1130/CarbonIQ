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
    router.push(`/entry?sector=${sectorId}`);
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
        <div className="flex items-center gap-2 text-xs font-mono text-fog uppercase tracking-wider mb-1">
          <span>Step 1 of 3</span>
          <span>•</span>
          <span>Industrial Sector Baseline Taxonomy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-midnight">
          Select Your Facility Sector Template
        </h1>
        <p className="mt-1.5 text-sm text-steel max-w-2xl">
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
              className={`bg-canvas border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-smoke hover:shadow-subtle relative ${
                isUserSector ? "border-midnight ring-1 ring-midnight/10" : "border-ash"
              }`}
            >
              {isUserSector && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-pill bg-paper border border-ash text-[10px] font-mono text-midnight flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-vivid-green" />
                  <span>Facility Match</span>
                </div>
              )}

              <div>
                <div className="w-10 h-10 rounded-lg bg-paper border border-ash flex items-center justify-center text-midnight mb-4">
                  <Factory className="w-5 h-5 text-graphite" />
                </div>

                <h3 className="font-semibold text-base text-midnight mb-1">
                  {sector.name}
                </h3>
                <div className="text-xs font-mono text-fog mb-3">
                  {meta.cluster}
                </div>

                <p className="text-xs text-steel leading-relaxed mb-4 line-clamp-3">
                  {sector.description}
                </p>

                {/* Energy & Hotspot Specs */}
                <div className="p-3 bg-paper/50 border border-ash/70 rounded-lg space-y-1.5 text-xs font-mono mb-4">
                  <div className="flex items-center justify-between text-charcoal">
                    <span className="text-fog">Fuel Mix:</span>
                    <span>{meta.thermal}</span>
                  </div>
                  <div className="flex items-center justify-between text-charcoal">
                    <span className="text-fog">Electricity:</span>
                    <span>{meta.electric}</span>
                  </div>
                  <div className="pt-1 border-t border-ash/50 text-[11px] text-steel">
                    <span className="text-fog block mb-0.5">Core Hotspots:</span>
                    <span className="font-sans font-medium text-midnight">{meta.hotspotFocus}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelectSector(sector.sector_id)}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  isUserSector
                    ? "bg-midnight hover:bg-charcoal text-canvas"
                    : "bg-paper hover:bg-canvas border border-ash text-charcoal"
                }`}
              >
                <span>Enter Energy Bills</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Cluster Benchmark Reference Note */}
      <div className="p-4 bg-paper/40 border border-ash rounded-xl flex items-start gap-3 text-xs text-steel">
        <Layers className="w-4 h-4 text-electric-blue flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-midnight font-medium">BEE SME Benchmark Integration:</strong> Activity entries automatically inherit CEA v20.0 national emission grid factors (0.7117 tCO₂/MWh) and unit process split allocations calibrated from 150+ audited Indian SME industrial clusters.
        </p>
      </div>
    </div>
  );
}
