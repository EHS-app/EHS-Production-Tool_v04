import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale, TranslationKey, Translations } from "./types";
import { en } from "./translations/en";
import { no } from "./translations/no";

/**
 * Registry of all loaded translation tables, keyed by locale code.
 *
 * To add a third locale, import the new translation table and add it
 * here — the rest of the system (selector, fallback, persistence) keys
 * off this map.
 */
const TRANSLATIONS_BY_LOCALE: Record<Locale, Translations> = { en, no };

const STORAGE_KEY = "ehs:locale";

/**
 * Best-effort browser-locale detection. Norwegian variants
 * (Bokmål `nb-*`, generic `no`, and Nynorsk `nn-*` — we render Bokmål
 * for both because we don't ship Nynorsk strings) all map to "no";
 * everything else falls back to "en".
 */
function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const langs: readonly string[] =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
  for (const raw of langs) {
    const lang = raw.toLowerCase();
    if (lang.startsWith("nb") || lang.startsWith("no") || lang.startsWith("nn")) {
      return "no";
    }
    if (lang.startsWith("en")) return "en";
  }
  return "en";
}

/**
 * Read a previously persisted locale from `localStorage`. Wrapped in
 * try/catch because some embedded contexts (private mode, certain
 * sandboxed iframes) throw on access.
 */
function readPersistedLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "no") return raw;
  } catch {
    /* localStorage may be unavailable */
  }
  return null;
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* localStorage may be unavailable */
  }
}

/**
 * Substitute `{name}` placeholders in a translated string.
 *
 * Designed to be defensive: any `params` value is coerced to a string,
 * and unmatched placeholders are left as-is so they are visible during
 * development rather than silently disappearing.
 */
function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

export type Translator = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Translator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * <I18nProvider> wraps the application root and exposes the active
 * locale plus a translator function via context.
 *
 * Initial locale is resolved in this order:
 *  1. A previously persisted preference in `localStorage`.
 *  2. Browser language (`navigator.languages`/`navigator.language`).
 *  3. Hard fallback to `"en"`.
 *
 * The provider also writes any locale change back to `localStorage` so
 * the preference survives a reload, and applies it to `<html lang="...">`
 * for accessibility and CSS `:lang(...)` selectors.
 */
export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  /**
   * Override the auto-detected initial locale. Mainly useful for tests;
   * production callers should not pass this so the persisted/browser
   * preference wins.
   */
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    return readPersistedLocale() ?? detectBrowserLocale();
  });

  // Apply <html lang="..."> on every locale change. This also runs on
  // mount, syncing the document with the resolved initial locale.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "no" ? "nb-NO" : "en";
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback<Translator>(
    (key, params) => {
      const table = TRANSLATIONS_BY_LOCALE[locale];
      // Fallback chain: requested locale → English → key string itself.
      // Returning the key (rather than "") makes a missing translation
      // visible at runtime instead of rendering a blank UI element.
      const raw = table[key] ?? en[key] ?? key;
      return interpolate(raw, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Access the full i18n context (locale + setter + translator). Prefer
 * `useT()` when you only need to translate strings — it has a lighter
 * dependency surface and re-renders only when the active locale changes.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n() must be used inside <I18nProvider>");
  }
  return ctx;
}

/**
 * Convenience hook returning just the translator function. Most call
 * sites only need this; using it (instead of destructuring `useI18n()`)
 * keeps render logs cleaner.
 */
export function useT(): Translator {
  return useI18n().t;
}
