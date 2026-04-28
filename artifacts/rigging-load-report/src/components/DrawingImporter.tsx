import { useEffect, useRef, useState } from "react";
import {
  analyzeDrawing,
  emptyExtractedItems,
  selectAll,
  selectNone,
  totalItemCount,
  type ApplySelection,
  type ExtractedItems,
} from "../lib/drawingAnalysis";
import { fileToFloorPlan, type FloorPlan } from "../lib/floorPlan";

type Props = {
  /** Current venue dimensions, sent as context to the analyser so it
   *  can reconcile sizes on the drawing with what the user already set. */
  currentVenue: { widthM: number; depthM: number; ceilingM: number };
  projectName?: string;
  /** Apply the user's chosen subset back to the report. */
  onApply: (extracted: ExtractedItems, selection: ApplySelection) => void;
  /** Promote the currently-loaded drawing to the Rigg Plan backdrop.
   *  Optional — host views that don't show a plan can omit this. */
  onUseAsFloorPlan?: (plan: FloorPlan) => void;
  /** True when a backdrop is already set, so the button can swap labels
   *  to "Replace floor plan". */
  hasFloorPlan?: boolean;
};

const ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf,.pdf";

function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

function isAcceptedFile(f: File): boolean {
  return f.type.startsWith("image/") || isPdfFile(f);
}

const fmt = (n: number | null, d = 1): string =>
  n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d });

/** Toggle one index in/out of an Immutable-ish Set without mutating the
 *  caller's reference (so React picks up the change). */
function toggleIndex(set: Set<number>, idx: number): Set<number> {
  const next = new Set(set);
  if (next.has(idx)) next.delete(idx);
  else next.add(idx);
  return next;
}

