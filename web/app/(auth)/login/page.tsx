"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { ArrowRight, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";

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
      router.push("/onboarding");
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
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-midnight flex items-center justify-center text-canvas font-bold text-base">
            C
          </div>
          <span className="font-semibold text-xl tracking-tight text-midnight">
            Carbon<span className="text-electric-blue">IQ</span>
          </span>
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight text-midnight">
          Sign in to your SME Workspace
        </h2>
        <p className="mt-1.5 text-xs text-steel">
          Enter your registered industrial facility credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
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
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="plant.manager@enterprise.com"
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-charcoal">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-ash rounded-input bg-canvas text-midnight placeholder:text-fog focus:outline-none focus:border-midnight transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-midnight hover:bg-charcoal text-canvas text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill Button */}
          <div className="mt-5 pt-5 border-t border-ash text-center">
            <button
              type="button"
              onClick={handleDemoPreset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-paper border border-ash hover:border-smoke text-xs text-charcoal font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
              <span>Autofill Surat Textile Mill Demo Account</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-steel">
            Don&apos;t have an SME account yet?{" "}
            <Link
              href="/register"
              className="font-medium text-electric-blue hover:underline"
            >
              Register Facility
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
