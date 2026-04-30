/**
 * Curated skill library for the Freelance Portal profile editor and the
 * Production Tool crew picker.
 *
 * This list is the SINGLE SOURCE OF TRUTH for skills across both apps.
 * Skills are STRICT: a freelancer profile may only contain labels that
 * appear in `SKILL_LIBRARY`. Free-text entries are rejected by
 * `isValidSkill()` and by the API server when a profile is saved.
 *
 * Groups (`Work Type`, `Console & Software`, `Certification`, `Language`)
 * control top-level sectioning in the picker UI. The optional `subgroup`
 * field lets the picker visually nest items inside a group (used for
 * Console & Software → Lighting / Sound / Video / CAD).
 */

export type SkillGroup =
  | "Work Type"
  | "Console & Software"
  | "Certification"
  | "Language";

export type SkillSuggestion = {
  label: string;
  group: SkillGroup;
  /** Optional secondary heading inside a group (e.g. Lighting / Sound). */
  subgroup?: string;
};

/** Display order for the four top-level groups. */
export const SKILL_GROUPS: readonly SkillGroup[] = [
  "Work Type",
  "Console & Software",
  "Certification",
  "Language",
] as const;

export const SKILL_LIBRARY: readonly SkillSuggestion[] = [
  // ── Work Type ───────────────────────────────────────────────────────
  { label: "Prosjektleder", group: "Work Type" },
  { label: "Lyd FOH", group: "Work Type" },
  { label: "Lyd monitor", group: "Work Type" },
  { label: "Lyd Rigg", group: "Work Type" },
  { label: "Lyd Sys Tech", group: "Work Type" },
  { label: "Sound (WL / IEM)", group: "Work Type" },
  { label: "Lys FOH", group: "Work Type" },
  { label: "Lys Rigg", group: "Work Type" },
  { label: "Lys Sys Tech", group: "Work Type" },
  { label: "AV FOH", group: "Work Type" },
  { label: "AV Sys Tech", group: "Work Type" },
  { label: "Topp Rigger", group: "Work Type" },
  { label: "Rigging (ground support)", group: "Work Type" },
  { label: "Rigging (layers)", group: "Work Type" },
  { label: "Rigger", group: "Work Type" },
  { label: "Stagehand", group: "Work Type" },
  { label: "Video / LED Wall", group: "Work Type" },
  { label: "Kameraoperatør", group: "Work Type" },
  { label: "Cameraman Crane", group: "Work Type" },
  { label: "Stage build", group: "Work Type" },
  { label: "Backline tech", group: "Work Type" },
  { label: "Crew chief", group: "Work Type" },
  { label: "Site Manager", group: "Work Type" },
  { label: "Technical Director", group: "Work Type" },
  { label: "Logistics Coordinator", group: "Work Type" },
  { label: "Runner", group: "Work Type" },
  { label: "Driver", group: "Work Type" },
  { label: "Forklift operator", group: "Work Type" },
  { label: "Sakselift / Scissor lift", group: "Work Type" },
  { label: "Pyro / SFX", group: "Work Type" },

  // ── Console & Software ─────────────────────────────────────────────
  // Lighting
  { label: "grandMA3", group: "Console & Software", subgroup: "Lighting" },
  { label: "grandMA2", group: "Console & Software", subgroup: "Lighting" },
  { label: "MA Dot2", group: "Console & Software", subgroup: "Lighting" },
  { label: "Elation Obsidian Onyx", group: "Console & Software", subgroup: "Lighting" },
  { label: "Hog 4", group: "Console & Software", subgroup: "Lighting" },
  { label: "Hog 3", group: "Console & Software", subgroup: "Lighting" },
  { label: "ChamSys MQ80", group: "Console & Software", subgroup: "Lighting" },
  { label: "ChamSys MagicQ", group: "Console & Software", subgroup: "Lighting" },
  { label: "Avolites Diamond", group: "Console & Software", subgroup: "Lighting" },
  { label: "Avolites Tiger Touch", group: "Console & Software", subgroup: "Lighting" },
  // Sound
  { label: "DiGiCo SD", group: "Console & Software", subgroup: "Sound" },
  { label: "DiGiCo Quantum", group: "Console & Software", subgroup: "Sound" },
  { label: "Yamaha CL/QL", group: "Console & Software", subgroup: "Sound" },
  { label: "Yamaha Rivage", group: "Console & Software", subgroup: "Sound" },
  { label: "SSL Live", group: "Console & Software", subgroup: "Sound" },
  { label: "Allen & Heath dLive", group: "Console & Software", subgroup: "Sound" },
  { label: "Allen & Heath SQ", group: "Console & Software", subgroup: "Sound" },
  { label: "Midas PRO/M32", group: "Console & Software", subgroup: "Sound" },
  { label: "Behringer X32", group: "Console & Software", subgroup: "Sound" },
  // Video / Media Server
  { label: "Green Hippo", group: "Console & Software", subgroup: "Video / Media Server" },
  { label: "Resolume", group: "Console & Software", subgroup: "Video / Media Server" },
  { label: "Disguise (d3)", group: "Console & Software", subgroup: "Video / Media Server" },
  { label: "vMix", group: "Console & Software", subgroup: "Video / Media Server" },
  { label: "Barco E2", group: "Console & Software", subgroup: "Video / Media Server" },
  { label: "PixelHue", group: "Console & Software", subgroup: "Video / Media Server" },
  // CAD / Planning
  { label: "Vectorworks", group: "Console & Software", subgroup: "CAD / Planning" },
  { label: "WYSIWYG", group: "Console & Software", subgroup: "CAD / Planning" },
  { label: "AutoCAD", group: "Console & Software", subgroup: "CAD / Planning" },
  { label: "Capture", group: "Console & Software", subgroup: "CAD / Planning" },
  { label: "Depence", group: "Console & Software", subgroup: "CAD / Planning" },

  // ── Certification ──────────────────────────────────────────────────
  { label: "Working at heights", group: "Certification" },
  { label: "IRATA L1", group: "Certification" },
  { label: "IRATA L2", group: "Certification" },
  { label: "IRATA L3", group: "Certification" },
  { label: "Forklift G4 (NO)", group: "Certification" },
  { label: "Truck B (NO)", group: "Certification" },
  { label: "Trailer BE (NO)", group: "Certification" },
  { label: "C1 truck (NO)", group: "Certification" },
  { label: "First aid", group: "Certification" },
  { label: "Pyrotechnician", group: "Certification" },
  { label: "Hot Works (Varme arbeider)", group: "Certification" },
  { label: "Scissor Lift (Personløfter)", group: "Certification" },

  // ── Language ───────────────────────────────────────────────────────
  { label: "Norwegian", group: "Language" },
  { label: "English", group: "Language" },
  { label: "Swedish", group: "Language" },
  { label: "Danish", group: "Language" },
  { label: "German", group: "Language" },
  { label: "French", group: "Language" },
  { label: "Spanish", group: "Language" },
  { label: "Greek", group: "Language" },
];

