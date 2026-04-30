/** Map a freelancer's primary role / skill label (canonical entry from
 *  the `@workspace/skills` library) onto one of the Production Tool's
 *  `CrewRole` departments. Used by the Available Crew sidebar so that
 *  clicking "Add to crew" pre-fills the new row with the right
 *  department instead of always defaulting to "Rigging".
 *
 *  The mapping is intentionally loose — many skill labels (e.g. "Lyd
 *  FOH", "Sound (WL / IEM)", "Backline tech") all funnel into the same
 *  call-sheet department ("Sound"). Anything we don't recognise falls
 *  through to "Other" so the producer can pick the right one manually
 *  from the dropdown. */

import type { CrewRole } from "./crew";

const RULES: Array<{ match: (s: string) => boolean; role: CrewRole }> = [
  // --- Sound ---
  // "Lyd …" (Norwegian for sound) and any English sound label except
  // the specific Sys Tech variant which lands in System Tech below.
  {
    match: (s) =>
      s === "Lyd FOH" ||
      s === "Lyd monitor" ||
      s === "Lyd Rigg" ||
      s === "Sound (WL / IEM)" ||
      s === "Backline tech",
    role: "Sound",
  },

  // --- Driver / runner ---
  // "Runner" rolls into Driver since on a typical call sheet the
  // runner is the person with the van fetching last-minute kit.
  { match: (s) => s === "Runner", role: "Driver" },

  // --- Other (explicit) ---
  // "Pyro / SFX" doesn't fit any existing department; we still want
  // an explicit rule so the intent is documented rather than falling
  // through to the default branch silently.
  { match: (s) => s === "Pyro / SFX", role: "Other" },

  // --- Lighting (FOH operator) ---
  { match: (s) => s === "Lys FOH", role: "Lighting FOH" },

  // --- Lighting (rigging / generic lighting tech) ---
  { match: (s) => s === "Lys Rigg", role: "Lighting" },

  // --- System Tech (any -Sys Tech variant rolls up here) ---
  {
    match: (s) =>
      s === "Lyd Sys Tech" ||
      s === "Lys Sys Tech" ||
      s === "AV Sys Tech",
    role: "System Tech",
  },

  // --- AV FOH ---
  { match: (s) => s === "AV FOH", role: "AV FOH" },

  // --- Video / LED ---
  {
    match: (s) =>
      s === "Video / LED Wall" ||
      s === "Kameraoperatør" ||
      s === "Cameraman Crane",
    role: "Video / LED",
  },

  // --- Rigging ---
  {
    match: (s) =>
      s === "Topp Rigger" ||
      s === "Rigger" ||
      s === "Rigging (ground support)" ||
      s === "Rigging (layers)",
    role: "Rigging",
  },

  // --- Stage build ---
  { match: (s) => s === "Stage build", role: "Stage" },

  // --- Stagehand (the Norwegian/English label maps to "Stage Hand") ---
  { match: (s) => s === "Stagehand", role: "Stage Hand" },

  // --- Driver / lift operator ---
  {
    match: (s) =>
      s === "Driver" ||
      s === "Forklift operator" ||
      s === "Sakselift / Scissor lift",
    role: "Driver",
  },

  // --- Project / production management ---
  {
    match: (s) =>
      s === "Crew chief" ||
      s === "Site Manager" ||
      s === "Technical Director" ||
      s === "Logistics Coordinator" ||
      s === "Prosjektleder" ||
      s === "Producer",
    role: "Project Manager",
  },
];

export function skillToCrewRole(skill: string | null | undefined): CrewRole {
  if (!skill) return "Other";
  const trimmed = skill.trim();
  for (const r of RULES) {
    if (r.match(trimmed)) return r.role;
  }
  return "Other";
}
