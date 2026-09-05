import { Router, type IRouter } from "express";
import {
  broadcastFartAlert,
  subscribeToFartAlerts,
  type FartIntensity,
} from "../lib/fartBroadcast";

const router: IRouter = Router();
const intensities = new Set<FartIntensity>(["small", "medium", "nuclear"]);

router.get("/fart-alerts/stream", (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  if (!res.write(": connected\n\n")) {
    res.end();
    return;
  }

  let closed = false;
  let heartbeat: NodeJS.Timeout | null = null;
  let unsubscribe = () => {};
  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    unsubscribe();
    if (!res.writableEnded) res.end();
  };
  unsubscribe = subscribeToFartAlerts((alert) => {
    if (
      closed ||
      !res.write(`event: fart-alert\ndata: ${JSON.stringify(alert)}\n\n`)
    ) {
      req.log.warn({ scope: "fartAlerts" }, "fart alert stream backpressure");
      cleanup();
    }
  });
  heartbeat = setInterval(() => {
    if (closed || !res.write(": heartbeat\n\n")) cleanup();
  }, 20_000);
  heartbeat.unref();

  req.once("close", cleanup);
  res.once("close", cleanup);
});

router.post("/fart-alerts", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const senderName =
    typeof body.senderName === "string" ? body.senderName.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const intensity =
    typeof body.intensity === "string" ? body.intensity : "";
  if (
    !senderName ||
    senderName.length > 40 ||
    !message ||
    message.length > 160 ||
    !intensities.has(intensity as FartIntensity)
  ) {
    res.status(400).json({ ok: false, error: "Invalid fart alert." });
    return;
  }
  try {
    const alert = await broadcastFartAlert({
      senderUserId: (req as unknown as { _userId: string })._userId,
      senderName,
      message,
      intensity: intensity as FartIntensity,
    });
    res.status(202).json({ ok: true, alert });
  } catch (error) {
    req.log.error(error, "Failed to broadcast fart alert");
    res.status(503).json({ ok: false, error: "Fart broadcast unavailable." });
  }
});

export default router;