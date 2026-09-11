import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbonIQ — SME Emission Detector & Circular Recommender",
  description: "Turn utility bills and sector context into ranked circular actions with cost, payback, and regulator-ready reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
