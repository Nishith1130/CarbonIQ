"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { ArrowRight, AlertCircle, Sparkles, Building2, KeyRound, Mail, Map, Banknote } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sectorId, setSectorId] = useState("textile_dyeing");
  const [turnoverCrore, setTurnoverCrore] = useState("12.5");
  const [exportEU, setExportEU] = useState(true);
  const [exportUS, setExportUS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const export_markets: string[] = [];
    if (exportEU) export_markets.push("EU");
    if (exportUS) export_markets.push("US");

    const turnover_inr = parseFloat(turnoverCrore)
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
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-[calc(100vh-64px)] bg-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-midnight mb-3 leading-tight">
            Create Workspace
          </h2>
          <p className="text-base text-steel mb-10">
            Configure multi-tenant isolation, sector emission mapping, and BRSR compliance
          </p>
        </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-[560px]">
        <div className="bg-canvas border border-ash/80 shadow-sm rounded-2xl p-8 sm:p-10">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50/80 border border-red-100 flex items-start gap-3 text-sm text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-midnight mb-2">
                Company / Mill Legal Entity Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Dyeing & Printing Works LLP"
                className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-midnight mb-2">
                  Plant Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@surattextile.in"
                  className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-midnight mb-2">
                  Industrial Sector Cluster
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors appearance-none relative"
                >
                  <option value="textile_dyeing">Textile Dyeing & Processing</option>
                  <option value="foundry">Foundry & Metal Casting</option>
                  <option value="food_processing">Food Processing & Agro-Dairy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight mb-2">
                  Turnover (₹ Crore)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={turnoverCrore}
                  onChange={(e) => setTurnoverCrore(e.target.value)}
                  placeholder="15.0"
                  className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>
            </div>

            {/* Export Markets / Compliance Scope */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-midnight mb-3">
                Supply Chain / Export Compliance Scope
              </label>
              <div className="flex flex-col sm:flex-row gap-4 text-sm">
                <label className="flex items-center gap-3 cursor-pointer text-midnight group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={exportEU}
                      onChange={(e) => setExportEU(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span>EU (CBAM / Scope 3)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer text-midnight group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={exportUS}
                      onChange={(e) => setExportUS(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span>US / Global Export</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-midnight hover:bg-charcoal text-canvas text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span>Registering facility...</span>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </form>

          {/* Preset Button */}
          <div className="mt-8 pt-8 border-t border-ash/50">
            <button
              type="button"
              onClick={handleDemoPreset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-paper border border-ash hover:border-charcoal hover:bg-ash/20 text-sm text-charcoal font-medium transition-colors"
            >
              Autofill demo profile
            </button>
          </div>

          <div className="mt-10 text-center text-sm text-steel">
            Already have an active facility account?{" "}
            <Link
              href="/login"
              className="font-medium text-midnight hover:text-electric-blue transition-colors underline decoration-ash underline-offset-4 hover:decoration-electric-blue"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
