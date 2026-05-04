import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "../lib/i18n/I18nContext";
import type { TranslationKey } from "../lib/i18n/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Item = { label: TranslationKey; body: TranslationKey };

const SIDEBAR_ITEMS: Item[] = [
  { label: "shell.nav.overview", body: "help.sidebar.overview" },
  { label: "shell.nav.rigging", body: "help.sidebar.rigging" },
  { label: "shell.nav.lighting", body: "help.sidebar.lighting" },
  { label: "shell.nav.led", body: "help.sidebar.led" },
  { label: "shell.nav.sound", body: "help.sidebar.sound" },
  { label: "shell.nav.stage", body: "help.sidebar.stage" },
  { label: "shell.nav.riggPlan", body: "help.sidebar.riggPlan" },
  { label: "shell.nav.crew", body: "help.sidebar.crew" },
  { label: "shell.nav.hotel", body: "help.sidebar.hotel" },
  { label: "shell.nav.catering", body: "help.sidebar.catering" },
];

const HEADER_ACTIONS: Item[] = [
  { label: "shell.action.shareBrief", body: "help.headerActions.shareBrief" },
  { label: "shell.action.clientPack", body: "help.headerActions.clientPack" },
  { label: "shell.action.printReport", body: "help.headerActions.exportReport" },
  { label: "shell.action.downloadCsv", body: "help.headerActions.csv" },
  { label: "shell.action.simulate", body: "help.headerActions.simulateShow" },
  { label: "shell.action.resetProject", body: "help.headerActions.reset" },
];

const TIPS: TranslationKey[] = [
  "help.tips.autosave",
  "help.tips.language",
  "help.tips.theme",
  "help.tips.portal",
  "help.tips.print",
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HelpModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stableClose = useCallback(() => {
    onCloseRef.current();
  }, []);

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
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", handleKey, true);
      window.clearTimeout(focusTimer);
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
            <h4>{t("help.section.sidebar")}</h4>
            <ul className="help-list">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.body}>
                  <strong>{t(item.label)}</strong>
                  <span>{t(item.body)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="help-section">
            <h4>{t("help.section.headerActions")}</h4>
            <ul className="help-list">
              {HEADER_ACTIONS.map((item) => (
                <li key={item.body}>
                  <strong>{t(item.label)}</strong>
                  <span>{t(item.body)}</span>
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
