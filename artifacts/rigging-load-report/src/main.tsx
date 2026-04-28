import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useSignIn,
  useAuth,
} from "@clerk/react";
import { dark } from "@clerk/themes";
import { Route, Router, Switch, useLocation } from "wouter";
import App from "./App";
import { Portal } from "./portal/Portal";
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

const EHS_ORANGE = "#f88000";

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
        backgroundColor: "transparent",
        border: "none",
        borderRadius: 0,
        width: "100%",
        maxWidth: "100%",
        overflow: "visible",
        boxShadow: "none",
      },
      card: {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        borderRadius: 0,
        padding: 0,
      },
      footer: {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        borderRadius: 0,
      },
      header: { display: "none" },
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
      footerActionText: { color: c.muted },
      footerActionLink: { color: EHS_ORANGE, fontWeight: 600 },
      footerAction: { display: "none" },
      dividerText: { color: c.muted },
      dividerLine: { backgroundColor: c.border },
      socialButtonsBlockButton: {
        backgroundColor: c.cardBg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontWeight: 600,
      },
      socialButtonsBlockButtonText: { color: c.text, fontWeight: 600 },
      socialButtonsIconButton: {
        backgroundColor: c.cardBg,
        border: `1px solid ${c.border}`,
      },
      identityPreviewEditButton: { color: EHS_ORANGE },
      formFieldSuccessText: { color: "#16a34a" },
      alertText: { color: c.text },
    },
  };
}

type AuthMode = "signIn" | "signUp";
type LoginIntent = "employee" | "freelancer";

const AUTH_MODE_KEY = "ehs-auth-mode";
const LOGIN_INTENT_KEY = "ehs-login-intent";

function loadInitialAuthMode(): AuthMode {
  try {
    const raw = sessionStorage.getItem(AUTH_MODE_KEY);
    if (raw === "signUp" || raw === "signIn") return raw;
  } catch {
    /* sessionStorage may be unavailable */
  }
  return "signIn";
}

function loadInitialLoginIntent(): LoginIntent | null {
  try {
    const raw = sessionStorage.getItem(LOGIN_INTENT_KEY);
    if (raw === "employee" || raw === "freelancer") return raw;
  } catch {
    /* sessionStorage may be unavailable */
  }
  return null;
}

function saveLoginIntent(intent: LoginIntent | null) {
  try {
    if (intent) {
      sessionStorage.setItem(LOGIN_INTENT_KEY, intent);
    } else {
      sessionStorage.removeItem(LOGIN_INTENT_KEY);
    }
  } catch {
    /* sessionStorage may be unavailable */
  }
}

function SignInScreen({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const c = PALETTE[theme];
  const [mode, setModeState] = useState<AuthMode>(() => loadInitialAuthMode());
  const [intent, setIntentState] = useState<LoginIntent>(
    () => loadInitialLoginIntent() ?? "employee",
  );
  const setMode = (next: AuthMode) => {
    try {
      sessionStorage.setItem(AUTH_MODE_KEY, next);
    } catch {
      /* sessionStorage may be unavailable */
    }
    setModeState(next);
  };
  const setIntent = (next: LoginIntent) => {
    saveLoginIntent(next);
    setIntentState(next);
  };

  const roles: ReadonlyArray<{
    id: LoginIntent;
    label: string;
    sub: string;
  }> = [
    { id: "employee", label: "Employee", sub: "Production Tool" },
    { id: "freelancer", label: "Freelancer", sub: "Freelance Portal" },
  ];

  const productLabel =
    intent === "freelancer" ? "Freelance Portal" : "Production Tool";

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

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          boxShadow: c.shadow,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          boxSizing: "border-box",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        <img
          src={`${basePath}/logo.png`}
          alt="EHS"
          style={{ height: "48px", width: "auto" }}
        />

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 0.2,
              color: c.text,
            }}
          >
            Sign in to <span style={{ color: EHS_ORANGE }}>EHS</span>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: c.muted,
              fontWeight: 500,
            }}
          >
            {productLabel}
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="I am signing in as"
          style={{
            display: "flex",
            width: "100%",
            padding: 4,
            borderRadius: 12,
            background: c.pageBg,
            border: `1px solid ${c.border}`,
            gap: 4,
          }}
        >
          {roles.map((role) => {
            const active = intent === role.id;
            return (
              <button
                key={role.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setIntent(role.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: active ? EHS_ORANGE : "transparent",
                  color: active ? "#0b0b0b" : c.text,
                  transition:
                    "background 120ms ease, color 120ms ease",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, sans-serif",
                }}
              >
                <span>{role.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    opacity: 0.85,
                    color: active ? "#0b0b0b" : c.muted,
                  }}
                >
                  {role.sub}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tablist"
          aria-label="Authentication mode"
          style={{
            display: "flex",
            alignSelf: "stretch",
            justifyContent: "center",
            gap: 28,
            borderBottom: `1px solid ${c.border}`,
          }}
        >
          {(
            [
              { id: "signIn", label: "Sign in" },
              { id: "signUp", label: "Sign up" },
            ] as const
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(opt.id)}
                style={{
                  padding: "8px 4px 10px",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: active
                    ? `2px solid ${EHS_ORANGE}`
                    : "2px solid transparent",
                  marginBottom: -1,
                  color: active ? c.text : c.muted,
                  cursor: "pointer",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, sans-serif",
                  transition:
                    "color 120ms ease, border-color 120ms ease",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div style={{ width: "100%" }}>
          {mode === "signIn" ? (
            <SignIn routing="hash" />
          ) : (
            <SignUp routing="hash" />
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          color: c.muted,
          fontSize: "13px",
          lineHeight: 1.55,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        Questions? Contact{" "}
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


function PostLoginRedirect() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const intent = loadInitialLoginIntent();
    if (!intent) return;
    const inPortal = location === "/portal" || location.startsWith("/portal/");
    if (intent === "freelancer" && !inPortal) {
      setLocation("/portal");
    } else if (intent === "employee" && inPortal) {
      setLocation("/");
    }
    saveLoginIntent(null);
    // We only want this to run once after mount (post sign-in landing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
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
            title: "Sign in",
            subtitle: "EHS Production Tool",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "EHS Production Tool",
          },
        },
      }}
    >
      <AuthGate
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === "dark" ? "light" : "dark"))
        }
      />
    </ClerkProvider>
  );
}

