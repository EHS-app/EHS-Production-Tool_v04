import { randomUUID } from "node:crypto";
import { pool, type PoolClient } from "@workspace/db";
import { logger } from "./logger";

export type FartIntensity = "small" | "medium" | "nuclear";

export type FartAlert = {
  id: string;
  senderUserId: string;
  senderName: string;
  message: string;
  intensity: FartIntensity;
  createdAt: string;
};

const CHANNEL = "ehs_fart_alerts";
const subscribers = new Set<(alert: FartAlert) => void>();
type ListenerRecord = {
  client: PoolClient;
  generation: number;
  dispose: (error?: Error) => void;
  close: () => Promise<void>;
};
let listenerRecord: ListenerRecord | null = null;
let connectionPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;
let listenerGeneration = 0;

function isFartAlert(value: unknown): value is FartAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Partial<FartAlert>;
  return (
    typeof alert.id === "string" &&
    typeof alert.senderUserId === "string" &&
    typeof alert.senderName === "string" &&
    typeof alert.message === "string" &&
    (alert.intensity === "small" ||
      alert.intensity === "medium" ||
      alert.intensity === "nuclear") &&
    typeof alert.createdAt === "string"
  );
}

function scheduleReconnect(): void {
  if (
    shuttingDown ||
    reconnectTimer ||
    listenerRecord ||
    connectionPromise ||
    subscribers.size === 0
  ) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensureFartBroadcastListener();
  }, 2_000);
  reconnectTimer.unref();
}

async function ensureFartBroadcastListener(): Promise<void> {
  if (
    listenerRecord ||
    connectionPromise ||
    shuttingDown ||
    subscribers.size === 0
  ) {
    return;
  }
  const generation = ++listenerGeneration;
  connectionPromise = (async () => {
    const client = await pool.connect();
    let released = false;
    let closing = false;
    let closeError: Error | undefined;
    const detach = () => {
      client.off("notification", onNotification);
      client.off("error", onError);
      client.off("end", onEnd);
    };
    const dispose = (error?: Error) => {
      if (released) return;
      released = true;
      detach();
      if (listenerRecord === record) listenerRecord = null;
      client.release(error);
    };
    const close = async () => {
      if (released || closing) return;
      closing = true;
      client.off("notification", onNotification);
      client.off("end", onEnd);
      if (listenerRecord === record) listenerRecord = null;
      let releaseError: Error | undefined;
      try {
        await client.query(`UNLISTEN ${CHANNEL}`);
      } catch (error) {
        releaseError =
          error instanceof Error ? error : new Error(String(error));
      } finally {
        // Keep onError installed while UNLISTEN is pending so a socket error is
        // consumed instead of becoming an uncaught EventEmitter error.
        released = true;
        closing = false;
        client.off("error", onError);
        client.release(closeError ?? releaseError);
      }
    };
    const onNotification = (notification: {
      channel: string;
      payload?: string;
    }) => {
      if (notification.channel !== CHANNEL || !notification.payload) return;
      try {
        const parsed: unknown = JSON.parse(notification.payload);
        if (!isFartAlert(parsed)) {
          logger.warn({ scope: "fartBroadcast" }, "ignored invalid fart alert");
          return;
        }
        for (const subscriber of subscribers) subscriber(parsed);
      } catch (error) {
        logger.warn(
          {
            scope: "fartBroadcast",
            error: error instanceof Error ? error.message : String(error),
          },
          "could not parse fart alert",
        );
      }
    };
    const onError = (error: Error) => {
      logger.warn(
        { scope: "fartBroadcast", error: error.message },
        "fart broadcast listener disconnected",
      );
      if (closing) {
        closeError ??= error;
        return;
      }
      dispose(error);
      if (generation === listenerGeneration) scheduleReconnect();
    };
    const onEnd = () => {
      dispose();
      if (generation === listenerGeneration) scheduleReconnect();
    };
    const record: ListenerRecord = {
      client,
      generation,
      dispose,
      close,
    };
    client.on("notification", onNotification);
    client.on("error", onError);
    client.on("end", onEnd);
    try {
      await client.query(`LISTEN ${CHANNEL}`);
      if (
        generation !== listenerGeneration ||
        shuttingDown ||
        subscribers.size === 0
      ) {
        await close();
        return;
      }
      listenerRecord = record;
      logger.info({ scope: "fartBroadcast" }, "fart broadcast listener ready");
    } catch (error) {
      dispose(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  })().catch((error) => {
    logger.warn(
      {
        scope: "fartBroadcast",
        error: error instanceof Error ? error.message : String(error),
      },
      "could not start fart broadcast listener",
    );
  }).finally(() => {
    if (generation === listenerGeneration) {
      connectionPromise = null;
      scheduleReconnect();
    }
  });
  await connectionPromise;
}

async function disconnectFartBroadcastListener(): Promise<void> {
  listenerGeneration += 1;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  connectionPromise = null;
  const record = listenerRecord;
  listenerRecord = null;
  if (record) await record.close();
}

export function subscribeToFartAlerts(
  subscriber: (alert: FartAlert) => void,
): () => void {
  subscribers.add(subscriber);
  void ensureFartBroadcastListener();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) void disconnectFartBroadcastListener();
  };
}

export async function broadcastFartAlert(input: {
  senderUserId: string;
  senderName: string;
  message: string;
  intensity: FartIntensity;
}): Promise<FartAlert> {
  const alert: FartAlert = {
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  await pool.query("select pg_notify($1, $2)", [
    CHANNEL,
    JSON.stringify(alert),
  ]);
  return alert;
}

export function stopFartBroadcastListener(): void {
  shuttingDown = true;
  void disconnectFartBroadcastListener();
}