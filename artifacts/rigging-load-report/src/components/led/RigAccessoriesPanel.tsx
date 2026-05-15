/** Per-screen rigging accessory list — beams, fly bars, ground
 *  support items pulled from the "LED Screen" inventory category.
 *
 *  Items are referenced by inventory name (string FK). The weight
 *  total displayed here is informational; the rigging report still
 *  computes the project-level total from its own inventory pass.
 *  Persistence: `LedScreen.rigAccessories`.
 */

import { useMemo, useState } from "react";
import type { LedRigAccessory, LedScreen } from "../../lib/led";
import { newRigAccessoryId } from "../../lib/led";

export type LedRigAccessoryCatalogItem = {
  name: string;
  weight: number;
};

export function RigAccessoriesPanel({
  screen,
  catalog,
  onChange,
}: {
  screen: LedScreen;
  /** Inventory items (name + weight) — the parent passes the "LED
   *  Screen" rows that have no pixel metadata (i.e. the beams). */
  catalog: LedRigAccessoryCatalogItem[];
  onChange: (next: LedRigAccessory[]) => void;
}) {
  const items = screen.rigAccessories ?? [];
  const [picker, setPicker] = useState<string>(catalog[0]?.name ?? "");
  const [qty, setQty] = useState<number>(1);

  const totalWeight = useMemo(() => {
    let w = 0;
    for (const a of items) {
      const cat = catalog.find((c) => c.name === a.inventoryName);
      if (cat) w += cat.weight * a.qty;
    }
    return w;
  }, [items, catalog]);

  function add() {
    if (!picker || qty <= 0) return;
    const next: LedRigAccessory[] = [
      ...items,
      {
        id: newRigAccessoryId(),
        inventoryName: picker,
        qty: Math.max(1, Math.round(qty)),
      },
    ];
    onChange(next);
    setQty(1);
  }

  function update(id: string, patch: Partial<LedRigAccessory>) {
    onChange(items.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function remove(id: string) {
    onChange(items.filter((a) => a.id !== id));
  }

  if (catalog.length === 0) {
    return (
      <div className="led-rig-accessories led-rig-accessories-empty">
        No beams found in the LED Screen inventory category.
      </div>
    );
  }

  return (
    <div className="led-rig-accessories">
      <div className="led-rig-accessories-head">
        <strong>Rigging accessories</strong>
        <span className="led-rig-accessories-total">
          {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
          {totalWeight.toFixed(1)} kg
        </span>
      </div>

      {items.length > 0 && (
        <ul className="led-rig-accessories-list">
          {items.map((a) => {
            const cat = catalog.find((c) => c.name === a.inventoryName);
            const w = cat ? cat.weight * a.qty : 0;
            return (
              <li key={a.id} className="led-rig-accessories-row">
                <select
                  className="led-input"
                  value={a.inventoryName}
                  onChange={(e) =>
                    update(a.id, { inventoryName: e.target.value })
                  }
                >
                  {catalog.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label className="led-rig-accessories-qty">
                  <span>×</span>
                  <input
                    className="led-input"
                    type="number"
                    min={1}
                    step={1}
                    value={a.qty}
                    onChange={(e) =>
                      update(a.id, {
                        qty: Math.max(1, Math.round(Number(e.target.value) || 1)),
                      })
                    }
                  />
                </label>
                <span className="led-rig-accessories-weight">
                  {w.toFixed(1)} kg
                </span>
                <input
                  className="led-input led-rig-accessories-note"
                  type="text"
                  placeholder="Note (optional)"
                  value={a.note ?? ""}
                  onChange={(e) =>
                    update(a.id, { note: e.target.value || undefined })
                  }
                />
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => remove(a.id)}
                  title="Remove this accessory"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="led-rig-accessories-add">
        <select
          className="led-input"
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
        >
          {catalog.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.weight} kg)
            </option>
          ))}
        </select>
        <input
          className="led-input"
          type="number"
          min={1}
          step={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))}
          style={{ width: 70 }}
        />
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={add}
          title="Add accessory to this screen"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
