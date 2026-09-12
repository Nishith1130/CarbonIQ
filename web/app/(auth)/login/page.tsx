"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { AlertCircle } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await apiClient<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveSession(resp);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to connect to authentication service. Please check your backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPreset = () => {
    setEmail("surat.mill@example.com");
    setPassword("textile123");
  };

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-paper">
      <AppHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-2 overflow-hidden">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-midnight leading-tight">
              Welcome back
            </h1>
            <p className="text-sm text-steel mt-1">
              Sign in to your CarbonIQ account
            </p>
          </div>

          <div className="bg-canvas border border-ash/80 shadow-sm rounded-2xl p-6 sm:p-7">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50/80 border border-red-100 flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-midnight uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="plant.manager@enterprise.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-midnight uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-steel hover:text-midnight transition-colors">
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-fill Button */}
            <div className="mt-4 pt-4 border-t border-ash/50">
              <button
                type="button"
                onClick={handleDemoPreset}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-paper border border-ash hover:border-charcoal hover:bg-ash/20 text-xs text-charcoal font-medium transition-colors"
              >
                Autofill demo credentials
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-steel">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-midnight hover:text-electric-blue transition-colors underline decoration-ash underline-offset-4 hover:decoration-electric-blue"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
