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

const EHS_ORANGE = "#f97316";
const EHS_NAVY = "#0f172a";
const EHS_NAVY_2 = "#1e293b";
const EHS_BORDER = "#334155";
const EHS_TEXT = "#f1f5f9";
const EHS_MUTED = "#94a3b8";

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: EHS_ORANGE,
    colorBackground: EHS_NAVY_2,
    colorForeground: EHS_TEXT,
    colorMutedForeground: EHS_MUTED,
    colorInput: EHS_NAVY,
    colorInputForeground: EHS_TEXT,
    colorNeutral: EHS_BORDER,
    colorDanger: "#dc2626",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: {
      backgroundColor: EHS_NAVY_2,
      border: `1px solid ${EHS_BORDER}`,
      borderRadius: "16px",
      width: "440px",
      maxWidth: "100%",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
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
    headerTitle: { color: EHS_TEXT },
    headerSubtitle: { color: EHS_MUTED },
    formFieldLabel: { color: EHS_TEXT },
    formFieldInput: {
      backgroundColor: EHS_NAVY,
      color: EHS_TEXT,
      border: `1px solid ${EHS_BORDER}`,
    },
    formButtonPrimary: {
      backgroundColor: EHS_ORANGE,
      color: "#0b0b0b",
      fontWeight: 600,
    },
    footerAction: { display: "none" },
    footerActionText: { color: EHS_MUTED },
    footerActionLink: { color: EHS_ORANGE },
    dividerText: { color: EHS_MUTED },
    dividerLine: { backgroundColor: EHS_BORDER },
    socialButtonsBlockButton: {
      backgroundColor: EHS_NAVY,
      color: EHS_TEXT,
      border: `1px solid ${EHS_BORDER}`,
    },
    socialButtonsBlockButtonText: { color: EHS_TEXT },
    identityPreviewEditButton: { color: EHS_ORANGE },
    formFieldSuccessText: { color: "#16a34a" },
    alertText: { color: EHS_TEXT },
  },
};

function SignInScreen() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: EHS_NAVY,
        color: EHS_TEXT,
        boxSizing: "border-box",
        gap: "20px",
      }}
    >
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
          color: EHS_MUTED,
          fontSize: "13px",
          lineHeight: 1.55,
          padding: "12px 16px",
          border: `1px solid ${EHS_BORDER}`,
          borderRadius: "10px",
          background: "rgba(15,23,42,0.6)",
        }}
      >
        Access is by invitation only. To request an invite, email{" "}
        <a
          href="mailto:utleie@ehs.no"
          style={{ color: EHS_ORANGE, fontWeight: 600 }}
        >
          utleie@ehs.no
        </a>
        .
      </div>
    </div>
  );
}

function Root() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Production Tool",
            subtitle: "EHS internal tool — invitation only",
          },
        },
      }}
    >
      <Show when="signed-in">
        <App />
      </Show>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
