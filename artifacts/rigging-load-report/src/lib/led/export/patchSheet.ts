/** Patch-sheet + Cabinet-ID CSV exports.
 *
 *  Pure functions. Each returns a CSV string the UI can download via
 *  the standard Blob/URL.createObjectURL pattern.
 */

import type { LedScreen } from "../../led";
import { cellFromIndex } from "../../led";

/** Row in the per-port patch sheet:
 *    Screen, Port, Cabinet#, Col, Row, ChainStart, ChainPattern
 */
export function buildPatchSheetCsv(screens: LedScreen[]): string {
  const rows: string[][] = [
    [
      "Screen",
      "Port",
      "Cabinet#",
      "Col",
      "Row",
      "ChainStart",
      "ChainPattern",
      "BackupPort",
    ],
  ];
  for (const s of screens) {
    const assignments = s.processorPortAssignments ?? [];
    for (const a of assignments) {
      for (let i = 0; i < a.cells.length; i++) {
        const idx = a.cells[i]!;
        const { col, row } = cellFromIndex(idx, s.panelsWide);
        const chainStart = a.chainStart === idx ? "★" : "";
        rows.push([
          s.name || s.id,
          `P${a.portIndex}`,
          String(i + 1),
          String.fromCharCode(65 + col),
          String(row + 1),
          chainStart,
          a.chainPattern,
          typeof a.backupPortIndex === "number"
            ? `P${a.backupPortIndex}`
            : "",
        ]);
      }
    }
  }
  return rowsToCsv(rows);
}

/** Cabinet-ID report: one row per cabinet across every screen. */
export function buildCabinetIdCsv(screens: LedScreen[]): string {
  const rows: string[][] = [
    ["Screen", "CabinetId", "Col", "Row", "Port", "Disabled"],
  ];
  for (const s of screens) {
    const disabled = new Set(s.disabledCells ?? []);
    const portByCell = new Map<number, number>();
    for (const a of s.processorPortAssignments ?? []) {
      for (const c of a.cells) portByCell.set(c, a.portIndex);
    }
    for (let r = 0; r < s.panelsTall; r++) {
      for (let c = 0; c < s.panelsWide; c++) {
        const idx = r * s.panelsWide + c;
        const port = portByCell.get(idx);
        rows.push([
          s.name || s.id,
          `${String.fromCharCode(65 + c)}${r + 1}`,
          String.fromCharCode(65 + c),
          String(r + 1),
          typeof port === "number" ? `P${port}` : "",
          disabled.has(idx) ? "yes" : "",
        ]);
      }
    }
  }
  return rowsToCsv(rows);
}

function rowsToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
          return cell;
        })
        .join(","),
    )
    .join("\n");
}

/** Trigger a browser download of a CSV file. UI helper — kept in the
 *  same module so callers only import one thing. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
