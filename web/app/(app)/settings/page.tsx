"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import {
  Building2,
  Factory,
  ShieldCheck,
  Globe2,
  Zap,
  Sliders,
  ArrowUpRight,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [verificationPref, setVerificationPref] = useState<string>("self-declared");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSession(getSession());
    const savedPref = localStorage.getItem("carboniq_verification_tier");
    if (savedPref) {
      setVerificationPref(savedPref);
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem("carboniq_verification_tier", verificationPref);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sectorName = session?.sector_id
    ? session.sector_id.replace("_", " ").toUpperCase()
    : "TEXTILE DYEING & PROCESSING";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Facility Settings & Compliance Scope
        </h1>
        <p className="text-base text-gray-500">
          Manage your registered facility profile, sector boundary defaults, and regulatory assurance tiers.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Facility reporting preferences saved successfully.</span>
        </div>
      )}

      {/* Facility Profile Card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Legal Entity Profile</h2>
            <p className="text-xs text-gray-500">Registered tenant workspace details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Legal Entity Name
            </label>
            <div className="font-medium text-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
              {session?.org_name || "Apex Dyeing & Printing Works LLP"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Plant Work Email
            </label>
            <div className="font-medium text-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
              {session?.email || "plant.admin@surattextile.in"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tenant Org ID
            </label>
            <div className="font-mono text-gray-600 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 text-xs">
              {session?.org_id || "57f3a9ca-6953-4f3e-9f4a-5eaca1f23c74"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Primary Industrial Cluster
            </label>
            <div className="flex items-center justify-between font-medium text-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
              <span className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-gray-600" />
                {sectorName}
              </span>
              <Link
                href="/onboarding"
                className="text-xs text-[#2563EB] hover:underline flex items-center gap-0.5"
              >
                Change <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verification & Assurance Tier Settings */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Verification & Assurance Level</h2>
            <p className="text-xs text-gray-500">Configure audit assurance tier for executive and BRSR report filing</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: "none",
                title: "None (Draft Entry)",
                desc: "Unverified internal estimation for operational screening.",
                tag: "Draft",
              },
              {
                id: "self-declared",
                title: "Self-Declared",
                desc: "Certified by plant CFO / Facility Director under BRSR Core self-declaration provisions.",
                tag: "Recommended for SMEs",
              },
              {
                id: "3rd-party pending",
                title: "3rd-Party Pending",
                desc: "Submitted for external verification audit under ISO 14064-3.",
                tag: "Audit In Progress",
              },
              {
                id: "assured",
                title: "Third-Party Assured",
                desc: "Reasonable assurance certificate issued by accredited audit body for EU CBAM & SEBI.",
                tag: "Highest Assurance",
              },
            ].map((tier) => (
              <label
                key={tier.id}
                onClick={() => setVerificationPref(tier.id)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer block ${
                  verificationPref === tier.id
                    ? "border-[#2563EB] bg-blue-50/40 shadow-xs"
                    : "border-gray-100 bg-gray-50/50 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-gray-900">{tier.title}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                    {tier.tag}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{tier.desc}</p>
              </label>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              Save Audit Preferences
            </button>
          </div>
        </div>
      </section>

      {/* Grid Emission Standards & Regulatory Reference */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Emission Factors & Regulatory References</h2>
            <p className="text-xs text-gray-500">Standards applied to all facility calculation runs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-gray-500 font-semibold mb-1">Grid Electricity EF</div>
            <div className="font-bold text-sm text-gray-900">0.7117 tCO₂/MWh</div>
            <p className="text-gray-500 mt-1">CEA CO₂ Baseline Database Version 20.0</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-gray-500 font-semibold mb-1">Reporting Framework</div>
            <div className="font-bold text-sm text-gray-900">SEBI BRSR Core</div>
            <p className="text-gray-500 mt-1">Mandatory ESG indicators for value chains</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-gray-500 font-semibold mb-1">Carbon Standard</div>
            <div className="font-bold text-sm text-gray-900">ISO 14064-1:2018</div>
            <p className="text-gray-500 mt-1">Specification with guidance for GHG inventories</p>
          </div>
        </div>
      </section>
    </div>
  );
}
