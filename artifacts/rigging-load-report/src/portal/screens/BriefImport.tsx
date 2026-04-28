import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  upsertBrief,
  type PortalData,
} from "../lib/portalStorage";
import { decodeBrief } from "../../lib/briefShare";

/** Handles `/portal/brief/import?b=<encoded>` — decodes the payload,
 *  upserts it into the freelancer's portal data, then redirects to the
 *  brief detail screen. Re-importing the same briefId is idempotent
 *  (the existing decision and gig link are preserved). */

type Status = "loading" | "missing" | "error";

export function BriefImport({
  theme,
  setData,
}: {
  theme: ThemeMode;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
}) {
  const c = PALETTE[theme];
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get("b");
        if (!encoded) {
          if (!cancelled) setStatus("missing");
          return;
        }
        const brief = await decodeBrief(encoded);
        if (cancelled) return;
        setData((prev) => upsertBrief(prev, brief).data);
        // Replace history so the back button doesn't bounce them back to
        // the import URL (which would re-import the same brief).
        setLocation(`/portal/briefs/${brief.briefId}`, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(e instanceof Error ? e.message : "Could not read the brief.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 32,
        boxShadow: c.shadowSoft,
        textAlign: "center",
        maxWidth: 520,
        margin: "32px auto",
      }}
    >
      {status === "loading" ? (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Loading project briefing…
          </div>
          <div style={{ fontSize: 13, color: c.muted }}>
            Decoding the link from your producer.
          </div>
        </>
      ) : status === "missing" ? (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            No briefing in this link
          </div>
          <div style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
            The share link you followed didn't include a project payload.
            Ask your producer to re-send the brief.
          </div>
          <Link
            href="/portal/briefs"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              background: c.accent,
              color: "#0b0b0b",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            View my briefs
          </Link>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
              color: c.danger,
            }}
          >
            Couldn't open this briefing
          </div>
          <div
            style={{
              fontSize: 13,
              color: c.muted,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {errMsg ||
              "The link looks malformed. It may have been truncated by the chat app you received it in. Ask your producer to send the link again."}
          </div>
          <Link
            href="/portal/briefs"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              background: c.accent,
              color: "#0b0b0b",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            View my briefs
          </Link>
        </>
      )}
    </div>
  );
}
