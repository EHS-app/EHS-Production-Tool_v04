import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  buildBrief,
  type BriefAttachment,
  type BuildBriefInput,
  type ProjectBrief,
} from "../lib/projectBrief";
import { encodeBrief, buildShareUrl } from "../lib/briefShare";
import { crewHours, formatCrewDayRate } from "../lib/crew";
import { loadActiveFloorPlan, type FloorPlan } from "../lib/floorPlan";
import { uploadBriefAttachment } from "../lib/briefAttachmentUpload";
import { renderScreenPngBlob } from "../lib/ledExport";
import { computeScreenMetrics } from "../lib/led";

/** "Share with Crew" modal — generates one personalised brief link per
 *  crew member (and one generic link). The producer copies a link and
 *  sends it to the freelancer via WhatsApp / email / etc. The freelancer
 *  opens the link, lands in their Portal, and sees the full project
 *  briefing with their assignment highlighted. */

export type ShareBriefModalProps = {
  onClose: () => void;
  state: BuildBriefInput;
};

type RecipientLink = {
  /** crewId, or `null` for the generic link (no recipient highlighting). */
  crewId: string | null;
  label: string;
  sublabel: string;
  url: string;
  /** Encoded payload size in bytes — surfaced so the producer can spot a
   *  brief that's too large to share via short channels. */
  payloadBytes: number;
};