/** Lower-cased label set for fast strict-membership checks. */
const SKILL_LABEL_SET: ReadonlySet<string> = new Set(
  SKILL_LIBRARY.map((s) => s.label.toLowerCase()),
);

/**
 * Returns true if `label` matches an entry in the strict library
 * (case-insensitive). Use this to validate user-submitted skills before
 * saving a profile or sending it to the API server.
 */
export function isValidSkill(label: string): boolean {
  return SKILL_LABEL_SET.has(label.trim().toLowerCase());
}

/**
 * Drops any entries that are not in the strict library. Used when
 * loading legacy profiles that may contain free-text tags from before
 * the library was locked down.
 */
export function sanitizeSkills(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key) || !SKILL_LABEL_SET.has(key)) continue;
    seen.add(key);
    // Re-emit using the canonical capitalisation from the library.
    const canonical = SKILL_LIBRARY.find(
      (s) => s.label.toLowerCase() === key,
    )!.label;
    out.push(canonical);
  }
  return out;
}

/**
 * Autocomplete search used by the Profile picker. Excludes already
 * selected tags. Returns up to 12 suggestions; an empty query returns
 * the first 12 unselected entries in library order.
 */
export function searchSkills(
  query: string,
  exclude: readonly string[],
): SkillSuggestion[] {
  const q = query.trim().toLowerCase();
  const ex = new Set(exclude.map((s) => s.toLowerCase()));
  if (!q) {
    return SKILL_LIBRARY.filter((s) => !ex.has(s.label.toLowerCase())).slice(
      0,
      12,
    );
  }
  return SKILL_LIBRARY.filter(
    (s) =>
      s.label.toLowerCase().includes(q) && !ex.has(s.label.toLowerCase()),
  ).slice(0, 12);
}
