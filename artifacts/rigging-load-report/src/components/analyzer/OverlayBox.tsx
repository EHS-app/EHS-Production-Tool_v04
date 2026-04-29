import { useEffect, useRef } from "react";
import type { Bbox } from "../../lib/drawingAnalysis";
import type { OverlayItemKind } from "./overlayItem";

type DragMode =
  | { kind: "move" }
  | { kind: "resize"; corner: "nw" | "ne" | "sw" | "se" };

type Props = {
  bbox: Bbox;
  type: OverlayItemKind;
  label: string;
  /** 0..1 (or null when unknown). Drives the badge colour. */
  confidence: number | null;
  isSelected: boolean;
  /** Element whose bounding rect defines the (1.0, 1.0) basis the bbox
   *  is normalised against. The box reads pointer events in absolute
   *  pixels and divides by this rect's size to update normalised
   *  coords. Pass the *image* element, not the outer wrapper, so the
   *  letter-boxed area around the image isn't part of the basis. */
  imageEl: HTMLElement | null;
  onSelect: () => void;
  onChange: (next: Bbox) => void;
};

const MIN_SIZE = 0.02;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Drag-clamp helpers: translate / resize a bbox while keeping it
 *  inside the [0, 1] image rectangle and never letting width or
 *  height drop below MIN_SIZE. */
function applyMove(start: Bbox, dx: number, dy: number): Bbox {
  const x = clamp01(start.x + dx);
  const y = clamp01(start.y + dy);
  const cappedX = Math.min(x, 1 - start.width);
  const cappedY = Math.min(y, 1 - start.height);
  return {
    x: Math.max(0, cappedX),
    y: Math.max(0, cappedY),
    width: start.width,
    height: start.height,
  };
}

function applyResize(
  start: Bbox,
  dx: number,
  dy: number,
  corner: "nw" | "ne" | "sw" | "se",
): Bbox {
  let { x, y, width, height } = start;
  if (corner === "nw" || corner === "sw") {
    const newX = clamp01(start.x + dx);
    const maxX = start.x + start.width - MIN_SIZE;
    x = Math.min(newX, maxX);
    width = start.x + start.width - x;
  } else {
    width = Math.max(MIN_SIZE, Math.min(1 - start.x, start.width + dx));
  }
  if (corner === "nw" || corner === "ne") {
    const newY = clamp01(start.y + dy);
    const maxY = start.y + start.height - MIN_SIZE;
    y = Math.min(newY, maxY);
    height = start.y + start.height - y;
  } else {
    height = Math.max(MIN_SIZE, Math.min(1 - start.y, start.height + dy));
  }
  // Final belt-and-braces clamp for the tiny-box edge case where a
  // start bbox under MIN_SIZE near the top/left could let `maxX` or
  // `maxY` go slightly negative. Keeps every emitted bbox inside
  // [0, 1] and width/height >= MIN_SIZE so the editor invariants
  // hold for downstream consumers.
  return {
    x: clamp01(x),
    y: clamp01(y),
    width: Math.max(MIN_SIZE, width),
    height: Math.max(MIN_SIZE, height),
  };
}

/** A single absolute-positioned, draggable + resizable bounding box.
 *  Position / size are expressed in PERCENT so the box scales with
 *  the underlying image when the viewport changes. The image element
 *  passed via `imageEl` is the basis for normalisation — its current
 *  pixel size is read on every pointerdown so the math stays correct
 *  even after window resizes. */
export function OverlayBox({
  bbox,
  type,
  label,
  confidence,
  isSelected,
  imageEl,
  onSelect,
  onChange,
}: Props) {
  // Latest bbox lives in a ref so the global pointermove handler we
  // attach during a drag always sees the freshest value without
  // needing to re-bind on every render.
  const startRef = useRef<{
    bbox: Bbox;
    pointerId: number;
    mode: DragMode;
    rectW: number;
    rectH: number;
    startX: number;
    startY: number;
  } | null>(null);

  function startDrag(e: React.PointerEvent, mode: DragMode) {
    if (!imageEl) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const rect = imageEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    startRef.current = {
      bbox,
      pointerId: e.pointerId,
      mode,
      rectW: rect.width,
      rectH: rect.height,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = (e.clientX - s.startX) / s.rectW;
    const dy = (e.clientY - s.startY) / s.rectH;
    const next =
      s.mode.kind === "move"
        ? applyMove(s.bbox, dx, dy)
        : applyResize(s.bbox, dx, dy, s.mode.corner);
    onChange(next);
  }

  function endDrag(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    startRef.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      // Already released — happens when the pointer leaves the window
      // before the up event fires. Safe to ignore.
    }
  }

  // Drop the in-flight drag on unmount so a deleted box never leaves
  // a dangling pointer-capture handle.
  useEffect(() => {
    return () => {
      startRef.current = null;
    };
  }, []);

  const style: React.CSSProperties = {
    left: `${bbox.x * 100}%`,
    top: `${bbox.y * 100}%`,
    width: `${bbox.width * 100}%`,
    height: `${bbox.height * 100}%`,
  };

  return (
    <div
      className={`overlay-box overlay-box-${type}${isSelected ? " is-selected" : ""}`}
      style={style}
      onPointerDown={(e) => startDrag(e, { kind: "move" })}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="button"
      tabIndex={0}
      aria-label={`${type} ${label}`}
    >
      <span className="overlay-box-label">
        <span className="overlay-box-type">{typeShort(type)}</span>
        <span className="overlay-box-text">{label || "—"}</span>
        {confidence != null && (
          <span
            className={`overlay-box-conf ${confidenceClass(confidence)}`}
            title={`Confidence ${(confidence * 100).toFixed(0)}%`}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </span>
      {isSelected && (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <span
              key={corner}
              className={`overlay-handle overlay-handle-${corner}`}
              onPointerDown={(e) => startDrag(e, { kind: "resize", corner })}
              onPointerMove={onMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-hidden
            />
          ))}
        </>
      )}
    </div>
  );
}

function typeShort(t: OverlayItemKind): string {
  switch (t) {
    case "truss":
      return "TR";
    case "lighting":
      return "LX";
    case "led":
      return "LED";
    case "stage":
      return "ST";
    case "sound":
      return "SND";
  }
}

function confidenceClass(c: number): string {
  if (c >= 0.75) return "is-high";
  if (c >= 0.5) return "is-mid";
  return "is-low";
}
