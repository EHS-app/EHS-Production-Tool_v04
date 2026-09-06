import { downloadHtmlAsPdf, pdfFilename } from "./htmlToPdf.ts";
import type { RosterRow } from "./crewRoster.ts";
import { normalizeAssignmentWindows } from "./crewRestAlerts.ts";

export type DailyCallSheetContact = { label: string; name?: string; phone?: string };
export type DailyCallSheetInput = {
  date: string;
  projectName?: string;
  venue?: string;
  contacts?: ReadonlyArray<DailyCallSheetContact>;
  rows: ReadonlyArray<RosterRow>;
};

const esc = (value: string | undefined | null): string =>
  (value?.trim() || "Not provided")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const visible = (status: RosterRow["status"]) =>
  status === "confirmed" || status === "accepted" || status === "partially_accepted";

export function dailyCallSheetHtml(input: DailyCallSheetInput): string {
  const rows = input.rows
    .filter((row) => visible(row.status))
    .map((row) => ({ row, windows: normalizeAssignmentWindows(row).filter((window) => window.date === input.date) }))
    .filter(({ windows }) => windows.length > 0);
  const contacts = input.contacts?.length
    ? input.contacts.map((contact) => `<div class="contact"><span>${esc(contact.label)}</span><b>${esc(contact.name)}</b><small>${esc(contact.phone)}</small></div>`).join("")
    : `<div class="contact contact-empty">No key contacts provided</div>`;
  const rowHtml = rows.map(({ row, windows }) => {
    const includedTaskKeys = new Set(
      windows.map((window) => window.assignmentKey),
    );
    const tasks = Object.entries(row.assignedShiftTasks)
      .filter(([key]) => includedTaskKeys.has(key))
      .flatMap(([, values]) => values)
      .filter(Boolean);
    const blocks = windows.map((window) => {
      const start = window.startMinute % 1440;
      const duration = window.endMinute - window.startMinute;
      return `<i title="${esc(`${window.startTime}–${window.endTime}`)}" style="left:${start / 14.4}%;width:${Math.min(duration, 1440 - start) / 14.4}%"></i>${
        duration > 1440 - start ? `<i style="left:0;width:${(duration - (1440 - start)) / 14.4}%"></i>` : ""}`;
    }).join("");
    return `<tr><td class="crew"><b>${esc(row.name)}</b><small>${esc(row.role)}</small></td><td class="windows">${windows.map((w) => esc(`${w.startTime}–${w.endTime}`)).join("<br>")}</td><td class="timeline-cell"><div class="track">${blocks}</div></td><td class="tasks">${tasks.length ? tasks.map(esc).join("<br>") : "No tasks provided"}</td><td class="hotel">${row.hotelRequired ? esc(row.hotelDates.length ? `Required (${row.hotelDates.join(", ")})` : "Required") : "Not required"}</td><td class="dietary">${row.dietaryTags.length || row.allergens.length ? esc([...row.dietaryTags, ...row.allergens].join(", ")) : "None provided"}</td><td class="phone">${esc(row.phone)}</td></tr>`;
  }).join("") || `<tr><td colspan="7" class="empty">No confirmed, accepted, or partially accepted crew with shifts on this date.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4 landscape;margin:10mm}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{width:100%;font:10px/1.3 Arial,sans-serif;color:#172033;padding:10mm;overflow:hidden}
.top{display:flex;align-items:center;gap:16px;border-bottom:2px solid #f88000;padding-bottom:10px;margin-bottom:10px}.logo{display:block;width:112px;height:auto;object-fit:contain;flex:0 0 auto}.title{min-width:0}.eyebrow{font-size:11px;font-weight:800;letter-spacing:1.4px;color:#f07800}.title h1{margin:2px 0 1px;font-size:23px;line-height:1.05;overflow-wrap:break-word}.meta{display:flex;gap:12px;color:#556070;font-size:10px}.meta span+span:before{content:"•";margin-right:12px;color:#f88000}
table{border-collapse:collapse;table-layout:fixed;width:100%;margin:0}col.crew-col{width:14%}col.windows-col{width:10%}col.timeline-col{width:27%}col.tasks-col{width:15%}col.hotel-col{width:10%}col.dietary-col{width:15%}col.phone-col{width:9%}
th,td{border:1px solid #aeb7c4;padding:5px 6px;vertical-align:top;text-align:left;white-space:normal;word-break:normal;overflow-wrap:break-word}th{background:#172033;color:#fff;font-size:8.5px;line-height:1.15;vertical-align:middle}.crew b,.crew small{display:block}.crew small{margin-top:2px;color:#556070}.windows,.phone{white-space:nowrap}.phone{font-size:9px}.hotel,.dietary,.tasks{hyphens:none}
.timeline-head{padding:4px 5px}.timeline-label{display:block;margin-bottom:3px}.timeline-hours{display:grid;grid-template-columns:repeat(7,1fr);font-size:7px;font-weight:400;color:#d9e0e9}.timeline-hours span{text-align:center}.timeline-hours span:first-child{text-align:left}.timeline-hours span:last-child{text-align:right}
.timeline-cell{padding:7px 5px;vertical-align:middle}.track{height:18px;position:relative;border:1px solid #c2cad5;background:repeating-linear-gradient(90deg,#f2f4f7 0,#f2f4f7 calc(4.1667% - 1px),#d7dde5 calc(4.1667% - 1px),#d7dde5 4.1667%)}.track i{position:absolute;top:2px;height:12px;background:#f88000;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(112,55,0,.2)}
.empty{text-align:center;color:#667085;padding:22px 12px;font-style:italic;background:#f8fafc}
.contacts-footer{margin-top:10px;padding-top:8px;border-top:2px solid #172033;break-inside:avoid}.contacts-footer h2{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.8px}.contacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.contact{min-width:0;border-left:3px solid #f88000;background:#f5f7fa;padding:5px 7px;display:flex;flex-direction:column}.contact span{font-size:7.5px;text-transform:uppercase;color:#667085}.contact b{font-size:9px;overflow-wrap:break-word}.contact small{font-size:8px;white-space:nowrap}.contact-empty{grid-column:1/-1;color:#667085}
 </style></head><body><header class="top"><img class="logo" src="/logo.png" alt="EHS company logo"><div class="title"><div class="eyebrow">DAILY CALL SHEET</div><h1>${esc(input.projectName)}</h1><div class="meta"><span>${esc(input.venue)}</span><span>${esc(input.date)}</span></div></div></header><table><colgroup><col class="crew-col"><col class="windows-col"><col class="timeline-col"><col class="tasks-col"><col class="hotel-col"><col class="dietary-col"><col class="phone-col"></colgroup><thead><tr><th>Crew / role</th><th>Windows</th><th class="timeline-head"><span class="timeline-label">24-hour timeline</span><div class="timeline-hours"><span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>24</span></div></th><th>Tasks</th><th>Hotel</th><th>Catering / dietary / allergens</th><th>Phone</th></tr></thead><tbody>${rowHtml}</tbody></table><footer class="contacts-footer"><h2>Key contacts</h2><div class="contacts">${contacts}</div></footer></body></html>`;
}

export async function exportDailyCallSheet(input: DailyCallSheetInput): Promise<void> {
  const html = dailyCallSheetHtml(input);
  await downloadHtmlAsPdf(html, pdfFilename([input.projectName, "Daily Call Sheet", input.date]), {
    orientation: "landscape",
    singlePage: true,
  });
}