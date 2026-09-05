import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { playFart, type FartIntensity } from "./fartSounds";

export type FartAlert = {
  id: string;
  senderUserId: string;
  senderName: string;
  message: string;
  intensity: FartIntensity;
  createdAt: string;
};

type Cloud = {
  id: number;
  top: number;
  left: number;
  delay: number;
  dx: number;
  dy: number;
  rotation: number;
};

export function FartBroadcastOverlay({
  alert,
  onClose,
}: {
  alert: FartAlert;
  onClose: () => void;
}) {
  const clouds = useMemo<Cloud[]>(
    () =>
      Array.from(
        { length: alert.intensity === "nuclear" ? 22 : 14 },
        (_, id) => ({
          id,
          top: 20 + Math.random() * 60,
          left: 5 + Math.random() * 90,
          delay: Math.random() * 400,
          dx: (Math.random() - 0.5) * 240,
          dy: -80 - Math.random() * 220,
          rotation: (Math.random() - 0.5) * 60,
        }),
      ),
    [alert.id, alert.intensity],
  );

  useEffect(() => {
    playFart(alert.intensity);
    const shakeClass =
      alert.intensity === "nuclear" ? "fart-shake-nuclear" : "fart-shake";
    document.documentElement.classList.add(shakeClass);
    const shakeTimer = window.setTimeout(
      () => document.documentElement.classList.remove(shakeClass),
      alert.intensity === "nuclear" ? 1_900 : 650,
    );
    const closeTimer = window.setTimeout(onClose, 3_000);
    return () => {
      window.clearTimeout(shakeTimer);
      window.clearTimeout(closeTimer);
      document.documentElement.classList.remove(shakeClass);
    };
  }, [alert, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fart-overlay"
      onClick={onClose}
      role="alert"
      aria-live="assertive"
    >
      <div className="fart-overlay-flash" />
      {clouds.map((cloud) => (
        <span
          key={cloud.id}
          className="fart-cloud"
          aria-hidden
          style={{
            top: `${cloud.top}%`,
            left: `${cloud.left}%`,
            animationDelay: `${cloud.delay}ms`,
            ["--fart-dx" as string]: `${cloud.dx}px`,
            ["--fart-dy" as string]: `${cloud.dy}px`,
            ["--fart-rot" as string]: `${cloud.rotation}deg`,
          }}
        >
          💨
        </span>
      ))}
      <div className="fart-overlay-content">
        <div className="fart-overlay-text">{alert.message}</div>
        <div className="fart-overlay-sender">— {alert.senderName}</div>
      </div>
    </div>,
    document.body,
  );
}