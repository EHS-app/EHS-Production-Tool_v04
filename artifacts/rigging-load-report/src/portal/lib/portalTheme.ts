export type ThemeMode = "light" | "dark";

export const EHS_ORANGE = "#f88000";

export const PALETTE = {
  light: {
    pageBg: "#f1f5f9",
    cardBg: "#ffffff",
    cardBgSubtle: "#f8fafc",
    border: "#e2e8f0",
    text: "#0f172a",
    muted: "#64748b",
    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    accent: EHS_ORANGE,
    success: "#16a34a",
    danger: "#dc2626",
    shadow: "0 12px 32px rgba(15,23,42,0.08)",
    shadowSoft: "0 4px 16px rgba(15,23,42,0.06)",
  },
  dark: {
    pageBg: "#0b1220",
    cardBg: "#111c2e",
    cardBgSubtle: "#0f1828",
    border: "#1f2d44",
    text: "#f1f5f9",
    muted: "#94a3b8",
    inputBg: "#0b1424",
    inputBorder: "#1f2d44",
    accent: EHS_ORANGE,
    success: "#22c55e",
    danger: "#f87171",
    shadow: "0 12px 32px rgba(0,0,0,0.45)",
    shadowSoft: "0 4px 16px rgba(0,0,0,0.35)",
  },
} as const;

export type PaletteColors = (typeof PALETTE)["light"];

export const PORTAL_FONT =
  "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
