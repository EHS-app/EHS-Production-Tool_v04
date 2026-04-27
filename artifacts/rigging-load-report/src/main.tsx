import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, Show } from "@clerk/react";
import { dark } from "@clerk/themes";
import App from "./App";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as
  | string
  | undefined;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const STORAGE_KEY_V2 = "ehs-rigging-report-v2";
type ThemeMode = "light" | "dark";

function loadInitialTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.theme === "dark" || parsed?.theme === "light") {
        return parsed.theme;
      }
    }
  } catch {}
  return "light";
}

function saveTheme(theme: ThemeMode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.theme = theme;
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(parsed));
  } catch {}
}

const EHS_ORANGE = "#f97316";

const PALETTE = {
  light: {
    pageBg: "#f1f5f9",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    muted: "#64748b",
    inputBg: "#ffffff",
    inviteBg: "#ffffff",
    shadow: "0 20px 60px rgba(15,23,42,0.12)",
  },
  dark: {
    pageBg: "#0f172a",
    cardBg: "#1e293b",
    border: "#334155",
    text: "#f1f5f9",
    muted: "#94a3b8",
    inputBg: "#0f172a",
    inviteBg: "rgba(15,23,42,0.6)",
    shadow: "0 20px 60px rgba(0,0,0,0.45)",
  },
} as const;

function buildAppearance(theme: ThemeMode) {
  const c = PALETTE[theme];
  return {
    baseTheme: theme === "dark" ? dark : undefined,
    variables: {
      colorPrimary: EHS_ORANGE,
      colorBackground: c.cardBg,
      colorForeground: c.text,
      colorMutedForeground: c.muted,
      colorInput: c.inputBg,
      colorInputForeground: c.text,
      colorNeutral: c.border,
      colorDanger: "#dc2626",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      borderRadius: "10px",
    },
    elements: {
      rootBox: { width: "100%", display: "flex", justifyContent: "center" },
      cardBox: {
        backgroundColor: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: "16px",
        width: "440px",
        maxWidth: "100%",
        overflow: "hidden",
        boxShadow: c.shadow,
      },
      card: {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        borderRadius: 0,
      },
      footer: {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        borderRadius: 0,
      },
      headerTitle: { color: c.text },
      headerSubtitle: { color: c.muted },
      formFieldLabel: { color: c.text },
      formFieldInput: {
        backgroundColor: c.inputBg,
        color: c.text,
        border: `1px solid ${c.border}`,
      },
      formButtonPrimary: {
        backgroundColor: EHS_ORANGE,
        color: "#0b0b0b",
        fontWeight: 600,
      },
      footerAction: { display: "none" },
      footerActionText: { color: c.muted },
      footerActionLink: { color: EHS_ORANGE },
      dividerText: { color: c.muted },
      dividerLine: { backgroundColor: c.border },
      socialButtons: { display: "none" },
      socialButtonsBlockButton: { display: "none" },
      socialButtonsBlockButtonText: { display: "none" },
      socialButtonsIconButton: { display: "none" },
      dividerRow: { display: "none" },
      identityPreviewEditButton: { color: EHS_ORANGE },
      formFieldSuccessText: { color: "#16a34a" },
      alertText: { color: c.text },
    },
  };
}

function SignInScreen({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: c.pageBg,
        color: c.text,
        boxSizing: "border-box",
        gap: "20px",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={onToggleTheme}
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 10,
          cursor: "pointer",
          background: c.cardBg,
          color: c.text,
          border: `1px solid ${c.border}`,
          boxShadow: c.shadow,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src={`${basePath}/logo.png`}
          alt="EHS"
          style={{ height: "44px", width: "auto" }}
        />
        <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: 0.3 }}>
          Production <span style={{ color: EHS_ORANGE }}>Tool</span>
        </div>
      </div>

      <SignIn routing="hash" />

      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          color: c.muted,
          fontSize: "13px",
          lineHeight: 1.55,
          padding: "12px 16px",
          border: `1px solid ${c.border}`,
          borderRadius: "10px",
          background: c.inviteBg,
        }}
      >
        Need help contact{" "}
        <a
          href="mailto:utleie@ehs.no"
          style={{ color: EHS_ORANGE, fontWeight: 600 }}
        >
          utleie@ehs.no
        </a>
      </div>
    </div>
  );
}

function Root() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={buildAppearance(theme)}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Production Tool",
            subtitle: "EHS internal tool",
          },
        },
      }}
    >
      <Show when="signed-in">
        <App />
      </Show>
      <Show when="signed-out">
        <SignInScreen
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
        />
      </Show>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
