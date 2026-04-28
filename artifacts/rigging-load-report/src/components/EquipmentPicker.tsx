import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadEquipmentLibrary,
  searchLibrary,
  tabsFor,
  tabLabel,
  type LibraryItem,
  type LibraryTab,
} from "../lib/equipmentLibrary";

type Props = {
  open: boolean;
  /** Restrict the picker to items that map to this tab. Pass `undefined`
   *  to show everything. */
  tab?: LibraryTab;
  /** Title shown in the modal header. */
  title?: string;
  onClose: () => void;
  onPick: (item: LibraryItem) => void;
};

const fmt = (n: number, d = 1) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: d })
    : "—";

export function EquipmentPicker({
  open,
  tab,
  title,
  onClose,
  onPick,
}: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Lazy-load the library the first time the picker opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    loadEquipmentLibrary().then((list) => {
      if (!cancelled) {
        setItems(list);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Focus the search input when the modal opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Reset filters every time the picker opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSubFilter("");
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredByTab = useMemo(() => {
    if (!tab) return items;
    return items.filter((it) => tabsFor(it).includes(tab));
  }, [items, tab]);

  const subOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of filteredByTab) {
      const k = `${it.category} / ${it.subCategory}`;
      if (it.subCategory) set.add(k);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [filteredByTab]);

  const filtered = useMemo(() => {
    let out = filteredByTab;
    if (subFilter) {
      out = out.filter(
        (it) => `${it.category} / ${it.subCategory}` === subFilter,
      );
    }
    return searchLibrary(out, query).slice(0, 200);
  }, [filteredByTab, subFilter, query]);

  if (!open) return null;

  const heading =
    title ??
    (tab
      ? `Add from EHS Library — ${tabLabel(tab)}`
      : "Add from EHS Library");

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div
        className="modal-content equip-picker"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="equip-picker-head">
          <h3>{heading}</h3>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="equip-picker-filters">
          <input
            ref={inputRef}
            className="led-input"
            type="search"
            placeholder="Search by name, brand, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search equipment library"
          />
          <select
            className="led-input"
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
            aria-label="Filter by sub-category"
          >
            <option value="">All sub-categories</option>
            {subOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="equip-picker-count">
            {loaded
              ? `${filtered.length.toLocaleString("en-US")} of ${filteredByTab.length.toLocaleString("en-US")}`
              : "Loading…"}
          </span>
        </div>

        <div className="equip-picker-list" role="listbox">
          {!loaded ? (
            <div className="equip-empty">Loading library…</div>
          ) : filtered.length === 0 ? (
            <div className="equip-empty">
              No matches. Try a shorter search or clear the filter.
            </div>
          ) : (
            <table className="equip-picker-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="led-num">Weight</th>
                  <th className="led-num">Watts</th>
                  <th className="led-num">Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="equip-name">{it.name}</div>
                      {it.notes && (
                        <div className="equip-notes">{it.notes}</div>
                      )}
                    </td>
                    <td>
                      <div>{it.category}</div>
                      <div className="equip-sub">{it.subCategory}</div>
                    </td>
                    <td className="led-num">
                      {it.weight ? `${fmt(it.weight, 1)} kg` : "—"}
                    </td>
                    <td className="led-num">
                      {it.watts ? `${fmt(it.watts, 0)} W` : "—"}
                    </td>
                    <td className="led-num">{fmt(it.stock, 0)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onPick(it)}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
