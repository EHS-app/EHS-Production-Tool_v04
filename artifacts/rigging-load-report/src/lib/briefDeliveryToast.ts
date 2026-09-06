export type BriefDeliveryCounts = {
  sent?: number;
  skipped?: number;
  alreadySent?: number;
};

export type BriefDeliveryToast = {
  kind: "success" | "error";
  message: string;
};

export function briefDeliveryToast(
  delivery: BriefDeliveryCounts | null | undefined,
): BriefDeliveryToast {
  const sent = delivery?.sent ?? 0;
  const skipped = delivery?.skipped ?? 0;
  if (sent > 0) {
    return {
      kind: "success",
      message: `Briefs emailed successfully to ${sent} crew member${sent === 1 ? "" : "s"}`,
    };
  }
  return {
    kind: "error",
    message:
      skipped > 0
        ? "No briefs were emailed. Check freelancer email profiles."
        : "Brief emails are already being sent.",
  };
}