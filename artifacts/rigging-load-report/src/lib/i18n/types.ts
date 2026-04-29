/**
 * Supported UI locales.
 *
 * - "en" — English (en-US for date/number formatting per spec: MM/DD/YYYY)
 * - "no" — Norwegian Bokmål (nb-NO for date/number formatting: DD.MM.YYYY)
 *
 * Adding a new language is a four-step process:
 *  1. Extend this `Locale` union.
 *  2. Add a translations file at `./translations/<code>.ts` exporting an
 *     object that satisfies `Translations` (the EN file is the source of
 *     truth — every key MUST exist in EN).
 *  3. Register it in `TRANSLATIONS_BY_LOCALE` in `./I18nContext.tsx`.
 *  4. Add it to `LOCALE_OPTIONS` in `../../components/LanguageSelector.tsx`.
 *
 * Locale-specific formatting (dates, numbers, currency) lives in `./format.ts`
 * and switches on `Locale` directly — extend the helpers there too if a new
 * locale needs a different format style.
 */
export type Locale = "en" | "no";

import type { en } from "./translations/en";

/**
 * The translations contract is *defined* by the English source-of-truth
 * file. Every other locale must provide the exact same set of keys; missing
 * keys in non-English locales are caught at compile time via `Translations`,
 * and at runtime they fall back to the English string (then, as a last
 * resort, to the key itself — so a missing entry surfaces visibly rather
 * than rendering an empty string).
 */
export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
