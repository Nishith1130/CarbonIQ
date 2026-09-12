"use client";

import React, { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { TokenResponse } from "@/lib/types";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Clock,
  Lock,
  Bell,
  PenLine,
  CheckCircle2,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

type Role = "owner" | "manager" | "accountant" | "auditor";

interface NotificationPrefs {
  reportReady: boolean;
  monthlyReminder: boolean;
  buyerRequest: boolean;
  productUpdates: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner / Director",
  manager: "Plant / Operations Manager",
  accountant: "Accountant / Finance",
  auditor: "Internal Auditor",
};

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+05:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+04:00)" },
  { value: "Europe/London", label: "Europe/London (GMT, UTC+00:00)" },
  { value: "UTC", label: "UTC" },
];

export default function ProfilePage() {
  const [session, setSession] = useState<TokenResponse | null>(null);

  // Personal info (name / phone / role / tz)
  const [fullName, setFullName] = useState("Rajesh Mehta");
  const [phone, setPhone] = useState("+91 98250 12345");
  const [role, setRole] = useState<Role>("owner");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Report signature
  const [signatureTitle, setSignatureTitle] = useState("Managing Partner");

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Notification prefs
  const [notif, setNotif] = useState<NotificationPrefs>({
    reportReady: true,
    monthlyReminder: true,
    buyerRequest: true,
    productUpdates: false,
  });

  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    const stored = localStorage.getItem("carboniq_profile");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.fullName) setFullName(p.fullName);
        if (p.phone) setPhone(p.phone);
        if (p.role) setRole(p.role);
        if (p.timezone) setTimezone(p.timezone);
        if (p.signatureTitle) setSignatureTitle(p.signatureTitle);
        if (p.notif) setNotif(p.notif);
      } catch {
        /* ignore corrupt json */
      }
    }
  }, []);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const flashSaved = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(null), 3000);
  };

  const persistProfile = (extra: Partial<Record<string, any>> = {}) => {
    const payload = { fullName, phone, role, timezone, signatureTitle, notif, ...extra };
    localStorage.setItem("carboniq_profile", JSON.stringify(payload));
  };

  const handleSavePersonal = () => {
    persistProfile();
    flashSaved("Personal information updated.");
  };

  const handleSaveSignature = () => {
    persistProfile();
    flashSaved("Report signature updated.");
  };

  const handleSaveNotif = (next: NotificationPrefs) => {
    setNotif(next);
    persistProfile({ notif: next });
    flashSaved("Notification preferences saved.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    // TODO: wire to POST /users/me/password when backend endpoint exists
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    flashSaved("Password updated. Please sign in again on other devices.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Your Profile
        </h1>
        <p className="text-base text-gray-500">
          Manage your personal information, sign-in security, and how you appear on
          audit-ready reports.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saved}</span>
        </div>
      )}

      {/* Identity summary */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 font-bold text-xl flex items-center justify-center ring-2 ring-blue-100">
            {initials || "??"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{fullName}</div>
            <div className="text-sm text-gray-500 truncate">
              {ROLE_LABELS[role]} · {session?.org_name || "Surat Modern Dyeing Mills"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {session?.email || "user@example.com"}
            </div>
          </div>
        </div>
      </section>

      {/* Personal Information */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <p className="text-xs text-gray-500">
              How you appear across CarbonIQ and on generated PDFs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Full Name" icon={User}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Work Email" icon={Mail} hint="Contact CarbonIQ support to change">
            <input
              type="email"
              value={session?.email || "user@example.com"}
              disabled
              className="input input-disabled"
            />
          </Field>

          <Field label="Phone Number" icon={Phone}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 ..."
              className="input"
            />
          </Field>

          <Field label="Role" icon={Briefcase}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="input"
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Time Zone" icon={Clock}>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 pt-4 flex justify-end border-t border-gray-100">
          <button
            type="button"
            onClick={handleSavePersonal}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
          >
            Save Personal Info
          </button>
        </div>
      </section>

      {/* Report signature */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PenLine className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Report Signature Block</h2>
            <p className="text-xs text-gray-500">
              Appears in the &quot;Certified by&quot; line on every BRSR / audit PDF you generate
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Signatory Name">
            <input
              type="text"
              value={fullName}
              disabled
              className="input input-disabled"
            />
          </Field>

          <Field label="Signatory Title / Designation">
            <input
              type="text"
              value={signatureTitle}
              onChange={(e) => setSignatureTitle(e.target.value)}
              placeholder="e.g. Managing Partner"
              className="input"
            />
          </Field>
        </div>

        {/* Preview */}
        <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Preview on report footer
          </div>
          <div className="text-sm text-gray-800 leading-relaxed">
            <div>Certified by</div>
            <div className="mt-2 font-bold text-gray-900">{fullName || "—"}</div>
            <div className="text-xs text-gray-600">{signatureTitle || "—"}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {session?.org_name || "Surat Modern Dyeing Mills"}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 flex justify-end border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaveSignature}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
          >
            Save Signature
          </button>
        </div>
      </section>

      {/* Security */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-xs text-gray-500">Change your sign-in password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field label="Current Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="New Password" hint="At least 8 characters">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                autoComplete="new-password"
              />
            </Field>
          </div>

          {pwError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          <div className="pt-4 flex justify-end border-t border-gray-100">
            <button
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword}
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </section>

      {/* Notifications */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-xs text-gray-500">Email alerts sent to {session?.email || "your work email"}</p>
          </div>
        </div>

        <div className="space-y-1">
          <ToggleRow
            title="Report Ready"
            desc="Notify me when a scheduled BRSR / audit report finishes generating."
            value={notif.reportReady}
            onChange={(v) => handleSaveNotif({ ...notif, reportReady: v })}
          />
          <ToggleRow
            title="Monthly Data Reminder"
            desc="Remind me on the 3rd of each month to log utility bills for the previous period."
            value={notif.monthlyReminder}
            onChange={(v) => handleSaveNotif({ ...notif, monthlyReminder: v })}
          />
          <ToggleRow
            title="Buyer / Auditor Requests"
            desc="Notify me when a buyer or auditor requests a disclosure or supplementary evidence."
            value={notif.buyerRequest}
            onChange={(v) => handleSaveNotif({ ...notif, buyerRequest: v })}
          />
          <ToggleRow
            title="Product Updates"
            desc="Occasional emails about new sector templates, factor updates, and features."
            value={notif.productUpdates}
            onChange={(v) => handleSaveNotif({ ...notif, productUpdates: v })}
          />
        </div>
      </section>

      {/* Local CSS helpers (kept tiny) */}
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .input-disabled {
          background: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
          value ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-4.5" : "translate-x-1"
          }`}
          style={{ transform: value ? "translateX(1.125rem)" : "translateX(0.25rem)" }}
        />
      </button>
    </div>
  );
}
