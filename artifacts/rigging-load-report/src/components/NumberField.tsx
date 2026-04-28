import { useEffect, useRef, useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  /** The committed numeric value from app state. */
  value: number;
  /** Called once the user finishes editing (blur, Enter, or change-and-commit). */
  onCommit: (value: number) => void;
  /**
   * Optional transform applied at commit time (e.g. snap to 0.5, clamp to a range).
   * The result is what gets passed to onCommit.
   */
  transform?: (raw: number) => number;
  /**
   * What to commit when the field is left blank. Defaults to 0.
   * Pass `null` to keep the previous value (i.e. silently restore).
   */
  emptyValue?: number | null;
  /** How to render the numeric value as text. Defaults to a sensible string. */
  format?: (value: number) => string;
  /** Auto-select the field's text on focus so a single click lets the user retype. Default true. */
  selectOnFocus?: boolean;
};

const defaultFormat = (n: number): string => {
  if (!Number.isFinite(n)) return "";
  // Avoid scientific notation and trailing useless zeros for integers.
  if (Number.isInteger(n)) return String(n);
  // Trim trailing zeros for floats like 0.5, 1.25.
  return String(n);
};

/**
 * A drop-in replacement for `<input type="number">` that:
 *  - keeps a local string buffer while focused so the user can clear the field
 *    and type a new value without the controlled value snapping back,
 *  - commits the parsed (and optionally transformed) value on blur or Enter,
 *  - selects the existing text on focus so a quick click + type replaces it.
 */
export function NumberField({
  value,
  onCommit,
  transform,
  emptyValue = 0,
  format = defaultFormat,
  selectOnFocus = true,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const [text, setText] = useState<string>(() => format(value));
  const focusedRef = useRef(false);

  // When the upstream value changes (and we're not actively editing),
  // re-sync the displayed text. While focused we keep what the user typed.
  useEffect(() => {
    if (!focusedRef.current) {
      setText(format(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-") {
      if (emptyValue === null) {
        // Restore previous value silently.
        setText(format(value));
        return;
      }
      const next = transform ? transform(emptyValue) : emptyValue;
      if (next !== value) onCommit(next);
      setText(format(next));
      return;
    }
    // Allow comma as decimal separator for European keyboards.
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setText(format(value));
      return;
    }
    const next = transform ? transform(parsed) : parsed;
    if (next !== value) onCommit(next);
    setText(format(next));
  };

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        if (selectOnFocus) {
          // Defer so the browser's native focus selection doesn't fight us.
          requestAnimationFrame(() => {
            try {
              e.target.select();
            } catch {
              /* ignore */
            }
          });
        }
        onFocus?.(e);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => {
        focusedRef.current = false;
        commit(e.target.value);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        // Don't commit on Enter while an IME composition is in progress —
        // the keystroke is finalising a composed character, not submitting.
        if (
          e.key === "Enter" &&
          !(e.nativeEvent as { isComposing?: boolean }).isComposing
        ) {
          (e.target as HTMLInputElement).blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
