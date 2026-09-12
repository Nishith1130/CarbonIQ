"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, removeToken } from "@/lib/auth";
import { TokenResponse, RunResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { User, Settings, LogOut, LifeBuoy } from "lucide-react";

interface AppHeaderProps {
  currentRunId?: string;
}

export function AppHeader({ currentRunId }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [latestRunId, setLatestRunId] = useState<string | null>(currentRunId || null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const recommendationsHref = activeRunId ? `/dashboard/${activeRunId}/macc` : "/dashboard";

  const navLinks = session
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/entry", label: "Data Entry" },
        { href: "/reports", label: "Reports" },
        { href: recommendationsHref, label: "Recommendations" },
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
      return pathname === "/reports" || pathname.includes("/report");
    }
    if (label === "Recommendations") {
      return pathname.includes("/macc");
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
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full pl-2 pr-1 py-1 hover:bg-gray-50 transition-colors"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="font-semibold text-[13px] text-gray-900">
                  Rajesh Mehta
                </span>
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-semibold text-[12px] flex items-center justify-center ring-1 ring-blue-100">
                  RM
                </span>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <div className="text-sm font-semibold text-gray-900">
                      Rajesh Mehta
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      Owner · {session.org_name || "Surat Modern Dyeing Mills"}
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </Link>

                  <a
                    href="mailto:support@carboniq.example"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LifeBuoy className="w-4 h-4 text-gray-400" />
                    <span>Help &amp; Support</span>
                  </a>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
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
