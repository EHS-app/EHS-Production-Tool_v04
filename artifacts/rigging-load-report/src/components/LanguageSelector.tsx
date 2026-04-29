import type { CSSProperties } from "react";
import { useI18n } from "../lib/i18n/I18nContext";
import type { Locale } from "../lib/i18n/types";

/**
 * Single source of truth for which locales appear in the picker. When
 * a new locale is added, register it in the i18n module first (see
 * `lib/i18n/types.ts`) and then add an entry here.
 */
const LOCALE_OPTIONS: ReadonlyArray<{
  value: Locale;
  /** Full label shown in the dropdown. */
  label: string;
  /** Compact code shown when the selector is rendered in `compact` mode. */
  short: string;
}> = [
  { value: "en", label: "English", short: "EN" },
  { value: "no", label: "Norsk (Bokmål)", short: "NO" },
];

/**
 * <LanguageSelector /> — a small, style-agnostic locale picker.
 *
 * Rendered as a native `<select>` so it inherits accessibility (keyboard
 * navigation, screen-reader announcements) for free and works on mobile
 * without extra UX work. Visual styling is delegated via `className` /
 * `style` so the same component can sit in the producer header (dark
 * orange theme), the portal header (palette-driven theme), and any
 * future Settings screen without forking.
 */
export function LanguageSelector({
  className,
  style,
  ariaLabel,
}: {
  className?: string;
  style?: CSSProperties;
  /** Accessible label; defaults to the translated "Language" string. */
  ariaLabel?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      className={className}
      style={style}
      aria-label={ariaLabel ?? t("language.label")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LOCALE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