export function DrawingImporter({
  currentVenue,
  projectName,
  onApply,
  onUseAsFloorPlan,
  hasFloorPlan,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedItems | null>(null);
  const [selection, setSelection] = useState<ApplySelection>(selectNone());
  const [applied, setApplied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPreparingFloorPlan, setIsPreparingFloorPlan] = useState(false);
  const [floorPlanApplied, setFloorPlanApplied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Revoke the object URL when we swap files / unmount, otherwise the
  // browser leaks an in-memory blob.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(f: File) {
    if (!isAcceptedFile(f)) {
      setError("Please choose a PDF or an image file (PNG, JPG, WebP or GIF).");
      return;
    }
    // Size guard mirrors the server-side caps so the user gets immediate
    // feedback instead of waiting for the upload to fail.
    const isPdf = isPdfFile(f);
    const cap = isPdf ? 8_000_000 : 4_500_000;
    if (f.size > cap) {
      setError(
        isPdf
          ? "PDF is too large; please use one under ~8 MB."
          : "Image is too large; please use one under ~4.5 MB.",
      );
      return;
    }
    setError(null);
    setExtracted(null);
    setSelection(selectNone());
    setApplied(false);
    setFloorPlanApplied(false);
    setFile(f);
  }

  async function useAsFloorPlan() {
    if (!file || !onUseAsFloorPlan) return;
    setError(null);
    setIsPreparingFloorPlan(true);
    try {
      const plan = await fileToFloorPlan(file);
      onUseAsFloorPlan(plan);
      setFloorPlanApplied(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not prepare this drawing for the floor plan.",
      );
    } finally {
      setIsPreparingFloorPlan(false);
    }
  }

  async function runAnalyze() {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setExtracted(null);
    setApplied(false);
    try {
      const result = await analyzeDrawing(file, {
        venue: currentVenue,
        projectName,
      });
      setExtracted(result);
      setSelection(selectAll(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function applyAll() {
    if (!extracted) return;
    onApply(extracted, selection);
    setApplied(true);
  }

  function reset() {
    setFile(null);
    setExtracted(null);
    setSelection(selectNone());
    setError(null);
    setApplied(false);
    setFloorPlanApplied(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const itemTotal = extracted ? totalItemCount(extracted) : 0;
  const items = extracted ?? emptyExtractedItems();
  const venueChanged =
    extracted &&
    (items.venue.widthM != null ||
      items.venue.depthM != null ||
      items.venue.ceilingM != null);

  return (
    <section className="led-card drawing-import">
      <div className="led-card-head">
        <h3>Import from drawing</h3>
        <span className="led-hint">
          Upload a stage / rigging plan you drew elsewhere — we&apos;ll read it and
          fill the report tabs with what we find.
        </span>
      </div>

      {!file && (
        <label
          className={`drawing-dropzone${isDragOver ? " is-drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
            style={{ display: "none" }}
          />
          <div className="drawing-dropzone-inner">
            <strong>Drop a drawing here</strong>
            <span>
              or click to choose a PDF (max ~8 MB) or PNG / JPG / WebP / GIF
              (max ~4 MB)
            </span>
          </div>
        </label>
      )}

      {file && (
        <div className="drawing-preview-row">
          <div className="drawing-preview">
            {!previewUrl ? (
              <div className="drawing-preview-empty">Loading preview…</div>
            ) : isPdfFile(file) ? (
              <div className="drawing-preview-pdf" aria-label="PDF preview">
                <span className="drawing-preview-pdf-badge">PDF</span>
                <span className="drawing-preview-pdf-name">{file.name}</span>
              </div>
            ) : (
              <img src={previewUrl} alt={file.name} />
            )}
          </div>
          <div className="drawing-preview-meta">
            <strong>{file.name}</strong>
            <span className="led-sub">
              {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
              {isPdfFile(file) ? "PDF document" : file.type || "image"}
            </span>
            <div className="drawing-preview-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={runAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analyzing…" : extracted ? "Re-analyze" : "Analyze drawing"}
              </button>
              {onUseAsFloorPlan && (
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={useAsFloorPlan}
                  disabled={isPreparingFloorPlan || isAnalyzing}
                  title={
                    hasFloorPlan
                      ? "Replace the current Rigg Plan backdrop"
                      : "Use this drawing as the Rigg Plan backdrop"
                  }
                >
                  {isPreparingFloorPlan
                    ? "Preparing…"
                    : floorPlanApplied
                      ? "Floor plan set"
                      : hasFloorPlan
                        ? "Replace floor plan"
                        : "Use as floor plan"}
                </button>
              )}
              <button
                type="button"
                className="btn btn-soft"
                onClick={reset}
                disabled={isAnalyzing || isPreparingFloorPlan}
              >
                Choose another file
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="drawing-error">{error}</div>}

      {extracted && (
        <div className="drawing-results">
          <header className="drawing-results-head">
            <div>
              <h4>Found {itemTotal} item{itemTotal === 1 ? "" : "s"}</h4>
              {extracted.summary && (
                <p className="led-sub">{extracted.summary}</p>
              )}
            </div>
            <div className="drawing-results-actions">
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => setSelection(selectAll(extracted))}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => setSelection(selectNone())}
              >
                Select none
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyAll}
                disabled={
                  !selection.applyVenue &&
                  selection.stageIndexes.size === 0 &&
                  selection.trussIndexes.size === 0 &&
                  selection.lightingIndexes.size === 0 &&
                  selection.ledIndexes.size === 0 &&
                  selection.soundIndexes.size === 0
                }
              >
                {applied ? "Applied — apply again" : "Apply to reports"}
              </button>
            </div>
          </header>

          {applied && (
            <div className="drawing-applied-banner">
              Items added to their report tabs. Open Rigging / Lighting / LED /
              Stage / Sound to review and edit.
            </div>
          )}

          {/* Venue */}
          {venueChanged && (
            <div className="drawing-group">
              <label className="drawing-group-head">
                <input
                  type="checkbox"
                  checked={selection.applyVenue}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, applyVenue: e.target.checked }))
                  }
                />
                <strong>Venue dimensions</strong>
                <span className="led-sub">→ Rigg Plan</span>
              </label>
              <div className="drawing-group-body">
                W {fmt(items.venue.widthM)} m · D {fmt(items.venue.depthM)} m ·
                Ceiling {fmt(items.venue.ceilingM)} m
              </div>
            </div>
          )}

          {/* Trusses → Rigging Report */}
          {items.trusses.length > 0 && (
            <CategoryGroup
              title="Trusses / rigging systems"
              destination="→ Rigging Report"
              count={items.trusses.length}
              selected={selection.trussIndexes}
              onToggle={(i) =>
                setSelection((s) => ({
                  ...s,
                  trussIndexes: toggleIndex(s.trussIndexes, i),
                }))
              }
              onSelectAll={() =>
                setSelection((s) => ({
                  ...s,
                  trussIndexes: new Set(items.trusses.map((_, i) => i)),
                }))
              }
            >
              {items.trusses.map((t, i) => (
                <div key={i}>
                  <strong>{t.name}</strong>
                  <span className="led-sub">
                    {fmt(t.lengthM)} m · {t.pointCount} pts
                    {t.hoistKg != null
                      ? ` · ${t.hoistKg >= 1000 ? "1 t" : `${t.hoistKg} kg`} motors`
                      : ""}
                    {t.trimM != null ? ` · trim ${fmt(t.trimM)} m` : ""}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </span>
                </div>
              ))}
            </CategoryGroup>
          )}

          {/* Lighting */}
          {items.lighting.length > 0 && (
            <CategoryGroup
              title="Lighting fixtures"
              destination="→ Lighting Report"
              count={items.lighting.length}
              selected={selection.lightingIndexes}
              onToggle={(i) =>
                setSelection((s) => ({
                  ...s,
                  lightingIndexes: toggleIndex(s.lightingIndexes, i),
                }))
              }
              onSelectAll={() =>
                setSelection((s) => ({
                  ...s,
                  lightingIndexes: new Set(items.lighting.map((_, i) => i)),
                }))
              }
            >
              {items.lighting.map((f, i) => (
                <div key={i}>
                  <strong>
                    {f.qty}× {f.name}
                  </strong>
                  <span className="led-sub">
                    {f.trussName ? `on ${f.trussName} · ` : ""}
                    {f.weightKg != null ? `${fmt(f.weightKg)} kg ea` : "weight ?"}
                    {f.watts != null ? ` · ${fmt(f.watts, 0)} W ea` : ""}
                    {f.notes ? ` · ${f.notes}` : ""}
                  </span>
                </div>
              ))}
            </CategoryGroup>
          )}

          {/* LED screens */}
          {items.ledScreens.length > 0 && (
            <CategoryGroup
              title="LED screens"
              destination="→ LED Screen Report"
              count={items.ledScreens.length}
              selected={selection.ledIndexes}
              onToggle={(i) =>
                setSelection((s) => ({
                  ...s,
                  ledIndexes: toggleIndex(s.ledIndexes, i),
                }))
              }
              onSelectAll={() =>
                setSelection((s) => ({
                  ...s,
                  ledIndexes: new Set(items.ledScreens.map((_, i) => i)),
                }))
              }
            >
              {items.ledScreens.map((s, i) => {
                // Prefer panel grid; fall back to metres if the drawing
                // only labelled the screen size in metres ("5 x 3 m").
                let size = "panel grid ?";
                if (s.panelsWide != null && s.panelsTall != null) {
                  size = `${s.panelsWide} × ${s.panelsTall} panels`;
                } else if (s.widthM != null && s.heightM != null) {
                  size = `${fmt(s.widthM)} × ${fmt(s.heightM)} m`;
                }
                return (
                  <div key={i}>
                    <strong>{s.name}</strong>
                    <span className="led-sub">
                      {size}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </span>
                  </div>
                );
              })}
            </CategoryGroup>
          )}

          {/* Stages */}
          {items.stages.length > 0 && (
            <CategoryGroup
              title="Stages / decking"
              destination="→ Stage Report"
              count={items.stages.length}
              selected={selection.stageIndexes}
              onToggle={(i) =>
                setSelection((s) => ({
                  ...s,
                  stageIndexes: toggleIndex(s.stageIndexes, i),
                }))
              }
              onSelectAll={() =>
                setSelection((s) => ({
                  ...s,
                  stageIndexes: new Set(items.stages.map((_, i) => i)),
                }))
              }
            >
              {items.stages.map((s, i) => (
                <div key={i}>
                  <strong>{s.name}</strong>
                  <span className="led-sub">
                    {fmt(s.widthM)} × {fmt(s.depthM)} m
                    {s.notes ? ` · ${s.notes}` : ""}
                  </span>
                </div>
              ))}
            </CategoryGroup>
          )}

          {/* Sound */}
          {items.sound.length > 0 && (
            <CategoryGroup
              title="Sound / PA"
              destination="→ Sound Report"
              count={items.sound.length}
              selected={selection.soundIndexes}
              onToggle={(i) =>
                setSelection((s) => ({
                  ...s,
                  soundIndexes: toggleIndex(s.soundIndexes, i),
                }))
              }
              onSelectAll={() =>
                setSelection((s) => ({
                  ...s,
                  soundIndexes: new Set(items.sound.map((_, i) => i)),
                }))
              }
            >
              {items.sound.map((s, i) => (
                <div key={i}>
                  <strong>
                    {s.qty}× {s.name}
                  </strong>
                  <span className="led-sub">
                    {s.weightKg != null ? `${fmt(s.weightKg)} kg ea` : ""}
                    {s.watts != null ? ` · ${fmt(s.watts, 0)} W ea` : ""}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </span>
                </div>
              ))}
            </CategoryGroup>
          )}

          {itemTotal === 0 && !venueChanged && (
            <div className="led-empty">
              The analyser could not extract any rigging items from this image.
              Try a clearer drawing or one that shows trusses, fixtures or stage
              decks more directly.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CategoryGroup({
  title,
  destination,
  count,
  selected,
  onToggle,
  onSelectAll,
  children,
}: {
  title: string;
  destination: string;
  count: number;
  selected: Set<number>;
  onToggle: (i: number) => void;
  onSelectAll: () => void;
  children: React.ReactNode;
}) {
  // Pull the <li> children out of the rendered tree so we can wrap each
  // with its own checkbox row tied to the parent's selection set.
  const childArray = Array.isArray(children) ? children : [children];
  return (
    <div className="drawing-group">
      <div className="drawing-group-head">
        <strong>{title}</strong>
        <span className="led-sub">{destination}</span>
        <span className="drawing-group-count">
          {selected.size}/{count}
        </span>
        <button
          type="button"
          className="btn btn-soft btn-xs"
          onClick={onSelectAll}
        >
          Select all
        </button>
      </div>
      <ul className="drawing-item-list">
        {childArray.map((child, i) => (
          <li key={i} className="drawing-item">
            <input
              type="checkbox"
              checked={selected.has(i)}
              onChange={() => onToggle(i)}
            />
            <div className="drawing-item-body">{child}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
