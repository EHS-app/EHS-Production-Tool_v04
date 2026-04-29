import type { Locale } from "./types";

/**
 * Locale-aware formatting helpers.
 *
 * Date/number/currency formatting is intentionally a separate, pure module
 * (no React) so it can be reused by export modules (clientPackExport,
 * showSimulation, callSheetExport, etc.) which run outside the component
 * tree against an explicit Locale argument.
 *
 * Per spec:
 *  - EN dates render as MM/DD/YYYY (US English).
 *  - NO dates render as DD.MM.YYYY (Norwegian Bokmål).
 *
 * Numbers and currency use the corresponding `Intl` locale strings so we
 * also get the right decimal/thousands separators (1,234.56 vs 1 234,56)
 * and currency placement (kr 1 234 in nb-NO).
 */

/**
 * Map our internal locale code to the BCP-47 tag used by `Intl.*`. Keep
 * this single source-of-truth so we don't drift between formatters.
 */
function intlLocale(locale: Locale): string {
  return locale === "no" ? "nb-NO" : "en-US";
}

/**
 * Coerce a date input (Date, ISO string, or YYYY-MM-DD calendar string)
 * to a Date in the *local* timezone. Returns `null` for unparseable input
 * so callers can render a placeholder instead of "Invalid Date".
 *
 * The bare-calendar branch matters because `new Date("2026-04-29")` is
 * parsed as UTC midnight; in negative-offset zones that shifts to the
 * previous day. Callers across the codebase already handle this; we
 * mirror that behaviour here.
 */
function toDate(input: Date | string): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (!input) return null;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const d = calendar
    ? new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]))
    : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date as a short numeric string per the locale's convention:
 *   - EN: MM/DD/YYYY
 *   - NO: DD.MM.YYYY
 *
 * We hand-format rather than relying on `Intl.DateTimeFormat` because
 * that API yields different separators across runtimes (some Chrome
 * builds emit U+202F narrow no-break space). For the production-tool
 * date displays we want stable, copy-pasteable output.
 */
export function formatDate(input: Date | string, locale: Locale): string {
  const d = toDate(input);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return locale === "no" ? `${dd}.${mm}.${yyyy}` : `${mm}/${dd}/${yyyy}`;
}

/**
 * Format a date with a longer human-readable style (weekday + day +
 * month + year). Delegates to `Intl.DateTimeFormat` since the visual
 * style is not a contract — only the locale conventions are.
 */
export function formatDateLong(input: Date | string, locale: Locale): string {
  const d = toDate(input);
  if (!d) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format a number with the locale's grouping/decimal conventions.
 * Pass `fractionDigits` to clamp; otherwise the platform default is used.
 */
export function formatNumber(
  n: number,
  locale: Locale,
  fractionDigits?: number,
): string {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: fractionDigits ?? 3,
    minimumFractionDigits: fractionDigits ?? 0,
  }).format(n);
}

/**
 * Format a currency amount. Defaults to NOK because every monetary value
 * in this product (crew rates, gig earnings) is denominated in
 * Norwegian kroner regardless of which UI locale the user has selected.
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: string = "NOK",
): string {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
