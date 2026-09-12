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
      <body className="min-h-screen bg-canvas text-charcoal font-sans antialiased selection:bg-electric-blue/10 selection:text-electric-blue">
        {children}
      </body>
    </html>
  );
}
