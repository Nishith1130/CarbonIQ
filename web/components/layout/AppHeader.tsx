"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, removeToken } from "@/lib/auth";
import { TokenResponse, RunResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

interface AppHeaderProps {
  currentRunId?: string;
}

export function AppHeader({ currentRunId }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [latestRunId, setLatestRunId] = useState<string | null>(currentRunId || null);

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    setSession(s);

    if (s && !currentRunId) {
      apiClient<RunResponse[]>("/runs")
        .then((runs) => {
          if (runs && runs.length > 0) {
            setLatestRunId(runs[0].id);
          }
        })
        .catch(() => {});
    }
  }, [currentRunId]);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const activeRunId = currentRunId || latestRunId;
  const reportsHref = activeRunId ? `/dashboard/${activeRunId}/report` : "/dashboard";
  const recommendationsHref = activeRunId ? `/dashboard/${activeRunId}/macc` : "/dashboard";

  const navLinks = session
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/entry", label: "Data Entry" },
        { href: reportsHref, label: "Reports" },
        { href: recommendationsHref, label: "Recommendations" },
        { href: "/settings", label: "Settings" },
      ]
    : [
        { href: "/#platform", label: "Platform" },
        { href: "/onboarding", label: "Sectors" },
        { href: "/#methodology", label: "Resources" },
      ];

  const isLinkActive = (href: string, label: string) => {
    if (!session) return false;
    if (label === "Dashboard") {
      return (
        pathname === "/dashboard" ||
        (pathname.startsWith("/dashboard/") &&
          !pathname.includes("/report") &&
          !pathname.includes("/macc"))
      );
    }
    if (label === "Data Entry") {
      return pathname === "/entry";
    }
    if (label === "Reports") {
      return pathname.includes("/report");
    }
    if (label === "Recommendations") {
      return pathname.includes("/macc");
    }
    if (label === "Settings") {
      return pathname === "/settings" || pathname === "/onboarding";
    }
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto h-16 px-6 flex items-center justify-between">
        
        {/* Left Side: Logo & Main Links */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white font-bold text-sm tracking-tight transition-transform group-hover:scale-105">
              C
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#0A0A0A]">
              Carbon<span className="text-[#2563EB]">IQ</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.label);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-[14px] lg:text-[15px] px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? "text-[#2563EB] bg-blue-50/80 font-semibold"
                      : "text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Auth / Profile */}
        <div className="flex items-center gap-4">
          {mounted && session ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{session.org_name}</span>
                <span className="text-[11px] text-gray-500">{session.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-[15px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all border border-gray-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-medium transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
