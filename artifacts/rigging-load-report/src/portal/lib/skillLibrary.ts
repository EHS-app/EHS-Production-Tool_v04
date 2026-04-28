/**
 * Curated skill suggestions for the Freelance Portal profile editor.
 * The list is grouped by category so the autocomplete can offer hints,
 * but the input also accepts free-text tags.
 */

export type SkillSuggestion = {
  label: string;
  group: "Discipline" | "Console" | "Certification" | "Language";
};

export const SKILL_LIBRARY: SkillSuggestion[] = [
  { label: "Lighting", group: "Discipline" },
  { label: "Sound (FOH)", group: "Discipline" },
  { label: "Sound (Monitors)", group: "Discipline" },
  { label: "Sound (RF / IEM)", group: "Discipline" },
  { label: "Video / LED", group: "Discipline" },
  { label: "Camera", group: "Discipline" },
  { label: "Rigging (ground)", group: "Discipline" },
  { label: "Rigging (rope access)", group: "Discipline" },
  { label: "Stage build", group: "Discipline" },
  { label: "Backline", group: "Discipline" },
  { label: "Crew chief", group: "Discipline" },
  { label: "Project lead", group: "Discipline" },
  { label: "Driver", group: "Discipline" },
  { label: "Forklift operator", group: "Discipline" },
  { label: "Pyro / SFX", group: "Discipline" },

  { label: "grandMA3", group: "Console" },
  { label: "grandMA2", group: "Console" },
  { label: "MA Dot2", group: "Console" },
  { label: "Hog 4", group: "Console" },
  { label: "Hog 3", group: "Console" },
  { label: "ChamSys MQ80", group: "Console" },
  { label: "ChamSys MagicQ", group: "Console" },
  { label: "Avolites Diamond", group: "Console" },
  { label: "Avolites Tiger Touch", group: "Console" },
  { label: "DiGiCo SD", group: "Console" },
  { label: "DiGiCo Quantum", group: "Console" },
  { label: "Yamaha CL/QL", group: "Console" },
  { label: "Yamaha Rivage", group: "Console" },
  { label: "SSL Live", group: "Console" },
  { label: "Allen & Heath dLive", group: "Console" },
  { label: "Allen & Heath SQ", group: "Console" },
  { label: "Midas PRO/M32", group: "Console" },
  { label: "Behringer X32", group: "Console" },
  { label: "Green Hippo", group: "Console" },
  { label: "Resolume", group: "Console" },
  { label: "Disguise (d3)", group: "Console" },

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

  { label: "Norwegian", group: "Language" },
  { label: "English", group: "Language" },
  { label: "Swedish", group: "Language" },
  { label: "Danish", group: "Language" },
  { label: "German", group: "Language" },
  { label: "French", group: "Language" },
  { label: "Spanish", group: "Language" },
];

export function searchSkills(query: string, exclude: string[]): SkillSuggestion[] {
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
