import { useEffect, useMemo, useRef, useState } from "react";
import type { ExtractedItems } from "../../lib/drawingAnalysis";
import { OverlayBox } from "./OverlayBox";
import {
  fromOverlayItems,
  newOverlayItem,
  relabelOverlayItem,
  toOverlayItems,
  type OverlayItem,
  type OverlayItemKind,
} from "./overlayItem";

type Props = {
  /** A renderable image data URL or object URL. For PDFs the host
   *  passes the rasterised first page — see `fileToFloorPlan`. */
  imageUrl: string;
  /** The extracted items returned by the analyser. The editor takes
   *  a deep snapshot of these on open and only commits back via
   *  `onSave`, so cancelling discards in-progress edits. */
  extracted: ExtractedItems;
  onClose: () => void;
  /** Commit the corrected `ExtractedItems` back to the parent. The
   *  parent decides what happens next — usually showing the
   *  "apply to reports" panel with the corrected items. */
  onSave: (corrected: ExtractedItems) => void;
};

const KIND_LABELS: Record<OverlayItemKind, string> = {
  truss: "Truss",
  lighting: "Lighting",
  led: "LED Screen",
  stage: "Stage",
  sound: "Sound",
};

const KINDS: OverlayItemKind[] = ["truss", "lighting", "led", "stage", "sound"];

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

