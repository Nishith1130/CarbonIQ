"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { ArrowRight, AlertCircle, Sparkles, Building2 } from "lucide-react";

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
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-midnight flex items-center justify-center text-canvas font-bold text-base">
            C
          </div>
          <span className="font-semibold text-xl tracking-tight text-midnight">
            Carbon<span className="text-electric-blue">IQ</span>
          </span>
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight text-midnight">
          Register SME Industrial Facility
        </h2>
        <p className="mt-1 text-xs text-steel">
          Configure multi-tenant isolation, sector emission mapping, and BRSR compliance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-canvas border border-ash rounded-xl p-6 sm:p-8 shadow-subtle">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">
                Company / Mill Legal Entity Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Dyeing & Printing Works LLP"
                className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">
                  Plant Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@surattextile.in"
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">
                  Industrial Sector Cluster
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight focus:outline-none focus:border-midnight transition"
                >
                  <option value="textile_dyeing">Textile Dyeing & Processing</option>
                  <option value="foundry">Foundry & Metal Casting</option>
                  <option value="food_processing">Food Processing & Agro-Dairy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">
                  Annual Turnover (₹ Crore)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={turnoverCrore}
                  onChange={(e) => setTurnoverCrore(e.target.value)}
                  placeholder="15.0"
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
                />
              </div>
            </div>

            {/* Export Markets / Compliance Scope */}
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1.5">
                Supply Chain / Export Compliance Scope
              </label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-charcoal">
                  <input
                    type="checkbox"
                    checked={exportEU}
                    onChange={(e) => setExportEU(e.target.checked)}
                    className="rounded border-ash text-midnight focus:ring-0"
                  />
                  <span>EU (CBAM / Scope 3 Supply Chain)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-charcoal">
                  <input
                    type="checkbox"
                    checked={exportUS}
                    onChange={(e) => setExportUS(e.target.checked)}
                    className="rounded border-ash text-midnight focus:ring-0"
                  />
                  <span>US / Global Export</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? (
                <span>Registering facility...</span>
              ) : (
                <>
                  <span>Create SME Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset Button */}
          <div className="mt-5 pt-5 border-t border-ash">
            <button
              type="button"
              onClick={handleDemoPreset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-paper border border-ash hover:border-smoke text-xs text-charcoal font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
              <span>Autofill Sample Surat Textile SME Profile</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-steel">
            Already have an active facility account?{" "}
            <Link
              href="/login"
              className="font-medium text-electric-blue hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
