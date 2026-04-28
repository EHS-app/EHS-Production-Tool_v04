import { useMemo } from "react";
import {
  SOUND_CATEGORIES,
  computeSoundTotals,
  itemPower,
  itemWeight,
  type SoundCategory,
  type SoundItem,
} from "../lib/sound";

type Props = {
  items: SoundItem[];
  onAdd: () => void;
  onAddFromLibrary?: () => void;
  onUpdate: (id: string, patch: Partial<SoundItem>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
};

const fmtNum = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

const fmtInt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function SoundReportView({
  items,
  onAdd,
  onAddFromLibrary,
  onUpdate,
  onRemove,
  onDuplicate,
}: Props) {
  const totals = useMemo(() => computeSoundTotals(items), [items]);

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>Sound Report</h2>
          <p className="led-report-sub">
            Audio inventory for the show — PA, monitors, console, microphones
            and accessories. Quantity, weight and power roll up into the
            dashboard.
          </p>
        </div>
        <div className="led-report-meta">
          <span className="badge">
            <strong>{totals.rowCount}</strong> rows
          </span>
          <span className="badge">
            <strong>{fmtInt(totals.totalQty)}</strong> pieces
          </span>
          <span className="badge">
            <strong>{fmtNum(totals.totalWeight, 1)}</strong> kg
          </span>
          <span className="badge">
            <strong>{fmtInt(totals.totalPower)}</strong> W
          </span>
        </div>
      </header>

      {/* Per-category breakdown dashboard */}
      <div className="led-dashboard">
        {SOUND_CATEGORIES.map((cat) => (
          <div className="led-stat" key={cat}>
            <div className="led-stat-label">{cat}</div>
            <div className="led-stat-value">
              {totals.countsByCategory[cat]}
            </div>
            <div className="led-stat-sub">
              {totals.weightsByCategory[cat] > 0
                ? `${fmtNum(totals.weightsByCategory[cat], 1)} kg`
                : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Inventory list */}
      <section className="led-card">
        <div className="led-card-head">
          <h3>Inventory</h3>
          <div className="led-controls">
            {onAddFromLibrary && (
              <button className="btn btn-soft" onClick={onAddFromLibrary}>
                + From EHS Library
              </button>
            )}
            <button className="btn btn-primary" onClick={onAdd}>
              + Add item
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="led-empty">
            No sound gear yet — add the first item to start your inventory.
          </div>
        ) : (
          <div className="led-table-wrap">
            <table className="led-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th className="led-num">Qty</th>
                  <th className="led-num">Weight/unit (kg)</th>
                  <th className="led-num">Power/unit (W)</th>
                  <th className="led-num">Subtotal weight</th>
                  <th className="led-num">Subtotal power</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <SoundRow
                    key={it.id}
                    item={it}
                    onUpdate={(patch) => onUpdate(it.id, patch)}
                    onRemove={() => onRemove(it.id)}
                    onDuplicate={() => onDuplicate(it.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SoundRow({
  item,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  item: SoundItem;
  onUpdate: (patch: Partial<SoundItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const w = itemWeight(item);
  const p = itemPower(item);

  return (
    <tr>
      <td>
        <input
          className="led-input"
          type="text"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. L'Acoustics K2"
        />
      </td>
      <td>
        <select
          className="led-input"
          value={item.category}
          onChange={(e) =>
            onUpdate({ category: e.target.value as SoundCategory })
          }
        >
          {SOUND_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="led-input led-input-num"
          type="number"
          min={1}
          step={1}
          value={item.qty}
          onChange={(e) =>
            onUpdate({
              qty: Math.max(1, Math.round(Number(e.target.value) || 1)),
            })
          }
        />
      </td>
      <td>
        <input
          className="led-input led-input-num"
          type="number"
          min={0}
          step={0.5}
          value={item.weightPerUnit}
          onChange={(e) =>
            onUpdate({
              weightPerUnit: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </td>
      <td>
        <input
          className="led-input led-input-num"
          type="number"
          min={0}
          step={50}
          value={item.powerPerUnit}
          onChange={(e) =>
            onUpdate({
              powerPerUnit: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </td>
      <td className="led-num">{fmtNum(w, 1)}</td>
      <td className="led-num">{fmtInt(p)}</td>
      <td>
        <input
          className="led-input"
          type="text"
          value={item.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="e.g. Front fill, spare"
        />
      </td>
      <td className="led-actions">
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={onDuplicate}
          title="Duplicate"
        >
          Copy
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onRemove}
          title="Remove"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
