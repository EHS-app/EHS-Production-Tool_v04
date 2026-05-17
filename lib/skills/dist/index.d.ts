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
export type SkillGroup = "Work Type" | "Console & Software" | "Certification" | "Language";
export type SkillSuggestion = {
    label: string;
    group: SkillGroup;
    /** Optional secondary heading inside a group (e.g. Lighting / Sound). */
    subgroup?: string;
};
/** Display order for the four top-level groups. */
export declare const SKILL_GROUPS: readonly SkillGroup[];
export declare const SKILL_LIBRARY: readonly SkillSuggestion[];
/**
 * Returns true if `label` matches an entry in the strict library
 * (case-insensitive, leading/trailing whitespace ignored).
 */
export declare function isValidSkill(label: string): boolean;
/**
 * Drops any entries that are not in the strict library, de-duplicates,
 * and re-emits each remaining entry using the library's canonical
 * capitalisation. Used both to clean up legacy free-text profiles and
 * as the server-side gate before writing to the DB.
 */
export declare function sanitizeSkills(labels: readonly string[]): string[];
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
export declare function groupSkills(labels: readonly string[]): {
    workTypes: string[];
    consoles: string[];
    certs: string[];
    languages: string[];
};
/**
 * Autocomplete search used by the Profile picker. Excludes already
 * selected tags. Returns up to 12 suggestions; an empty query returns
 * the first 12 unselected entries in library order.
 */
export declare function searchSkills(query: string, exclude: readonly string[]): SkillSuggestion[];
//# sourceMappingURL=index.d.ts.map