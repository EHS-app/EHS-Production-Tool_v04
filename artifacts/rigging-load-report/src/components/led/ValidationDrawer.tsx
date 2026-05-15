/** Slide-out validation drawer.
 *
 *  Renders the result of `runValidation()` grouped by severity.
 *  Producer can click a violation to scroll the offending screen
 *  into view (handled by parent via `onJumpToScreen`).
 */

import { useEffect, useRef } from "react";
import type { LedViolation } from "../../lib/led/validation/rules";

export function ValidationDrawer({
  open,
  onClose,
  violations,
  onJumpToScreen,
}: {
  open: boolean;
  onClose: () => void;
  violations: LedViolation[];
  onJumpToScreen?: (screenId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const errors = violations.filter((v) => v.level === "error");
  const warnings = violations.filter((v) => v.level === "warn");
  const infos = violations.filter((v) => v.level === "info");

  return (
    <div
      className="led-validation-drawer"
      role="dialog"
      aria-modal="false"
      aria-label="LED validation"
      tabIndex={-1}
      ref={ref}
    >
      <div className="led-validation-head">
        <strong>LED validation</strong>
        <span className="led-validation-counts">
          {errors.length > 0 && (
            <span className="led-validation-pill led-validation-pill-error">
              {errors.length} error{errors.length === 1 ? "" : "s"}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="led-validation-pill led-validation-pill-warn">
              {warnings.length} warning{warnings.length === 1 ? "" : "s"}
            </span>
          )}
          {infos.length > 0 && (
            <span className="led-validation-pill led-validation-pill-info">
              {infos.length} info
            </span>
          )}
        </span>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="led-validation-body">
        {violations.length === 0 ? (
          <p className="led-validation-empty">
            All checks pass. Nothing to fix.
          </p>
        ) : (
          <ul className="led-validation-list">
            {[...errors, ...warnings, ...infos].map((v, i) => (
              <li
                key={`${v.ruleId}-${v.entityId ?? "x"}-${i}`}
                className={`led-validation-item led-validation-item-${v.level}`}
              >
                <button
                  type="button"
                  className="led-validation-jump"
                  disabled={!v.entityId || !onJumpToScreen}
                  onClick={() => {
                    if (v.entityId && onJumpToScreen) {
                      onJumpToScreen(v.entityId);
                    }
                  }}
                  title={v.entityId ? "Jump to screen" : ""}
                >
                  <span className={`led-validation-dot led-validation-dot-${v.level}`} />
                  <span className="led-validation-msg">
                    <strong>{v.message}</strong>
                    {v.hint && <em className="led-validation-hint">{v.hint}</em>}
                  </span>
                  <code className="led-validation-rule">{v.ruleId}</code>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
