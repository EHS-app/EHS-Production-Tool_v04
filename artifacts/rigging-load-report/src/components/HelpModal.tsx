import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "../lib/i18n/I18nContext";
import type { TranslationKey } from "../lib/i18n/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Item = { label: TranslationKey; body: TranslationKey };

const HEADER_ACTIONS: Item[] = [
  { label: "header.reset", body: "help.headerActions.reset" },
  { label: "header.exportReport", body: "help.headerActions.exportReport" },
  { label: "header.clientPack", body: "help.headerActions.clientPack" },
  { label: "header.simulateShow", body: "help.headerActions.simulateShow" },
  { label: "header.shareWithCrew", body: "help.headerActions.shareWithCrew" },
];

const TABS: Item[] = [
  { label: "view.rigging", body: "help.tabs.rigging" },
  { label: "view.lighting", body: "help.tabs.lighting" },
  { label: "view.led", body: "help.tabs.led" },
  { label: "view.stage", body: "help.tabs.stage" },
  { label: "view.sound", body: "help.tabs.sound" },
  { label: "view.crew", body: "help.tabs.crew" },
  { label: "view.riggPlan", body: "help.tabs.riggPlan" },
];

const TIPS: TranslationKey[] = [
  "help.tips.autosave",
  "help.tips.language",
  "help.tips.portal",
  "help.tips.print",
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HelpModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  // Capture the element that had focus before the modal opened so we can
  // restore it on close (keyboard / screen-reader expectation).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Keep `onClose` reachable from event handlers without re-binding the
  // window listener on every parent re-render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stableClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  // Mount lifecycle: capture focus, install key handler, restore focus
  // when the modal closes.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        stableClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap — keep Tab/Shift+Tab cycling within the dialog.
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKey, true);
    // Defer focus until after the DOM is painted so the ref is mounted.
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", handleKey, true);
      window.clearTimeout(focusTimer);
      // Restore focus to the element that opened the modal, if it's still
      // in the DOM and focusable.
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
      previouslyFocusedRef.current = null;
    };
  }, [open, stableClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop help-modal-backdrop"
      onClick={stableClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal-content help-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <header className="help-modal-header">
          <div>
            <h3 id="help-modal-title">{t("header.helpTitle")}</h3>
            <p className="help-modal-subtitle">{t("help.subtitle")}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="help-modal-x"
            onClick={stableClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <div className="help-modal-body">
          <section className="help-section">
            <h4>{t("help.section.overview")}</h4>
            <p>{t("help.overview.body")}</p>
          </section>

          <section className="help-section">
            <h4>{t("help.section.headerActions")}</h4>
            <ul className="help-list">
              <li>
                <strong>CSV</strong>
                <span>{t("help.headerActions.csv")}</span>
              </li>
              {HEADER_ACTIONS.map((item) => (
                <li key={item.label}>
                  <strong>{t(item.label)}</strong>
                  <span>{t(item.body)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="help-section">
            <h4>{t("help.section.tabs")}</h4>
            <ul className="help-list">
              {TABS.map((tab) => (
                <li key={tab.label}>
                  <strong>{t(tab.label)}</strong>
                  <span>{t(tab.body)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="help-section">
            <h4>{t("help.section.tips")}</h4>
            <ul className="help-tips">
              {TIPS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="help-modal-footer">
          <button
            type="button"
            className="btn btn-export"
            onClick={stableClose}
          >
            {t("help.close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