export function ShareBriefModal({ onClose, state }: ShareBriefModalProps) {
  const [links, setLinks] = useState<RecipientLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewBrief, setPreviewBrief] = useState<ProjectBrief | null>(null);
  /** Producer-facing status while we upload the floor-plan attachment.
   *  `null` once the upload finishes (or there was nothing to upload). */
  const [uploadStatus, setUploadStatus] = useState<string | null>(
    "Preparing brief…",
  );
  const { getToken } = useAuth();

  // Generate the links once on open. Encoding is async (gzip is async)
  // but tiny — just enough to need a Promise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baseUrl =
          (typeof import.meta !== "undefined" &&
            (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
          "/";

        // Step 1 — if the producer has a floor plan stashed, upload it
        // once. Every brief we generate below embeds the resulting
        // attachment metadata, so all recipients pull the same object
        // out of storage rather than re-uploading per crew member.
        const attachments: BriefAttachment[] = [];
        const floorPlan: FloorPlan | null = loadActiveFloorPlan();
        if (floorPlan?.originalDataUrl) {
          setUploadStatus(`Uploading ${floorPlan.fileName}…`);
          try {
            const att = await uploadBriefAttachment(
              {
                name: floorPlan.fileName || "drawing",
                contentType: floorPlan.contentType || "application/octet-stream",
                sizeBytes: floorPlan.sizeBytes || 0,
                dataUrl: floorPlan.originalDataUrl,
              },
              getToken,
            );
            if (cancelled) return;
            attachments.push(att);
          } catch (e) {
            // Non-fatal — we still want to ship the textual brief even
            // if the drawing upload fails (slow connection, signed-out
            // session, etc). Surface a soft warning to the producer.
            if (!cancelled) {
              setError(
                e instanceof Error
                  ? `Could not attach the drawing: ${e.message}`
                  : "Could not attach the drawing to the brief.",
              );
            }
          }
        }
        if (cancelled) return;

        // Step 2 — render one PNG per LED screen (with the producer's
        // pill-size + power/signal markers baked in) and upload each
        // alongside the floor plan. We skip empty screens (no panels)
        // because the export would just be a black rectangle. Failures
        // are non-fatal: the textual brief still ships, but we surface
        // a soft warning so the producer knows a diagram dropped.
        const ledDiagrams = state.ledDiagrams;
        if (ledDiagrams) {
          const printable = ledDiagrams.screens.filter((s) => {
            if (s.panelsWide <= 0 || s.panelsTall <= 0) return false;
            const m = computeScreenMetrics(s, ledDiagrams.panels);
            return Number.isFinite(m.pixelsX) && Number.isFinite(m.pixelsY) &&
              m.pixelsX > 0 && m.pixelsY > 0;
          });
          for (let i = 0; i < printable.length; i++) {
            const screen = printable[i];
            if (cancelled) return;
            setUploadStatus(
              `Uploading LED diagram ${i + 1} / ${printable.length} (${screen.name || "Screen"})…`,
            );
            try {
              const png = await renderScreenPngBlob({
                screen,
                panels: ledDiagrams.panels,
                settings: ledDiagrams.settings,
                logoDataUrl: null,
              });
              if (cancelled) return;
              const att = await uploadBriefAttachment(
                {
                  name: png.fileName,
                  contentType: "image/png",
                  sizeBytes: png.sizeBytes,
                  blob: png.blob,
                },
                getToken,
              );
              if (cancelled) return;
              attachments.push(att);
            } catch (e) {
              if (!cancelled) {
                // Append, don't replace, so a floor-plan warning is
                // preserved if it happened first.
                const msg =
                  e instanceof Error
                    ? `Could not attach LED diagram for "${screen.name || "Screen"}": ${e.message}`
                    : `Could not attach LED diagram for "${screen.name || "Screen"}".`;
                setError((prev) => (prev ? `${prev}\n${msg}` : msg));
              }
            }
          }
        }

        if (cancelled) return;
        setUploadStatus(null);

        const generated: RecipientLink[] = [];

        // Generic link (no recipient highlighted) — usable when the
        // producer just wants to share the brief broadly (e.g. with a
        // venue contact who isn't on the call sheet).
        {
          const brief = buildBrief({
            ...state,
            recipientCrewId: null,
            attachments,
          });
          if (!previewBrief) setPreviewBrief(brief);
          const encoded = await encodeBrief(brief);
          generated.push({
            crewId: null,
            label: "Generic link",
            sublabel: "No assignment highlighted — for venue / production contacts",
            url: buildShareUrl(encoded, baseUrl),
            payloadBytes: encoded.length,
          });
        }

        // Per-crew links.
        for (const m of state.crew) {
          const brief = buildBrief({
            ...state,
            recipientCrewId: m.id,
            attachments,
          });
          const encoded = await encodeBrief(brief);
          generated.push({
            crewId: m.id,
            label: m.name || "(unnamed)",
            sublabel: `${m.role} · call ${m.callTime || "—"} → off ${m.offTime || "—"} · ${formatCrewDayRate(m.dayRate)}/day`,
            url: buildShareUrl(encoded, baseUrl),
            payloadBytes: encoded.length,
          });
        }

        if (!cancelled) setLinks(generated);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not generate the brief links.",
          );
          setUploadStatus(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally regenerate only when the modal first opens; the
    // producer can re-open it after editing the project to get new links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLink(key: string, url: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers / non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } catch {
      setError("Could not copy to clipboard. Long-press the link to copy manually.");
    }
  }

  const projectSummary = useMemo(() => {
    if (!previewBrief) return null;
    return {
      systems: previewBrief.rigging.systemCount,
      hoists: previewBrief.rigging.hoistCount,
      fixtures: previewBrief.lighting.fixtureCount,
      circuits: previewBrief.lighting.circuitCount,
      ledScreens: previewBrief.led.screenCount,
      stages: previewBrief.stage.stageCount,
      stageArea: previewBrief.stage.totalArea,
      soundRows: previewBrief.sound.rowCount,
      crew: previewBrief.assignments.length,
    };
  }, [previewBrief]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share project brief with crew"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#fff",
          color: "#0f172a",
          borderRadius: 16,
          width: "100%",
          maxWidth: 720,
          maxHeight: "calc(100dvh - 32px)",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 20px 14px",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Share with crew
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              Send each freelancer their personal link. They open it in their
              EHS Portal and see the full project briefing — venue, schedule,
              their assignment, the rigging plan, lighting, sound and stage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </header>

        {projectSummary ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 8,
              padding: "14px 20px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <SummaryStat label="Crew" value={`${projectSummary.crew}`} />
            <SummaryStat label="Rig systems" value={`${projectSummary.systems}`} />
            <SummaryStat label="Hoists" value={`${projectSummary.hoists}`} />
            <SummaryStat label="Fixtures" value={`${projectSummary.fixtures}`} />
            <SummaryStat label="Circuits" value={`${projectSummary.circuits}`} />
            <SummaryStat label="LED screens" value={`${projectSummary.ledScreens}`} />
            <SummaryStat
              label="Stage"
              value={`${projectSummary.stages}`}
              sub={projectSummary.stageArea > 0 ? `${projectSummary.stageArea} m²` : undefined}
            />
            <SummaryStat label="Sound rows" value={`${projectSummary.soundRows}`} />
          </div>
        ) : null}

        <div style={{ padding: "16px 20px 20px" }}>
          {error ? (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.25)",
                borderRadius: 10,
                color: "#991b1b",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          ) : null}

          {!links ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
              {uploadStatus ?? "Generating links…"}
            </div>
          ) : links.length === 1 ? (
            // No crew yet — only the generic link is available.
            <>
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: 10,
                  color: "#3730a3",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                No crew on the call sheet yet. Add freelancers in the Crew
                Report tab to generate one personal link per person.
              </div>
              {renderLinkRow(links[0], "generic", copiedKey, copyLink)}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {links.map((l, i) =>
                renderLinkRow(l, l.crewId ?? `generic-${i}`, copiedKey, copyLink),
              )}
            </div>
          )}

          {previewBrief && previewBrief.attachments.length > 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(248,128,0,0.08)",
                border: "1px solid rgba(248,128,0,0.25)",
                borderRadius: 10,
                fontSize: 12,
                color: "#7c2d12",
                lineHeight: 1.5,
              }}
            >
              <strong>Attached to every link:</strong>{" "}
              {previewBrief.attachments
                .map((a) => a.name)
                .join(", ")}
              . Clear the floor plan in the Rigg Plan tab if this is from a
              different project.
            </div>
          ) : null}

          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            Links are self-contained — the entire briefing is encoded in the URL,
            no server is needed. After you edit the project, re-open this dialog
            to generate fresh links.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderLinkRow(
  l: RecipientLink,
  key: string,
  copiedKey: string | null,
  copy: (key: string, url: string) => void,
) {
  const isCopied = copiedKey === key;
  const tooLarge = l.payloadBytes > 12000;
  return (
    <div
      key={key}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {l.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {l.sublabel}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              color: "#0f172a",
              textDecoration: "none",
              background: "#f8fafc",
            }}
          >
            Preview
          </a>
          <button
            type="button"
            onClick={() => copy(key, l.url)}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              border: "1px solid #f88000",
              borderRadius: 8,
              cursor: "pointer",
              background: isCopied ? "#fff7ed" : "#f88000",
              color: isCopied ? "#9a3412" : "#0b0b0b",
            }}
          >
            {isCopied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
      <input
        readOnly
        value={l.url}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: "100%",
          padding: "8px 10px",
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          background: "#f8fafc",
          color: "#334155",
          boxSizing: "border-box",
        }}
      />
      {tooLarge ? (
        <div style={{ fontSize: 11, color: "#9a3412" }}>
          Heads up: this link is {(l.payloadBytes / 1024).toFixed(1)} KB. It
          will work, but some chat apps clip very long URLs — paste-test before
          sending.
        </div>
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 10, color: "#94a3b8" }}>{sub}</div>
      ) : null}
    </div>
  );
}

/** Re-exported for the App.tsx call site that needs to compute the
 *  per-row hours when building the BuildBriefInput. */
export { crewHours };
