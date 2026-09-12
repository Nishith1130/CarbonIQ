"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, removeToken } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import { LogOut, ArrowRight, FileSpreadsheet, BarChart3, Compass } from "lucide-react";

interface AppHeaderProps {
  currentRunId?: string;
}

export function AppHeader({ currentRunId }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getSession());
  }, []);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const navLinks = session
    ? [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: BarChart3,
          active: pathname === "/dashboard",
        },
        {
          href: "/entry",
          label: "New Bill Entry",
          icon: FileSpreadsheet,
          active: pathname === "/entry",
        },
        {
          href: "/onboarding",
          label: "Sectors",
          icon: Compass,
          active: pathname === "/onboarding",
        },
      ]
    : [
        {
          href: "/onboarding",
          label: "Sector Models",
          icon: Compass,
          active: pathname === "/onboarding",
        },
      ];

  if (currentRunId && session) {
    navLinks.splice(1, 0, {
      href: `/dashboard/${currentRunId}`,
      label: "Active Run",
      icon: BarChart3,
      active: pathname.startsWith(`/dashboard/${currentRunId}`),
    });
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/95 backdrop-blur border-b border-ash transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Left: Brand + Active Org Pill */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-midnight flex items-center justify-center text-canvas font-bold text-sm tracking-tight group-hover:bg-electric-blue transition-colors">
              C
            </div>
            <span className="font-semibold text-base tracking-tight text-midnight">
              Carbon<span className="text-electric-blue">IQ</span>
            </span>
          </Link>

          {mounted && session && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-paper border border-ash rounded-pill text-xs text-charcoal">
              <span className="w-2 h-2 rounded-full bg-vivid-green"></span>
              <span className="font-medium max-w-[140px] truncate">{session.org_name}</span>
              <span className="text-silver">•</span>
              <span className="text-steel font-mono uppercase text-[10px] tracking-wider">
                {session.sector_id.replace("_", " ")}
              </span>
            </div>
          )}
        </div>

        {/* Center: Clean Nav Items */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  link.active
                    ? "bg-paper text-midnight border border-ash"
                    : "text-steel hover:text-charcoal hover:bg-paper/60"
                }`}
              >
                <Icon className="w-4 h-4 text-graphite" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {mounted && session ? (
            <div className="flex items-center gap-3">
              <span className="hidden lg:inline-block text-xs font-mono text-fog">
                {session.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-ash bg-canvas hover:bg-paper text-xs text-steel hover:text-midnight transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-steel hover:text-midnight transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-midnight text-canvas hover:bg-charcoal text-sm font-medium transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
