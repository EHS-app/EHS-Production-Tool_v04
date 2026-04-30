/**
 * Canonical SKILL LIBRARY shared between the Production Tool and the
 * Freelance Portal. This list is the SINGLE SOURCE OF TRUTH for which
 * skills a freelancer profile may declare.
 *
 * Skills are STRICT: a profile may only contain labels that appear in
 * `SKILL_LIBRARY`. Free-text entries are rejected by `isValidSkill()`
 * on the client and re-validated on the API server before any write
 * to the freelancer_profiles table.
 *
 * Groups (`Work Type`, `Console & Software`, `Certification`,
 * `Language`) control the top-level sectioning in the picker UI. The
 * optional `subgroup` field lets the picker visually nest items inside
 * a group (used for Console & Software → Lighting / Sound / Video / CAD).
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

/** Lower-cased label set for fast strict-membership checks. Built
 *  once at module load — the library is a compile-time constant. */
const SKILL_LABEL_SET: ReadonlySet<string> = new Set(
  SKILL_LIBRARY.map((s) => s.label.toLowerCase()),
);

/** Map from lower-cased label → canonical-cased label, so callers can
 *  re-emit user input using the library's preferred capitalisation. */
const SKILL_CANONICAL: ReadonlyMap<string, string> = new Map(
  SKILL_LIBRARY.map((s) => [s.label.toLowerCase(), s.label] as const),
);

/**
 * Returns true if `label` matches an entry in the strict library
 * (case-insensitive, leading/trailing whitespace ignored).
 */
export function isValidSkill(label: string): boolean {
  return SKILL_LABEL_SET.has(label.trim().toLowerCase());
}

/**
 * Drops any entries that are not in the strict library, de-duplicates,
 * and re-emits each remaining entry using the library's canonical
 * capitalisation. Used both to clean up legacy free-text profiles and
 * as the server-side gate before writing to the DB.
 */
export function sanitizeSkills(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const canonical = SKILL_CANONICAL.get(key);
    if (!canonical) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

/**
 * Split a flat list of skill labels into the four canonical groups so
 * the API can expose `workTypes` / `consoles` / `certs` / `languages`
 * as independent fields without consumers having to re-group them.
 *
 * Unknown labels are silently dropped (mirrors `sanitizeSkills` — the
 * picker is locked, so unknown labels can only arrive from a tampered
 * payload). Order within each group is the order labels appeared in
 * the input, so a freelancer's preferred ordering is preserved.
 */
export function groupSkills(labels: readonly string[]): {
  workTypes: string[];
  consoles: string[];
  certs: string[];
  languages: string[];
} {
  const workTypes: string[] = [];
  const consoles: string[] = [];
  const certs: string[] = [];
  const languages: string[] = [];
  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const canonical = SKILL_CANONICAL.get(key);
    if (!canonical) continue;
    const entry = SKILL_LIBRARY.find(
      (s) => s.label === canonical,
    );
    if (!entry) continue;
    switch (entry.group) {
      case "Work Type":
        workTypes.push(canonical);
        break;
      case "Console & Software":
        consoles.push(canonical);
        break;
      case "Certification":
        certs.push(canonical);
        break;
      case "Language":
        languages.push(canonical);
        break;
    }
  }
  return { workTypes, consoles, certs, languages };
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
