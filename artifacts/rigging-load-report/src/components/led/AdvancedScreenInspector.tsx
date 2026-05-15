/** Advanced per-screen engineering inspector.
 *
 *  Surfaces the touring-grade fields added in Phase 1: brightness,
 *  refresh, bit depth, HDR, curve, rotation, voltage region, power
 *  factor / overhead, broadcast / camera-safe.
 *
 *  All fields are optional on `LedScreen`; this inspector writes
 *  through `onUpdate` to the parent state. Empty input = clear field
 *  (= fall back to settings default).
 */

import type {
  LedCurveType,
  LedScanRateProfile,
  LedScreen,
  LedTransparencyMode,
  LedVoltageRegion,
} from "../../lib/led";
import {
  LED_CURVE_TYPE_OPTIONS,
  LED_SCAN_RATE_OPTIONS,
  LED_TRANSPARENCY_OPTIONS,
  LED_VOLTAGE_REGION_OPTIONS,
} from "../../lib/led";
import type { PowerEstimate } from "../../lib/led/engine/power";

export function AdvancedScreenInspector({
  screen,
  power,
  onUpdate,
}: {
  screen: LedScreen;
  /** Pre-computed by the validation runner so this component stays
   *  free of engine imports at render time. */
  power: PowerEstimate | undefined;
  onUpdate: (patch: Partial<LedScreen>) => void;
}) {
  return (
    <div className="led-adv-inspector">
      {/* ── Display ─────────────────────────────────────────────── */}
      <section className="led-adv-section">
        <header className="led-adv-section-head">
          <span>Display</span>
        </header>
        <div className="led-adv-fields">
          <NumField
            label="Brightness (nits)"
            value={screen.brightnessNits}
            onCommit={(v) => onUpdate({ brightnessNits: v })}
            placeholder="5000"
            min={0}
            step={100}
          />
          <NumField
            label="Refresh (Hz)"
            value={screen.refreshRateHz}
            onCommit={(v) => onUpdate({ refreshRateHz: v })}
            placeholder="3840"
            min={0}
            step={10}
          />
          <label className="led-field">
            <span className="led-field-label">Bit depth</span>
            <select
              className="led-input"
              value={screen.bitDepth ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onUpdate({
                  bitDepth: v ? (Number(v) as 8 | 10 | 12) : undefined,
                });
              }}
            >
              <option value="">Default</option>
              <option value="8">8-bit</option>
              <option value="10">10-bit</option>
              <option value="12">12-bit</option>
            </select>
          </label>
          <BoolField
            label="HDR"
            value={!!screen.hdrEnabled}
            onChange={(v) => onUpdate({ hdrEnabled: v || undefined })}
          />
        </div>
      </section>

      {/* ── Physical ────────────────────────────────────────────── */}
      <section className="led-adv-section">
        <header className="led-adv-section-head">
          <span>Physical</span>
        </header>
        <div className="led-adv-fields">
          <SelectField
            label="Curve"
            value={screen.curveType ?? "flat"}
            options={LED_CURVE_TYPE_OPTIONS}
            onChange={(v) => onUpdate({ curveType: v })}
          />
          <NumField
            label="Curve angle (°/seam)"
            value={screen.curveAnglePerSeam}
            onCommit={(v) => onUpdate({ curveAnglePerSeam: v })}
            placeholder="0"
            min={-30}
            max={30}
            step={0.5}
            disabled={
              !screen.curveType || screen.curveType === "flat"
            }
          />
          <label className="led-field">
            <span className="led-field-label">Cabinet rotation</span>
            <select
              className="led-input"
              value={screen.cabinetRotation ?? 0}
              onChange={(e) =>
                onUpdate({
                  cabinetRotation: Number(e.target.value) as
                    | 0
                    | 90
                    | 180
                    | 270,
                })
              }
            >
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180° (upside down)</option>
              <option value={270}>270°</option>
            </select>
          </label>
          <SelectField
            label="Transparency"
            value={screen.transparencyMode ?? "opaque"}
            options={LED_TRANSPARENCY_OPTIONS}
            onChange={(v) => onUpdate({ transparencyMode: v })}
          />
        </div>
      </section>

      {/* ── Power ───────────────────────────────────────────────── */}
      <section className="led-adv-section">
        <header className="led-adv-section-head">
          <span>Power</span>
          {power && (
            <span className="led-adv-section-meter">
              {power.totalWatts.toFixed(0)} W · {power.amps.toFixed(1)} A @{" "}
              {power.voltage} V
            </span>
          )}
        </header>
        <div className="led-adv-fields">
          <SelectField
            label="Voltage region"
            value={screen.voltageRegion ?? "EU-230"}
            options={LED_VOLTAGE_REGION_OPTIONS}
            onChange={(v) => onUpdate({ voltageRegion: v })}
          />
          <NumField
            label="Cabs / power chain"
            value={screen.maxCabinetsPerPowerChain}
            onCommit={(v) => onUpdate({ maxCabinetsPerPowerChain: v })}
            placeholder="6"
            min={1}
            step={1}
          />
          <NumField
            label="PSU overhead (%)"
            value={screen.powerOverheadPct}
            onCommit={(v) => onUpdate({ powerOverheadPct: v })}
            placeholder="25"
            min={0}
            max={100}
            step={1}
          />
          <NumField
            label="Power factor"
            value={screen.powerFactor}
            onCommit={(v) => onUpdate({ powerFactor: v })}
            placeholder="0.95"
            min={0}
            max={1}
            step={0.01}
          />
        </div>
        {power && power.chainsRequired !== null && (
          <p className="led-adv-meter-row">
            {power.enabledCabinets} cabinets need{" "}
            <strong>{power.chainsRequired}</strong> power chain
            {power.chainsRequired === 1 ? "" : "s"} at{" "}
            {power.cabinetsPerChain}/chain.
          </p>
        )}
      </section>

      {/* ── Data / Signal ───────────────────────────────────────── */}
      <section className="led-adv-section">
        <header className="led-adv-section-head">
          <span>Data &amp; signal</span>
        </header>
        <div className="led-adv-fields">
          <NumField
            label="Cabs / data chain"
            value={screen.maxCabinetsPerDataChain}
            onCommit={(v) => onUpdate({ maxCabinetsPerDataChain: v })}
            placeholder="16"
            min={1}
            step={1}
          />
          <BoolField
            label="Backup signal (A/B)"
            value={!!screen.backupSignalEnabled}
            onChange={(v) => onUpdate({ backupSignalEnabled: v || undefined })}
          />
          <BoolField
            label="Loop-out daisy chain"
            value={!!screen.signalLoopEnabled}
            onChange={(v) => onUpdate({ signalLoopEnabled: v || undefined })}
          />
        </div>
      </section>

      {/* ── Broadcast ───────────────────────────────────────────── */}
      <section className="led-adv-section">
        <header className="led-adv-section-head">
          <span>Broadcast</span>
        </header>
        <div className="led-adv-fields">
          <BoolField
            label="Camera-safe mode"
            value={!!screen.cameraSafeMode}
            onChange={(v) => onUpdate({ cameraSafeMode: v || undefined })}
          />
          <SelectField
            label="Scan profile"
            value={screen.scanRateProfile ?? "live-60"}
            options={LED_SCAN_RATE_OPTIONS}
            onChange={(v) => onUpdate({ scanRateProfile: v })}
          />
          <BoolField
            label="Genlock"
            value={!!screen.genlockEnabled}
            onChange={(v) => onUpdate({ genlockEnabled: v || undefined })}
          />
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────────────────── tiny field helpers ─────

function NumField({
  label,
  value,
  onCommit,
  placeholder,
  min,
  max,
  step,
  disabled,
}: {
  label: string;
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="led-field">
      <span className="led-field-label">{label}</span>
      <input
        className="led-input"
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onCommit(undefined);
          const n = Number(raw);
          if (Number.isFinite(n)) onCommit(n);
        }}
      />
    </label>
  );
}

function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="led-field led-field-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="led-field-label">{label}</span>
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="led-field">
      <span className="led-field-label">{label}</span>
      <select
        className="led-input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
