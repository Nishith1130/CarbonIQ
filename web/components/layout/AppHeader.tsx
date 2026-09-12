"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, removeToken } from "../../lib/auth";
import { TokenResponse } from "../../lib/types";

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
        { href: "/dashboard", label: "Dashboard" },
        { href: "/entry", label: "New Entry" },
        { href: "/onboarding", label: "Sectors" },
      ]
    : [
        { href: "#", label: "Platform" },
        { href: "/onboarding", label: "Sectors" },
        { href: "#", label: "Resources" },
      ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto h-16 px-6 flex items-center justify-between">
        
        {/* Left Side: Logo & Main Links */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white font-bold text-sm tracking-tight transition-transform group-hover:scale-105">
              C
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#0A0A0A]">
              Carbon<span className="text-[#2563EB]">IQ</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Auth / Profile */}
        <div className="flex items-center gap-4">
          {mounted && session ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{session.org_name}</span>
                <span className="text-[11px] text-gray-500 font-mono">{session.email}</span>
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
