import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useT } from "../../lib/i18n/I18nContext";
import { FartBroadcastOverlay } from "./FartBroadcastOverlay";
import { FartPopup } from "./FartPopup";
import { useFartAlerts } from "./useFartAlerts";
import "./fart.css";

/**
 * <FartButton /> — the always-visible launcher for the Fart popup.
 *
 * Rendered once at the application root (see `main.tsx`), so it is
 * available from every screen — producer Production Tool, freelancer
 * Portal, modals, etc. — without each page having to opt in.
 *
 * Architectural notes:
 *  - Local component state only: opening the popup does not touch any
 *    Production-Tool stores, autosave hooks, or keyboard shortcuts.
 *  - The launcher itself sits at z-index 60 so it floats above the
 *    portal's bottom-nav (z-index 30) but below the popup overlay
 *    (z-index 9999), ensuring overlay clicks always win.
 *  - All visual / sound / overlay logic lives in <FartPopup>, which is
 *    only mounted while `open === true` — that means no listeners,
 *    timers, or audio nodes exist when the user isn't farting.
 */
export function FartButton() {
  const t = useT();
  const { getToken, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const { alert, clearAlert } = useFartAlerts(getToken, userId);
  return (
    <>
      <button
        type="button"
        className="fart-launcher"
        title={t("fart.tooltip")}
        aria-label={t("fart.tooltip")}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>💨</span>
      </button>
      <FartPopup open={open} onClose={() => setOpen(false)} />
      {alert ? (
        <FartBroadcastOverlay alert={alert} onClose={clearAlert} />
      ) : null}
    </>
  );
}
