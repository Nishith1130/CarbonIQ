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
    <>
      <AppHeader />
      <div className="min-h-[calc(100vh-64px)] bg-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
          <h2 className="text-3xl font-bold tracking-tight text-midnight mb-3 leading-tight">
            Welcome back
          </h2>
          <p className="text-base text-steel mb-10">
            Sign in to your CarbonIQ account
          </p>
        </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-[480px]">
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
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="plant.manager@enterprise.com"
                className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-midnight">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-steel hover:text-midnight transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border border-ash rounded-xl bg-canvas text-midnight placeholder:text-silver focus:outline-none focus:ring-1 focus:ring-midnight focus:border-midnight transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-midnight hover:bg-charcoal text-canvas text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill Button */}
          <div className="mt-8 pt-8 border-t border-ash/50">
            <button
              type="button"
              onClick={handleDemoPreset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-paper border border-ash hover:border-charcoal hover:bg-ash/20 text-sm text-charcoal font-medium transition-colors"
            >
              Autofill demo credentials
            </button>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-steel">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-midnight hover:text-electric-blue transition-colors underline decoration-ash underline-offset-4 hover:decoration-electric-blue"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