function AuthGate({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const { signIn } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const attemptedRef = useRef(false);
  const [devStatus, setDevStatus] = useState<"pending" | "done">(() => {
    if (!import.meta.env.DEV) return "done";
    try {
      if (sessionStorage.getItem("ehs-skip-dev-auto-signin") === "1") {
        sessionStorage.removeItem("ehs-skip-dev-auto-signin");
        return "done";
      }
    } catch {
      /* sessionStorage may be unavailable */
    }
    return "pending";
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (devStatus === "done") return;
    if (!authLoaded) return;
    if (isSignedIn) {
      setDevStatus("done");
      return;
    }
    if (attemptedRef.current) return;
    if (!signIn) return;
    attemptedRef.current = true;
    (async () => {
      try {
        const tokenRes = await fetch("/api/dev/auto-signin-token", {
          method: "POST",
        });
        if (!tokenRes.ok) {
          console.warn(
            "[dev auto-sign-in] token endpoint failed:",
            tokenRes.status,
          );
          return;
        }
        const { ticket } = (await tokenRes.json()) as { ticket?: string };
        if (!ticket) {
          console.warn("[dev auto-sign-in] no ticket returned");
          return;
        }
        const tRes = await signIn.create({ strategy: "ticket", ticket });
        if (tRes.error) {
          console.warn("[dev auto-sign-in] ticket failed:", tRes.error);
          return;
        }
        if (signIn.status === "complete") {
          const finRes = await signIn.finalize();
          if (finRes.error) {
            console.warn("[dev auto-sign-in] finalize failed:", finRes.error);
          }
        } else {
          console.warn(
            "[dev auto-sign-in] unexpected status:",
            signIn.status,
          );
        }
      } catch (err) {
        console.warn("[dev auto-sign-in] failed:", err);
      } finally {
        setDevStatus("done");
      }
    })();
  }, [signIn, authLoaded, isSignedIn, devStatus]);

  return (
    <>
      <Show when="signed-in">
        <ClearAuthMode />
        <Router base={basePath}>
          <PostLoginRedirect />
          <Switch>
            <Route path="/portal">
              <Portal theme={theme} onToggleTheme={onToggleTheme} />
            </Route>
            {/* Use the wildcard `*` rather than `:rest*` because regexparam
                v3 (the matcher wouter v3 ships with) parses `:rest*` as a
                single-segment optional, so multi-segment URLs like
                `/portal/brief/import` would otherwise fall through to the
                catchall and render the producer App. */}
            <Route path="/portal/*">
              <Portal theme={theme} onToggleTheme={onToggleTheme} />
            </Route>
            <Route>
              <App />
            </Route>
          </Switch>
        </Router>
      </Show>
      <Show when="signed-out">
        {devStatus === "pending" ? (
          <DevSigningInScreen theme={theme} />
        ) : (
          <SignInScreen theme={theme} onToggleTheme={onToggleTheme} />
        )}
      </Show>
    </>
  );
}

function ClearAuthMode() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(AUTH_MODE_KEY);
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, []);
  return null;
}

function DevSigningInScreen({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.pageBg,
        color: c.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <img
        src="/logo.png"
        alt="EHS"
        style={{ height: "60px", opacity: 0.85 }}
      />
      <div style={{ fontSize: "14px", color: c.muted }}>
        Signing in as Admin (preview only)…
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
