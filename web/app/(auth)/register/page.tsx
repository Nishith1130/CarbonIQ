"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 6;

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

  const [orgTouched, setOrgTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const orgError =
    orgTouched && orgName.trim() === "" ? "Company name is required." : null;

  const emailError =
    emailTouched && email.trim() === ""
      ? "Email is required."
      : emailTouched && !EMAIL_RE.test(email.trim())
      ? "Please enter a valid email address (name@example.com)."
      : null;

  const passwordError =
    passwordTouched && password.length === 0
      ? "Password is required."
      : passwordTouched && password.length < MIN_PASSWORD_LEN
      ? `Password must be at least ${MIN_PASSWORD_LEN} characters.`
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Trigger all validators
    setOrgTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (
      orgName.trim() === "" ||
      !EMAIL_RE.test(email.trim()) ||
      password.length < MIN_PASSWORD_LEN
    ) {
      return;
    }

    const export_markets: string[] = [];
    if (exportEU) export_markets.push("EU");
    if (exportUS) export_markets.push("US");

    const turnover_inr = parseFloat(turnoverCrore)
      ? Math.round(parseFloat(turnoverCrore) * 10000000)
      : undefined;

    setLoading(true);
    try {
      const resp = await apiClient<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          org_name: orgName.trim(),
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
        setError(
          "Registration failed. Please check connection to the backend server."
        );
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
    setOrgTouched(false);
    setEmailTouched(false);
    setPasswordTouched(false);
  };

  const inputBase =
    "w-full px-3.5 py-2.5 text-sm rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 transition-colors";
  const inputOk =
    "border border-ash focus:ring-midnight focus:border-midnight";
  const inputErr =
    "border border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/30";

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-paper">
      <AppHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-3 overflow-hidden">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-midnight leading-tight">
              Create Workspace
            </h2>
            <p className="text-xs text-steel mt-0.5">
              Multi-tenant isolation, sector emission mapping, BRSR compliance
            </p>
          </div>

          <div className="bg-canvas border border-ash/80 shadow-sm rounded-2xl p-5 sm:p-6">
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50/80 border border-red-100 flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {/* Company name */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1">
                  Company / Mill Legal Entity Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onBlur={() => setOrgTouched(true)}
                  placeholder="e.g. Apex Dyeing & Printing Works LLP"
                  aria-invalid={!!orgError}
                  aria-describedby={orgError ? "reg-org-error" : undefined}
                  className={`${inputBase} ${orgError ? inputErr : inputOk}`}
                />
                {orgError && (
                  <p
                    id="reg-org-error"
                    className="mt-1 flex items-center gap-1 text-[11px] text-red-600"
                  >
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {orgError}
                  </p>
                )}
              </div>

              {/* Email + Password */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1">
                    Plant Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="admin@surattextile.in"
                    aria-invalid={!!emailError}
                    aria-describedby={
                      emailError ? "reg-email-error" : undefined
                    }
                    className={`${inputBase} ${emailError ? inputErr : inputOk}`}
                  />
                  {emailError && (
                    <p
                      id="reg-email-error"
                      className="mt-1 flex items-center gap-1 text-[11px] text-red-600"
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder="••••••••"
                      aria-invalid={!!passwordError}
                      aria-describedby={
                        passwordError ? "reg-password-error" : undefined
                      }
                      className={`${inputBase} pr-10 ${
                        passwordError ? inputErr : inputOk
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-midnight transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p
                      id="reg-password-error"
                      className="mt-1 flex items-center gap-1 text-[11px] text-red-600"
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>

              {/* Sector + Turnover */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1">
                    Industrial Sector Cluster
                  </label>
                  <select
                    value={sectorId}
                    onChange={(e) => setSectorId(e.target.value)}
                    className={`${inputBase} ${inputOk} appearance-none`}
                  >
                    <option value="textile_dyeing">
                      Textile Dyeing &amp; Processing
                    </option>
                    <option value="foundry">Foundry &amp; Metal Casting</option>
                    <option value="food_processing">
                      Food Processing &amp; Agro-Dairy
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1">
                    Turnover (₹ Crore)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={turnoverCrore}
                    onChange={(e) => setTurnoverCrore(e.target.value)}
                    placeholder="15.0"
                    className={`${inputBase} ${inputOk}`}
                  />
                </div>
              </div>

              {/* Export Markets */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-midnight mb-1.5">
                  Supply Chain / Export Compliance Scope
                </label>
                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer text-midnight group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={exportEU}
                        onChange={(e) => setExportEU(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                      />
                      <svg
                        className="absolute w-3 h-3 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>EU (CBAM / Scope 3)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-midnight group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={exportUS}
                        onChange={(e) => setExportUS(e.target.checked)}
                        className="peer appearance-none w-4 h-4 border border-ash rounded bg-canvas checked:bg-midnight checked:border-midnight focus:outline-none focus:ring-2 focus:ring-midnight/30 transition-all cursor-pointer"
                      />
                      <svg
                        className="absolute w-3 h-3 text-canvas opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>US / Global Export</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span>Registering facility...</span>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </form>

            {/* Preset Button */}
            <div className="mt-3 pt-3 border-t border-ash/50">
              <button
                type="button"
                onClick={handleDemoPreset}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-paper border border-ash hover:border-charcoal hover:bg-ash/20 text-xs text-charcoal font-medium transition-colors"
              >
                Autofill demo profile
              </button>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-steel">
            Already have an account?{" "}
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
