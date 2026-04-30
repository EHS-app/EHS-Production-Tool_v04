import { useEffect, useMemo, useRef, useState } from "react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import { type PortalData, type Profile as ProfileType } from "../lib/portalStorage";
import { searchSkills } from "../lib/skillLibrary";

const LANGUAGE_PRESETS = [
  "Norwegian",
  "English",
  "Swedish",
  "Danish",
  "German",
  "French",
  "Spanish",
];

export function Profile({
  theme,
  data,
  setData,
}: {
  theme: ThemeMode;
  data: PortalData;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
}) {
  const c = PALETTE[theme];
  const [draft, setDraft] = useState<ProfileType>(data.profile);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(data.profile),
    [draft, data.profile],
  );

  // Re-sync the draft from upstream whenever the underlying profile changes
  // (e.g. Clerk auto-fill arrives after mount, or the user switches accounts).
  // Only adopt the upstream change when the draft still matches the previous
  // upstream snapshot — i.e. the user is not mid-edit — so we never clobber
  // unsaved input.
  const lastSyncedRef = useRef(data.profile);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    if (data.profile === lastSyncedRef.current) return;
    const draftMatchesPrev =
      JSON.stringify(draftRef.current) === JSON.stringify(lastSyncedRef.current);
    lastSyncedRef.current = data.profile;
    if (draftMatchesPrev) {
      setDraft(data.profile);
    }
  }, [data.profile]);

  function patch<K extends keyof ProfileType>(key: K, value: ProfileType[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    setData((prev) => ({ ...prev, profile: draft }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, flex: 1 }}>
          Profile
        </h1>
        {savedFlash ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: c.success,
              padding: "6px 10px",
              borderRadius: 8,
              background: c.cardBgSubtle,
              border: `1px solid ${c.border}`,
            }}
          >
            ✓ Saved
          </span>
        ) : null}
      </header>

      <Section theme={theme} title="Personal">
        <Grid2>
          <Field theme={theme} label="Full name">
            <input
              type="text"
              value={draft.fullName}
              onChange={(e) => patch("fullName", e.target.value)}
              style={inputStyle(theme)}
              placeholder="Edvin Hoff Hasle"
            />
          </Field>
          <Field theme={theme} label="Phone">
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => patch("phone", e.target.value)}
              style={inputStyle(theme)}
              placeholder="+47 940 84 026"
            />
          </Field>
          <Field theme={theme} label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => patch("email", e.target.value)}
              style={inputStyle(theme)}
              placeholder="navn@firma.no"
            />
          </Field>
          <Field theme={theme} label="Primary role">
            <input
              type="text"
              value={draft.primaryRole}
              onChange={(e) => patch("primaryRole", e.target.value)}
              style={inputStyle(theme)}
              placeholder="Lystekniker"
            />
          </Field>
        </Grid2>
      </Section>

      <Section theme={theme} title="Catering">
        <p style={{ margin: 0, marginBottom: 10, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
          Producers see this on the kitchen Order List. Keep dietary needs and allergens separate — allergens flag cross-contamination warnings, dietary needs drive meal counts.
        </p>
        <Grid2>
          <Field theme={theme} label="Dietary requirements">
            <input
              type="text"
              value={draft.dietary}
              onChange={(e) => patch("dietary", e.target.value)}
              style={inputStyle(theme)}
              placeholder="None / Vegetarian / Vegan / Halal / Kosher"
            />
          </Field>
          <Field theme={theme} label="Allergies">
            <input
              type="text"
              value={draft.allergies}
              onChange={(e) => patch("allergies", e.target.value)}
              style={inputStyle(theme)}
              placeholder="Peanuts, shellfish, gluten…"
            />
          </Field>
        </Grid2>
      </Section>

      <Section theme={theme} title="Travel & accommodation">
        <p
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 13,
            color: c.muted,
            lineHeight: 1.5,
          }}
        >
          Used only by the producer's hotel suggester when a project
          needs accommodation. Twin = OK to share a twin room with
          another crew member; Single = needs a private room. Gender is
          optional and only used to default to same-gender twin pairings
          (most crew prefer it, hotels expect it). Producers always have
          the final say.
        </p>
        <Grid2>
          <Field theme={theme} label="Room sharing">
            <SegmentedControl
              theme={theme}
              value={draft.roomShare}
              onChange={(v) => patch("roomShare", v)}
              options={[
                { value: "twin", label: "Twin (will share)" },
                { value: "single", label: "Single (private)" },
                { value: "either", label: "Either" },
              ]}
            />
          </Field>
          <Field theme={theme} label="Gender (optional)">
            <SegmentedControl
              theme={theme}
              value={draft.gender}
              onChange={(v) => patch("gender", v)}
              options={[
                { value: "", label: "Prefer not to say" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
        </Grid2>
      </Section>

      <Section theme={theme} title="Skills & equipment">
        <p style={{ margin: 0, marginBottom: 10, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
          Add the disciplines, consoles and certifications you can cover. Type to search the library or just hit Enter to add anything.
        </p>
        <TagEditor
          theme={theme}
          tags={draft.skills}
          onChange={(tags) => patch("skills", tags)}
        />
      </Section>

      <Section theme={theme} title="Languages">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LANGUAGE_PRESETS.map((l) => {
            const active = draft.languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  patch(
                    "languages",
                    active
                      ? draft.languages.filter((x) => x !== l)
                      : [...draft.languages, l],
                  );
                }}
                style={{
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 999,
                  cursor: "pointer",
                  background: active ? c.accent : "transparent",
                  color: active ? "#0b0b0b" : c.text,
                  border: `1px solid ${active ? c.accent : c.border}`,
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Section>

      <Section theme={theme} title="Insurance">
        <Field theme={theme} label="Insurance number / company">
          <textarea
            value={draft.insurance}
            onChange={(e) => patch("insurance", e.target.value)}
            rows={2}
            style={{
              ...inputStyle(theme),
              resize: "vertical",
              fontFamily: "inherit",
            }}
            placeholder="Gjensidige · 12345678"
          />
        </Field>
      </Section>

      <Section theme={theme} title="Invoicing details">
        <Grid2>
          <Field theme={theme} label="Bank account / IBAN">
            <input
              type="text"
              value={draft.bankAccount}
              onChange={(e) => patch("bankAccount", e.target.value)}
              style={inputStyle(theme)}
              placeholder="1234.56.78901"
            />
          </Field>
          <Field theme={theme} label="Org. number">
            <input
              type="text"
              value={draft.orgNumber}
              onChange={(e) => patch("orgNumber", e.target.value)}
              style={inputStyle(theme)}
              placeholder="999 999 999"
            />
          </Field>
        </Grid2>
      </Section>

      <div
        style={{
          position: "sticky",
          bottom: 80,
          display: "flex",
          justifyContent: "flex-end",
          paddingTop: 4,
          gap: 10,
        }}
      >
        {dirty ? (
          <button
            type="button"
            onClick={() => setDraft(data.profile)}
            style={{
              padding: "11px 16px",
              fontSize: 14,
              fontWeight: 700,
              background: "transparent",
              color: c.muted,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Discard
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          style={{
            padding: "11px 22px",
            fontSize: 14,
            fontWeight: 700,
            background: dirty ? c.accent : c.border,
            color: "#0b0b0b",
            border: "none",
            borderRadius: 10,
            cursor: dirty ? "pointer" : "not-allowed",
            opacity: dirty ? 1 : 0.7,
            boxShadow: dirty ? c.shadowSoft : "none",
          }}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function TagEditor({
  theme,
  tags,
  onChange,
}: {
  theme: ThemeMode;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const c = PALETTE[theme];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(
    () => searchSkills(query, tags),
    [query, tags],
  );

  function add(tag: string) {
    const t = tag.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...tags, t]);
    setQuery("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {tags.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 6px 5px 12px",
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(248,128,0,0.18)",
                color: c.accent,
                borderRadius: 999,
              }}
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                aria-label={`Remove ${t}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: c.accent,
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions.length > 0) {
                add(suggestions[0].label);
              } else if (query.trim()) {
                add(query);
              }
            } else if (e.key === "Backspace" && !query && tags.length > 0) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder="Type to search or add a custom tag…"
          style={inputStyle(theme)}
        />
        {open && suggestions.length > 0 ? (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              boxShadow: c.shadow,
              zIndex: 5,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s.label);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: 10,
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: c.text,
                  textAlign: "left",
                  fontSize: 13,
                  borderBottom: `1px solid ${c.border}`,
                  fontFamily: "inherit",
                }}
              >
                <span style={{ flex: 1, fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: "uppercase" }}>
                  {s.group}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  theme,
  title,
  children,
}: {
  theme: ThemeMode;
  title: string;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: c.shadowSoft,
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: c.muted,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SegmentedControl<T extends string>({
  theme,
  value,
  onChange,
  options,
}: {
  theme: ThemeMode;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  // Pill-group used for short, exclusive choices (room sharing,
  // gender). Mirrors the existing Languages preset pattern stylistically
  // so the profile editor stays visually consistent.
  const c = PALETTE[theme];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || "_unset"}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 999,
              cursor: "pointer",
              background: active ? c.accent : "transparent",
              color: active ? "#0b0b0b" : c.text,
              border: `1px solid ${active ? c.accent : c.border}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Field({
  theme,
  label,
  children,
}: {
  theme: ThemeMode;
  label: string;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: c.muted,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    background: c.inputBg,
    color: c.text,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: 8,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
}
