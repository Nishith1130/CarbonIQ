"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import {
  AlertCircle,
  Sparkles,
  Flame,
  Factory,
  ChevronDown,
  Check,
  Layers,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

const SECTOR_OPTIONS = [
  {
    id: "textile_dyeing",
    label: "Textile Dyeing & Processing",
    icon: Sparkles,
  },
  {
    id: "foundry",
    label: "Foundry & Metal Casting",
    icon: Flame,
  },
  {
    id: "food_processing",
    label: "Food Processing & Agro-Dairy",
    icon: Factory,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sectorId, setSectorId] = useState(""); // initially empty with placeholder "Choose an option"
  const [turnoverCrore, setTurnoverCrore] = useState(""); // initially empty
  const [exportEU, setExportEU] = useState(true);
  const [exportUS, setExportUS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedSector = SECTOR_OPTIONS.find((s) => s.id === sectorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sectorId) {
      setError("Please choose an industrial sector cluster.");
      return;
    }

    setLoading(true);

    const export_markets: string[] = [];
    if (exportEU) export_markets.push("EU");
    if (exportUS) export_markets.push("US");

    const turnover_inr = turnoverCrore && parseFloat(turnoverCrore)
      ? Math.round(parseFloat(turnoverCrore) * 10000000)
      : undefined;

    try {
      const resp = await apiClient<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          org_name: orgName,
          sector_id: sectorId,
          turnover_inr,
          export_markets,
        }),
      });

      saveSession(resp);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Registration failed. Please check connection to the backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPreset = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
    setOrgName(`Surat Dyeing Mills #${timestamp}`);
    setEmail(`mill.${timestamp}@surattextile.in`);
    setPassword("surat1234");
    setSectorId("textile_dyeing");
    setTurnoverCrore("15");
    setExportEU(true);
    setExportUS(false);
    setError(null);
  };

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-paper">
      <AppHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-2 overflow-hidden">
        <div className="w-full max-w-[540px]">
          <div className="text-center mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-midnight leading-tight">
              Create Workspace
            </h1>
            <p className="text-xs sm:text-sm text-steel mt-0.5">
              Configure multi-tenant isolation and BRSR compliance
            </p>
          </div>

          <div className="bg-canvas border border-ash/80 shadow-sm rounded-2xl p-5 sm:p-6">
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50/80 border border-red-100 flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1">
                  Company / Mill Legal Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apex Dyeing & Printing Works LLP"
                  className="w-full px-3.5 py-2 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1">
                    Plant Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@surattextile.in"
                    className="w-full px-3.5 py-2 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custom Styled Sector Cluster Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1">
                    Industrial Sector Cluster
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className={`w-full px-3.5 py-2 text-sm border rounded-xl bg-canvas flex items-center justify-between text-left transition-colors focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight ${
                      isDropdownOpen ? "border-midnight ring-1 ring-midnight" : "border-ash hover:border-charcoal/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {selectedSector ? (
                        <>
                          <selectedSector.icon className="w-4 h-4 text-midnight flex-shrink-0" />
                          <span className="text-midnight font-medium truncate">
                            {selectedSector.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4 text-silver flex-shrink-0" />
                          <span className="text-silver">Choose an option</span>
                        </>
                      )}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-steel flex-shrink-0 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180 text-midnight" : ""
                      }`}
                    />
                  </button>

                  {/* Floating Styled Menu (styled matching Image 2) */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-canvas border border-ash/80 rounded-2xl shadow-xl p-1.5 z-40 space-y-1 backdrop-blur-sm animate-in fade-in-50 zoom-in-95 duration-100">
                      {SECTOR_OPTIONS.map((opt) => {
                        const isSelected = sectorId === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSectorId(opt.id);
                              setIsDropdownOpen(false);
                              setError(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                              isSelected
                                ? "bg-amber-50/90 text-amber-900 border border-amber-200/60 shadow-xs"
                                : "text-charcoal hover:bg-ash/20 border border-transparent"
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <Icon
                                className={`w-4 h-4 flex-shrink-0 ${
                                  isSelected ? "text-amber-600" : "text-steel"
                                }`}
                              />
                              <span className="truncate">{opt.label}</span>
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-600 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1">
                    Turnover (₹ Crore)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={turnoverCrore}
                    onChange={(e) => setTurnoverCrore(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-full px-3.5 py-2 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                  />
                </div>
              </div>

              {/* Export Markets / Compliance Scope */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1.5">
                  Supply Chain / Export Compliance Scope
                </label>
                <div className="flex flex-row gap-5 text-xs sm:text-sm">
                  <label className="flex items-center gap-2.5 cursor-pointer text-midnight group select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={exportEU}
                        onChange={(e) => setExportEU(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>EU (CBAM / Scope 3)</span>
                  </label>
                  
                  <label className="flex items-center gap-2.5 cursor-pointer text-midnight group select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={exportUS}
                        onChange={(e) => setExportUS(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>US / Global Export</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
              >
                {loading ? (
                  <span>Registering facility...</span>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-fill Button */}
            <div className="mt-3 pt-3 border-t border-ash/50">
              <button
                type="button"
                onClick={handleDemoPreset}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-paper border border-ash hover:border-charcoal hover:bg-ash/20 text-xs text-charcoal font-medium transition-colors"
              >
                Autofill demo profile
              </button>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-steel">
            Already have an active facility account?{" "}
            <Link
              href="/login"
              className="font-semibold text-midnight hover:text-electric-blue transition-colors underline decoration-ash underline-offset-4 hover:decoration-electric-blue"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
