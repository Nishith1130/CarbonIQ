import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        paper: "#f5f5f5",
        ash: "#e5e5e5",
        smoke: "#d4d4d4",
        pebble: "#c8c8c8",
        midnight: "#0a0a0a",
        charcoal: "#171717",
        graphite: "#262626",
        subslate: "#404040",
        steel: "#525252",
        fog: "#737373",
        silver: "#a3a3a3",
        // Accents
        "electric-blue": "#2563eb",
        "deep-sapphire": "#1e40af",
        "soft-mint": "#dcfce7",
        "vivid-green": "#16a34a",
        tangerine: "#ea580c",
        lavender: "#7c3aed",
        // Design System tokens
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        pill: "9999px",
        card: "12px",
        input: "6px",
      },
      boxShadow: {
        subtle: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
        ring: "rgba(0, 0, 0, 0.1) 0px 0px 0px 4px",
      },
    },
  },
  plugins: [],
};
export default config;
