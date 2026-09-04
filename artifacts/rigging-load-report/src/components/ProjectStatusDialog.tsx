import { useEffect, useId, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { useT } from "../lib/i18n/I18nContext";
import {
  PROJECT_STATUS_META,
  type ProjectStatus,
} from "../lib/projectStatus";

export interface EligibleFreelancer {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromStatus: ProjectStatus;
  toStatus: ProjectStatus;
  projectName: string;
  eligibleFreelancers?: ReadonlyArray<EligibleFreelancer>;
  loading?: boolean;
  error?: string | null;
  /** Active-project operational action; does not advance lifecycle state. */
  dispatchRetry?: boolean;
  dispatchRetryResult?: "sent" | "alreadySent" | null;
  onConfirm: (reason?: string) => void | Promise<void>;
}

export function ProjectStatusDialog({
  open,
  onOpenChange,
  fromStatus,
  toStatus,
  projectName,
  eligibleFreelancers = [],
  loading = false,
  error,
  dispatchRetry = false,
  dispatchRetryResult = null,
  onConfirm,
}: Props) {
  const t = useT();
  const reasonId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const activation =
    !dispatchRetry && fromStatus === "planning" && toStatus === "active";
  const terminal = toStatus === "completed" || toStatus === "archived";
  const actionLabel = dispatchRetry
    ? t("project.status.action.retryDispatch")
    : activation
    ? t("project.status.action.activateDispatch")
    : toStatus === "completed"
      ? t("project.status.action.complete")
      : toStatus === "archived"
        ? t("project.status.action.archive")
        : t("project.status.action.continue");

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-[12000] bg-black/70 backdrop-blur-sm"
        />
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[12001] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <AlertDialogPrimitive.Title className="text-xl font-bold text-white">
            {dispatchRetry
              ? t("project.status.retry.title", { name: projectName })
              : t("project.status.dialog.title", { name: projectName })}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm leading-6 text-slate-300">
            {dispatchRetry
              ? t("project.status.retry.description")
              : t("project.status.dialog.description")}
          </AlertDialogPrimitive.Description>

          {!dispatchRetry ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <strong style={{ color: PROJECT_STATUS_META[fromStatus].color }}>
              {t(`project.status.${fromStatus}`)}
            </strong>
            <ArrowRight size={16} aria-hidden />
            <strong style={{ color: PROJECT_STATUS_META[toStatus].color }}>
              {t(`project.status.${toStatus}`)}
            </strong>
          </div> : null}

          {dispatchRetry ? (
            <div className="mt-5 flex gap-3 rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm text-blue-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden />
              <p>{t("project.status.retry.warning")}</p>
            </div>
          ) : null}

          {activation ? (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-semibold">
                <Users size={17} aria-hidden />
                {t("project.status.activation.title", {
                  count: eligibleFreelancers.length,
                })}
              </div>
              <p className="mt-2 text-emerald-100/80">
                {eligibleFreelancers.length
                  ? t("project.status.activation.body")
                  : t("project.status.activation.none")}
              </p>
              {eligibleFreelancers.length ? (
                <ul className="mt-2 max-h-28 list-disc overflow-y-auto pl-5 text-emerald-50">
                  {eligibleFreelancers.map((person) => (
                    <li key={person.id}>{person.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {terminal ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden />
              <div>
                <strong>
                  {toStatus === "completed"
                    ? t("project.status.completed.warningTitle")
                    : t("project.status.archived.warningTitle")}
                </strong>
                <p className="mt-1 text-amber-100/80">
                  {toStatus === "completed"
                    ? t("project.status.completed.warning")
                    : t("project.status.archived.warning")}
                </p>
              </div>
            </div>
          ) : null}

          <label htmlFor={reasonId} className="mt-5 block text-sm font-medium text-slate-200">
            {t("project.status.reason")}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={loading}
            rows={3}
            maxLength={500}
            className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder={t("project.status.reasonPlaceholder")}
          />

          {error ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          {dispatchRetryResult ? (
            <div role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {dispatchRetryResult === "sent"
                ? t("project.status.retry.sent")
                : t("project.status.retry.alreadySent")}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-50"
            >
              {dispatchRetryResult ? t("common.close") : t("common.cancel")}
            </AlertDialogPrimitive.Cancel>
            {!dispatchRetryResult ? <AlertDialogPrimitive.Action
              disabled={loading}
              onClick={(event) => {
                event.preventDefault();
                void onConfirm(reason.trim() || undefined);
              }}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t("project.status.updating") : actionLabel}
            </AlertDialogPrimitive.Action> : null}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}