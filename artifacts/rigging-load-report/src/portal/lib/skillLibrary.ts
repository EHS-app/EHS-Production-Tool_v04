/**
 * Re-export the canonical skill library from the shared `@workspace/skills`
 * lib. Keeping this thin shim means existing imports across the portal
 * (and any future Production Tool importers) can keep using the local
 * path while the actual data lives in one place that the api-server
 * also imports for write-time validation.
 */
export {
  SKILL_LIBRARY,
  SKILL_GROUPS,
  searchSkills,
  isValidSkill,
  sanitizeSkills,
  type SkillGroup,
  type SkillSuggestion,
} from "@workspace/skills";
