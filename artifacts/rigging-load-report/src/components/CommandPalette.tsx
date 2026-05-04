import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlignLeft,
  Bed,
  Briefcase,
  ClipboardCheck,
  Coffee,
  LayoutGrid,
  MonitorPlay,
  Speaker,
  Users,
  Zap,
} from "lucide-react";
import type { ShellView } from "./AppShell";
import type { ShellAction } from "./AppShell";
import { useI18n } from "../lib/i18n/I18nContext";
import type { TranslationKey } from "../lib/i18n/types";

type PageEntry = {
  id: ShellView;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number }>;
};

const ALL_PAGES: PageEntry[] = [
  { id: "oversikt", labelKey: "shell.nav.overview", icon: Activity },
  { id: "rigging", labelKey: "shell.nav.rigging", icon: Briefcase },
  { id: "lighting", labelKey: "shell.nav.lighting", icon: Zap },
  { id: "led", labelKey: "shell.nav.led", icon: MonitorPlay },
  { id: "sound", labelKey: "shell.nav.sound", icon: Speaker },
  { id: "stage", labelKey: "shell.nav.stage", icon: AlignLeft },
  { id: "riggPlan", labelKey: "shell.nav.riggPlan", icon: LayoutGrid },
  { id: "inspection", labelKey: "shell.nav.inspection", icon: ClipboardCheck },
  { id: "crew", labelKey: "shell.nav.crew", icon: Users },
  { id: "hotel", labelKey: "shell.nav.hotel", icon: Bed },
  { id: "catering", labelKey: "shell.nav.catering", icon: Coffee },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ShellView) => void;
  actions: ShellAction[];
  showHotel: boolean;
  showCatering: boolean;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  actions,
  showHotel,
  showCatering,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const pages = ALL_PAGES.filter((p) => {
    if (p.id === "hotel" && !showHotel) return false;
    if (p.id === "catering" && !showCatering) return false;
    return true;
  });

  const q = query.trim().toLowerCase();

  const matchedPages = q
    ? pages.filter((p) => t(p.labelKey).toLowerCase().includes(q))
    : pages;

  const matchedActions = q
    ? actions.filter((a) => a.label.toLowerCase().includes(q))
    : actions;

  const totalItems = matchedPages.length + matchedActions.length;

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const executeItem = useCallback(
    (idx: number) => {
      if (idx < matchedPages.length) {
        onNavigate(matchedPages[idx].id);
      } else {
        const actionIdx = idx - matchedPages.length;
        const action = matchedActions[actionIdx];
        action?.onClick();
      }
      onClose();
    },
    [matchedPages, matchedActions, onNavigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % Math.max(totalItems, 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) =>
          prev <= 0 ? Math.max(totalItems - 1, 0) : prev - 1,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (totalItems > 0) executeItem(selectedIdx);
        return;
      }
    },
    [onClose, totalItems, selectedIdx, executeItem],
  );

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-selected='true']");
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      className="cmd-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cmd-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("shell.searchTitle")}
      >
        <div className="cmd-input-wrap">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="cmd-input-icon"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            placeholder={t("shell.searchPlaceholder")}
            aria-label={t("shell.searchTitle")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc">Esc</kbd>
        </div>

        <div className="cmd-list" ref={listRef}>
          {totalItems === 0 ? (
            <div className="cmd-empty">{t("shell.searchNoResults")}</div>
          ) : null}

          {matchedPages.length > 0 ? (
            <div className="cmd-group">
              <div className="cmd-group-heading">
                {t("shell.searchGroupPages")}
              </div>
              {matchedPages.map((p) => {
                runningIdx++;
                const idx = runningIdx;
                const Icon = p.icon;
                const selected = idx === selectedIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`cmd-item${selected ? " is-selected" : ""}`}
                    data-selected={selected}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => executeItem(idx)}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    <span>{t(p.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {matchedActions.length > 0 ? (
            <div className="cmd-group">
              <div className="cmd-group-heading">
                {t("shell.searchGroupActions")}
              </div>
              {matchedActions.map((a) => {
                runningIdx++;
                const idx = runningIdx;
                const Icon = a.icon;
                const selected = idx === selectedIdx;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`cmd-item${selected ? " is-selected" : ""}`}
                    data-selected={selected}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => executeItem(idx)}
                  >
                    {Icon ? <Icon size={15} /> : null}
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
