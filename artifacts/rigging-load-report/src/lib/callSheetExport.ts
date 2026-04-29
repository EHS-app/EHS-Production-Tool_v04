import type {
  BriefAssignment,
  BriefSchedule,
  BriefSchedulePhaseKey,
  ProjectBrief,
} from "./projectBrief";

const PHASE_LABELS: Record<BriefSchedulePhaseKey, string> = {
  setup: "Setup",
  rehearsal: "Rehearsal",
  show: "Show",
  downrig: "Load Out",
};

const PHASE_KEYS: BriefSchedulePhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtRange(from: string, to: string): string {
  if (from && to && from !== to) {
    return `${fmtDate(from)} → ${fmtDate(to)}`;
  }
  return fmtDate(from || to);
}

function fmtTimeRange(fromTime?: string, toTime?: string): string {
  if (!fromTime && !toTime) return "";
  if (fromTime && toTime) return `${fromTime} – ${toTime}`;
  return fromTime || toTime || "";
}

function scheduleHtml(schedule: BriefSchedule | undefined): string {
  if (!schedule) return "";
  const blocks = PHASE_KEYS.flatMap((key) => {
    const segs = schedule[key];
    if (!segs || segs.length === 0) return [];
    return [{ key, label: PHASE_LABELS[key], segs }];
  });
  if (blocks.length === 0) return "";
  return `
    <section class="cs-section">
      <h2>Production schedule</h2>
      <div class="cs-schedule">
        ${blocks
          .map(
            (block) => `
          <div class="cs-phase">
            <div class="cs-phase-label">${escHtml(block.label)}</div>
            <div class="cs-phase-rows">
              ${block.segs
                .map((seg, i) => {
                  const dateRange =
                    seg.from || seg.to ? fmtRange(seg.from, seg.to) : "—";
                  const timeRange = fmtTimeRange(seg.fromTime, seg.toTime);
                  const dayPrefix =
                    block.segs.length > 1
                      ? `<span class="cs-day-tag">Day ${i + 1}</span>`
                      : "";
                  return `
                    <div class="cs-phase-row">
                      ${dayPrefix}
                      <span class="cs-phase-date">${escHtml(dateRange)}</span>
                      ${timeRange ? `<span class="cs-phase-time">${escHtml(timeRange)}</span>` : ""}
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function assignmentHtml(assignment: BriefAssignment | undefined): string {
  if (!assignment) {
    return `
      <section class="cs-section cs-mine">
        <h2>Your call</h2>
        <div class="cs-empty">No personal assignment on this brief — refer to the production schedule below.</div>
      </section>
    `;
  }
  const rows: Array<[string, string]> = [
    ["Role", assignment.role || "—"],
    ["Call time", assignment.callTime || "—"],
    ["Off time", assignment.offTime || "—"],
    [
      "Hours",
      assignment.hours > 0 ? `${assignment.hours} h` : "—",
    ],
  ];
  if (assignment.dayRate > 0) {
    rows.push([
      "Day rate",
      new Intl.NumberFormat("nb-NO", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 0,
      }).format(Math.round(assignment.dayRate)),
    ]);
  }
  return `
    <section class="cs-section cs-mine">
      <h2>Your call</h2>
      <div class="cs-mine-grid">
        ${rows
          .map(
            ([k, v]) => `
          <div class="cs-mine-row">
            <span class="cs-mine-key">${escHtml(k)}</span>
            <span class="cs-mine-val">${escHtml(v)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      ${
        assignment.notes
          ? `<div class="cs-notes"><strong>Notes:</strong> ${escHtml(assignment.notes)}</div>`
          : ""
      }
    </section>
  `;
}

export type CallSheetResult = { ok: boolean };

/** Open a print window with a single-page call sheet personalised to
 *  the recipient. Mirrors the orange-band header used by the producer
 *  exports (Power Plan, Stage Build Sheet) for visual continuity.
 *
 *  Uses a Blob URL + anchor click rather than `window.open("")` so it
 *  reliably bypasses popup blockers — `target="_blank"` navigations
 *  initiated by a synthetic anchor click are treated as a same-action
 *  user gesture by every modern browser, while bare `window.open` is
 *  often blocked. */
export function openCallSheet(
  brief: ProjectBrief,
  options: { logoDataUrl?: string } = {},
): CallSheetResult {
  const myAssignment = brief.assignments.find(
    (a) => a.crewId === brief.recipientCrewId,
  );
  const venue = brief.project.venue || "Untitled show";
  const generated = new Date().toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const showDate =
    brief.project.endDate && brief.project.endDate !== brief.project.date
      ? `${fmtDate(brief.project.date)} → ${fmtDate(brief.project.endDate)}`
      : fmtDate(brief.project.date);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Call Sheet — ${escHtml(venue)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f3f3f3; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
    .cs-page {
      max-width: 794px;
      margin: 24px auto;
      background: #fff;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
    }
    .cs-band {
      background: #f88000;
      color: #fff;
      padding: 14px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: space-between;
    }
    .cs-band-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .cs-logo { height: 38px; width: auto; }
    .cs-band h1 { font-size: 20px; margin: 0; font-weight: 800; letter-spacing: 0.4px; }
    .cs-band-sub { font-size: 11px; opacity: 0.9; margin-top: 2px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; }
    .cs-band-right { font-size: 11px; text-align: right; opacity: 0.95; }
    .cs-meta {
      padding: 18px 22px 6px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .cs-meta-cell { font-size: 12px; }
    .cs-meta-key { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #777; font-weight: 700; }
    .cs-meta-val { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
    .cs-section { padding: 14px 22px 4px; }
    .cs-section h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      margin: 0 0 10px;
      color: #777;
      font-weight: 800;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
    }
    .cs-mine-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 18px;
    }
    .cs-mine-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px dashed #eee; }
    .cs-mine-key { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #777; font-weight: 700; min-width: 80px; }
    .cs-mine-val { font-size: 14px; font-weight: 700; color: #1a1a1a; }
    .cs-empty { font-size: 13px; color: #777; padding: 6px 0; }
    .cs-notes { margin-top: 10px; font-size: 12px; color: #444; padding: 8px 10px; background: #fff7eb; border-left: 3px solid #f88000; }
    .cs-schedule { display: grid; gap: 8px; }
    .cs-phase { display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 8px 10px; border: 1px solid #eee; border-radius: 6px; }
    .cs-phase-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #777; padding-top: 2px; }
    .cs-phase-rows { display: grid; gap: 4px; }
    .cs-phase-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .cs-day-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #f88000; }
    .cs-phase-date { font-size: 13px; font-weight: 700; color: #1a1a1a; }
    .cs-phase-time { font-size: 12px; color: #777; }
    .cs-foot {
      padding: 14px 22px 22px;
      font-size: 11px;
      color: #777;
      text-align: center;
      border-top: 1px solid #eee;
      margin-top: 10px;
    }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: #fff; }
      .cs-page { margin: 0; box-shadow: none; max-width: none; }
      .cs-noprint { display: none !important; }
    }
    .cs-noprint {
      position: fixed;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
    }
    .cs-noprint button {
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #f88000;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="cs-page">
    <div class="cs-band">
      <div class="cs-band-left">
        ${
          options.logoDataUrl
            ? `<img class="cs-logo" src="${escHtml(options.logoDataUrl)}" alt="EHS" />`
            : ""
        }
        <div>
          <div class="cs-band-sub">Personal call sheet</div>
          <h1>${escHtml(venue)}</h1>
        </div>
      </div>
      <div class="cs-band-right">Generated ${escHtml(generated)}</div>
    </div>
    <div class="cs-meta">
      <div class="cs-meta-cell">
        <div class="cs-meta-key">Show date</div>
        <div class="cs-meta-val">${escHtml(showDate)}</div>
      </div>
      <div class="cs-meta-cell">
        <div class="cs-meta-key">Project manager</div>
        <div class="cs-meta-val">${escHtml(brief.project.preparedBy || "—")}</div>
      </div>
      <div class="cs-meta-cell">
        <div class="cs-meta-key">For</div>
        <div class="cs-meta-val">${escHtml(myAssignment?.name || "Crew")}</div>
      </div>
    </div>
    ${assignmentHtml(myAssignment)}
    ${scheduleHtml(brief.project.schedule)}
    <div class="cs-foot">EHS Production Tool · brief ${escHtml(brief.briefId)}</div>
  </div>
  <div class="cs-noprint">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true };
}