function parseNumOrNull(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Modal overlay editor — renders the uploaded drawing with one box
 *  per detected item, plus a side panel that edits the selected
 *  item. Designed to be a self-contained dialog: it owns its own
 *  draft state, blocks the host page behind a backdrop, and only
 *  reaches outside via `onClose` / `onSave`. */
export function OverlayEditor({
  imageUrl,
  extracted,
  onClose,
  onSave,
}: Props) {
  const initialItems = useMemo(() => toOverlayItems(extracted), [extracted]);
  const [items, setItems] = useState<OverlayItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  // Stash the *image* element (not the wrapper) so OverlayBox can
  // read its bounding rect for normalisation. We update on load so
  // the rect is correct after the image fills its slot.
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const escListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Close on Escape, mirroring native dialog conventions. The
  // listener is removed on unmount to avoid leaking after the user
  // closes the editor by other means.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    escListenerRef.current = onKey;
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      escListenerRef.current = null;
    };
  }, [onClose]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  function updateItem(id: string, mut: (item: OverlayItem) => OverlayItem) {
    setItems((curr) => curr.map((it) => (it.id === id ? mut(it) : it)));
  }

  function addItem(kind: OverlayItemKind) {
    const fresh = newOverlayItem(kind);
    setItems((curr) => [...curr, fresh]);
    setSelectedId(fresh.id);
  }

  function deleteItem(id: string) {
    setItems((curr) => curr.filter((it) => it.id !== id));
    setSelectedId((curr) => (curr === id ? null : curr));
  }

  function commit() {
    onSave(fromOverlayItems(extracted, items));
  }

  return (
    <div
      className="overlay-editor-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit detected items on the drawing"
      onClick={(e) => {
        // Only close when the click started on the backdrop itself,
        // never when it bubbled up from the dialog body or a box —
        // otherwise dragging a box can accidentally close the editor.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="overlay-editor-shell">
        <header className="overlay-editor-head">
          <div>
            <strong>Edit detections</strong>
            <span className="led-sub" style={{ marginLeft: 8 }}>
              {items.length} item{items.length === 1 ? "" : "s"}. Drag to move,
              corners to resize. Click a box to edit it.
            </span>
          </div>
          <div className="overlay-editor-head-actions">
            <button type="button" className="btn btn-soft" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={commit}>
              Save corrections
            </button>
          </div>
        </header>

        <div className="overlay-editor-toolbar">
          <span className="led-sub">Add new:</span>
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`btn btn-soft btn-xs overlay-add-${kind}`}
              onClick={() => addItem(kind)}
            >
              + {KIND_LABELS[kind]}
            </button>
          ))}
        </div>

        <div className="overlay-editor-body">
          <div
            className="overlay-editor-canvas"
            // Click on the backdrop image (i.e. NOT a box) deselects
            // so the side panel collapses and the user can see the
            // whole drawing without overlays competing for attention.
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            <div className="overlay-editor-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={setImageEl}
                src={imageUrl}
                alt="Uploaded drawing"
                draggable={false}
                onClick={() => setSelectedId(null)}
              />
              {items.map((item) => (
                <OverlayBox
                  key={item.id}
                  bbox={item.bbox}
                  type={item.kind}
                  label={item.label}
                  confidence={item.confidence}
                  isSelected={item.id === selectedId}
                  imageEl={imageEl}
                  onSelect={() => setSelectedId(item.id)}
                  onChange={(bbox) =>
                    updateItem(item.id, (it) => ({ ...it, bbox }))
                  }
                />
              ))}
            </div>
          </div>

          <aside className="overlay-editor-side">
            {!selected && (
              <div className="overlay-editor-empty">
                <strong>No item selected</strong>
                <p className="led-sub">
                  Click a box on the drawing to edit it, or use the
                  <em> + Add</em> buttons above to add a new item.
                </p>
              </div>
            )}
            {selected && (
              <SidePanel
                item={selected}
                onChange={(next) =>
                  updateItem(selected.id, () => relabelOverlayItem(next))
                }
                onDelete={() => deleteItem(selected.id)}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  item,
  onChange,
  onDelete,
}: {
  item: OverlayItem;
  onChange: (next: OverlayItem) => void;
  onDelete: () => void;
}) {
  // Helper so each field can mutate the payload without rewriting the
  // discriminated union plumbing five times.
  function patchPayload(patch: Record<string, unknown>) {
    onChange({ ...item, payload: { ...item.payload, ...patch } } as OverlayItem);
  }

  const conf = item.confidence;

  return (
    <div className="overlay-side-panel">
      <header className="overlay-side-head">
        <span className={`overlay-pill overlay-pill-${item.kind}`}>
          {KIND_LABELS[item.kind]}
        </span>
        {conf != null && (
          <span className={`overlay-conf-pill ${confClass(conf)}`}>
            {(conf * 100).toFixed(0)}% confidence
          </span>
        )}
      </header>

      <label className="overlay-field">
        <span>Name / label</span>
        <input
          type="text"
          value={item.payload.name}
          onChange={(e) =>
            onChange({
              ...item,
              payload: { ...item.payload, name: e.target.value },
            } as OverlayItem)
          }
        />
      </label>

      {item.kind === "truss" && (
        <>
          <label className="overlay-field">
            <span>Length (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.lengthM)}
              onChange={(e) =>
                patchPayload({ lengthM: parseNumOrNull(e.target.value) ?? 0 })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Hoist points</span>
            <input
              type="number"
              step="1"
              min="1"
              max="8"
              value={fmtNum(item.payload.pointCount)}
              onChange={(e) => {
                const v = parseNumOrNull(e.target.value) ?? 1;
                patchPayload({
                  pointCount: Math.max(1, Math.min(8, Math.round(v))),
                });
              }}
            />
          </label>
          <label className="overlay-field">
            <span>Hoist capacity (kg)</span>
            <input
              type="number"
              step="100"
              min="0"
              value={fmtNum(item.payload.hoistKg)}
              onChange={(e) =>
                patchPayload({ hoistKg: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Trim height (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.trimM)}
              onChange={(e) =>
                patchPayload({ trimM: parseNumOrNull(e.target.value) })
              }
            />
          </label>
        </>
      )}

      {item.kind === "lighting" && (
        <>
          <label className="overlay-field">
            <span>Quantity</span>
            <input
              type="number"
              step="1"
              min="1"
              value={fmtNum(item.payload.qty)}
              onChange={(e) => {
                const v = parseNumOrNull(e.target.value) ?? 1;
                patchPayload({ qty: Math.max(1, Math.round(v)) });
              }}
            />
          </label>
          <label className="overlay-field">
            <span>On truss</span>
            <input
              type="text"
              value={item.payload.trussName}
              placeholder="e.g. LX1"
              onChange={(e) => patchPayload({ trussName: e.target.value })}
            />
          </label>
          <label className="overlay-field">
            <span>Weight (kg, each)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.weightKg)}
              onChange={(e) =>
                patchPayload({ weightKg: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Watts (each)</span>
            <input
              type="number"
              step="1"
              min="0"
              value={fmtNum(item.payload.watts)}
              onChange={(e) =>
                patchPayload({ watts: parseNumOrNull(e.target.value) })
              }
            />
          </label>
        </>
      )}

      {item.kind === "led" && (
        <>
          <label className="overlay-field">
            <span>Width (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.widthM)}
              onChange={(e) =>
                patchPayload({ widthM: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Height (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.heightM)}
              onChange={(e) =>
                patchPayload({ heightM: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Panels wide</span>
            <input
              type="number"
              step="1"
              min="0"
              value={fmtNum(item.payload.panelsWide)}
              onChange={(e) =>
                patchPayload({ panelsWide: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Panels tall</span>
            <input
              type="number"
              step="1"
              min="0"
              value={fmtNum(item.payload.panelsTall)}
              onChange={(e) =>
                patchPayload({ panelsTall: parseNumOrNull(e.target.value) })
              }
            />
          </label>
        </>
      )}

      {item.kind === "stage" && (
        <>
          <label className="overlay-field">
            <span>Width (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.widthM)}
              onChange={(e) =>
                patchPayload({ widthM: parseNumOrNull(e.target.value) ?? 0 })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Depth (m)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.depthM)}
              onChange={(e) =>
                patchPayload({ depthM: parseNumOrNull(e.target.value) ?? 0 })
              }
            />
          </label>
        </>
      )}

      {item.kind === "sound" && (
        <>
          <label className="overlay-field">
            <span>Quantity</span>
            <input
              type="number"
              step="1"
              min="1"
              value={fmtNum(item.payload.qty)}
              onChange={(e) => {
                const v = parseNumOrNull(e.target.value) ?? 1;
                patchPayload({ qty: Math.max(1, Math.round(v)) });
              }}
            />
          </label>
          <label className="overlay-field">
            <span>Weight (kg, each)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fmtNum(item.payload.weightKg)}
              onChange={(e) =>
                patchPayload({ weightKg: parseNumOrNull(e.target.value) })
              }
            />
          </label>
          <label className="overlay-field">
            <span>Watts (each)</span>
            <input
              type="number"
              step="1"
              min="0"
              value={fmtNum(item.payload.watts)}
              onChange={(e) =>
                patchPayload({ watts: parseNumOrNull(e.target.value) })
              }
            />
          </label>
        </>
      )}

      <label className="overlay-field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={item.payload.notes}
          onChange={(e) => patchPayload({ notes: e.target.value })}
        />
      </label>

      <button
        type="button"
        className="btn btn-soft overlay-delete-btn"
        onClick={onDelete}
      >
        Delete this item
      </button>
    </div>
  );
}

function confClass(c: number): string {
  if (c >= 0.75) return "is-high";
  if (c >= 0.5) return "is-mid";
  return "is-low";
}
