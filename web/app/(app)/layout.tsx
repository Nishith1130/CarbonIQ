"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { isAuthenticated } from "@/lib/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  // Extract runId if currently in /dashboard/[runId]
  const runIdMatch = pathname?.match(/\/dashboard\/([a-zA-Z0-9_-]+)/);
  const currentRunId = runIdMatch ? runIdMatch[1] : undefined;

  useEffect(() => {
    // Allow public access to sector catalog / onboarding without login
    if (pathname === "/onboarding") {
      setChecked(true);
      return;
    }

    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router, pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex items-center gap-2 text-steel text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></span>
          <span>Loading SME Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-charcoal flex flex-col font-sans selection:bg-electric-blue/10 selection:text-electric-blue">
      <AppHeader currentRunId={currentRunId} />
      
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-ash py-6 text-xs text-fog bg-paper/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-charcoal">CarbonIQ</span>
            <span>•</span>
            <span>CEA Grid Emission v20.0 (0.7117 tCO₂/MWh)</span>
            <span>•</span>
            <span>BEE SME Benchmark Database</span>
          </div>
          <div className="text-[11px] font-mono text-silver">
            ISO 14064-1 & SEBI BRSR Core Format
          </div>
        </div>
      </footer>
    </div>
  );
}
