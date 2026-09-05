import { useEffect, useState } from "react";
import type { FartAlert } from "./FartBroadcastOverlay";
import { prepareFartAudio } from "./fartSounds";

export function useFartAlerts(
  getToken: () => Promise<string | null>,
  currentUserId: string | null | undefined,
) {
  const [alert, setAlert] = useState<FartAlert | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let reconnectTimer: number | null = null;
    const primeAudio = () => {
      prepareFartAudio();
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
    window.addEventListener("pointerdown", primeAudio, { once: true });
    window.addEventListener("keydown", primeAudio, { once: true });

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || controller.signal.aborted) return;
        const response = await fetch("/api/fart-alerts/stream", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("stream unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const data = event
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!data) continue;
            const parsed = JSON.parse(data.slice(6)) as FartAlert;
            if (parsed.senderUserId !== currentUserId) setAlert(parsed);
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!controller.signal.aborted) {
        reconnectTimer = window.setTimeout(connect, 2_000);
      }
    };

    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, [currentUserId, getToken]);

  return { alert, clearAlert: () => setAlert(null) };
}