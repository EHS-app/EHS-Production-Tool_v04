import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/I18nContext";
import type { Locale } from "../lib/i18n/types";
import "./languageSelector.css";

/**
 * Single source of truth for which locales appear in the picker. When
 * a new locale is added, register it in the i18n module first (see
 * `lib/i18n/types.ts`) and then add an entry here.
 */
const LOCALE_OPTIONS: ReadonlyArray<{
  value: Locale;
  /** Full label shown in the popup menu. */
  label: string;
  /** 2-letter code shown on the trigger button. */
  short: string;
}> = [
  { value: "en", label: "English", short: "EN" },
  { value: "no", label: "Norsk", short: "NO" },
];

/**
 * <LanguageSelector /> — compact 2-letter trigger that opens a popup
 * menu of full locale names.
 *
 * The trigger shows just "EN" or "NO" so it stays out of the way; the
 * popup gives the human-readable name so users can confirm what they're
 * choosing. Click-outside and Escape both dismiss the menu, and the
 * current locale is marked with a checkmark for clarity.
 *
 * Visually styled via `languageSelector.css`. The component is layout
 * agnostic — the floating top-right placement is configured by the
 * mount site (see `main.tsx`'s `.lang-fab-anchor` wrapper).
 */
export function LanguageSelector({ ariaLabel }: { ariaLabel?: string } = {}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const current =
    LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0];

  // Click-outside + Escape dismiss the menu. Listeners are only attached
  // while the menu is open so the closed state has zero runtime cost.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Return focus to the trigger so keyboard users keep their place.
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lang-fab-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-fab-trigger"
        aria-label={ariaLabel ?? t("language.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("language.label")}
        onClick={() => setOpen((v) => !v)}
      >
        {current.short}
      </button>
      {open && (
        <ul className="lang-fab-menu" role="listbox" aria-label={t("language.label")}>
          {LOCALE_OPTIONS.map((opt) => {
            const selected = opt.value === locale;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`lang-fab-option${selected ? " selected" : ""}`}
                  onClick={() => {
                    setLocale(opt.value);
                    setOpen(false);
                    // Return focus to the trigger after picking, for
                    // consistent keyboard ergonomics.
                    requestAnimationFrame(() => buttonRef.current?.focus());
                  }}
                >
                  <span className="lang-fab-option-short">{opt.short}</span>
                  <span className="lang-fab-option-label">{opt.label}</span>
                  {selected && (
                    <span className="lang-fab-option-check" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
