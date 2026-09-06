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
    ? input.contacts.map((contact) => `<li><b>${esc(contact.label)}:</b> ${esc(contact.name)} · ${esc(contact.phone)}</li>`).join("")
    : "<li>No key contacts provided</li>";
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
    return `<tr><td><b>${esc(row.name)}</b><br><small>${esc(row.role)}</small></td><td>${windows.map((w) => esc(`${w.startTime}–${w.endTime}`)).join("<br>")}</td><td><div class="track">${blocks}</div></td><td>${tasks.length ? tasks.map(esc).join("<br>") : "No tasks provided"}</td><td>${row.hotelRequired ? esc(row.hotelDates.length ? `Required (${row.hotelDates.join(", ")})` : "Required") : "Not required"}</td><td>${row.dietaryTags.length || row.allergens.length ? esc([...row.dietaryTags, ...row.allergens].join(", ")) : "None provided"}</td><td>${esc(row.phone)}</td></tr>`;
  }).join("") || `<tr><td colspan="7" class="empty">No confirmed, accepted, or partially accepted crew with shifts on this date.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{font:11px Arial;color:#172033;margin:0;padding:18px;background:#fff}h1{margin:0;font-size:24px}.meta{color:#556070;margin:5px 0 14px}.top{display:grid;grid-template-columns:1fr 1fr;gap:16px;border-bottom:2px solid #f88000;padding-bottom:12px}.contacts{margin:4px 0;padding-left:18px;line-height:1.55}table{border-collapse:collapse;width:100%;margin-top:15px}th,td{border:1px solid #dce1e8;padding:7px;vertical-align:top}th{background:#172033;color:#fff;text-align:left;font-size:10px}.track{height:18px;position:relative;background:repeating-linear-gradient(90deg,#edf0f4 0,#edf0f4 calc(25% - 1px),#cbd2dc calc(25% - 1px),#cbd2dc 25%)}.track i{position:absolute;top:3px;height:12px;background:#f88000;border-radius:2px}.hours{font-size:9px;color:#667085;display:flex;justify-content:space-between}.empty{text-align:center;color:#667085;padding:22px}@page{size:A4 landscape;margin:9mm}
</style></head><body><div class="top"><div><div>DAILY CALL SHEET</div><h1>${esc(input.projectName)}</h1><div class="meta">${esc(input.date)} · ${esc(input.venue)}</div></div><div><b>Key contacts</b><ul class="contacts">${contacts}</ul></div></div><div class="hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div><table><thead><tr><th>Crew / role</th><th>Windows</th><th>24-hour timeline</th><th>Tasks</th><th>Hotel</th><th>Catering / dietary / allergens</th><th>Phone</th></tr></thead><tbody>${rowHtml}</tbody></table></body></html>`;
}

export async function exportDailyCallSheet(input: DailyCallSheetInput): Promise<void> {
  const html = dailyCallSheetHtml(input);
  await downloadHtmlAsPdf(html, pdfFilename([input.projectName, "Daily Call Sheet", input.date]), { orientation: "landscape" });
}