import React, { useState, useRef } from "react";
import { useT } from "../lib/i18n/I18nContext";
import { useAuth } from "@clerk/react";
import {
  ClipboardCheck,
  Sparkles,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Calendar,
  Wrench,
  MessageSquare,
} from "lucide-react";

export type ExtractedItem = {
  id: string;
  field: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

export type InspectionData = {
  notes: string;
  equipment: ExtractedItem[];
  schedule: ExtractedItem[];
  technical: ExtractedItem[];
  general: ExtractedItem[];
  extractedAt?: string;
};

export const EMPTY_INSPECTION: InspectionData = {
  notes: "",
  equipment: [],
  schedule: [],
  technical: [],
  general: [],
};

type CategoryKey = "equipment" | "schedule" | "technical" | "general";

const CATEGORIES: CategoryKey[] = ["equipment", "schedule", "technical", "general"];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const categoryIcon: Record<CategoryKey, React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>> = {
  equipment: Package,
  schedule: Calendar,
  technical: Wrench,
  general: MessageSquare,
};

interface Props {
  data: InspectionData;
  onChange: (data: InspectionData) => void;
}

export function InspectionView({ data, onChange }: Props) {
  const t = useT();
  const { getToken } = useAuth();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<CategoryKey, boolean>>({
    equipment: false,
    schedule: false,
    technical: false,
    general: false,
  });
  const [showOriginal, setShowOriginal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasExtracted = data.extractedAt != null;
  const totalItems =
    data.equipment.length + data.schedule.length + data.technical.length + data.general.length;

  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const handleExtract = async () => {
    if (!data.notes.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError(t("inspection.error"));
        return;
      }
      const res = await fetch("/api/inspection/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: data.notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || t("inspection.error"));
        return;
      }
      const d = json.data as {
        equipment: { field: string; value: string; confidence: "high" | "medium" | "low" }[];
        schedule: { field: string; value: string; confidence: "high" | "medium" | "low" }[];
        technical: { field: string; value: string; confidence: "high" | "medium" | "low" }[];
        general: { field: string; value: string; confidence: "high" | "medium" | "low" }[];
      };
      const current = latestDataRef.current;
      onChange({
        ...current,
        equipment: d.equipment.map((i) => ({ ...i, id: uid() })),
        schedule: d.schedule.map((i) => ({ ...i, id: uid() })),
        technical: d.technical.map((i) => ({ ...i, id: uid() })),
        general: d.general.map((i) => ({ ...i, id: uid() })),
        extractedAt: new Date().toISOString(),
      });
    } catch {
      setError(t("inspection.error"));
    } finally {
      setExtracting(false);
    }
  };

  const updateItem = (cat: CategoryKey, id: string, field: "field" | "value", val: string) => {
    onChange({
      ...data,
      [cat]: data[cat].map((item) => (item.id === id ? { ...item, [field]: val } : item)),
    });
  };

  const deleteItem = (cat: CategoryKey, id: string) => {
    onChange({
      ...data,
      [cat]: data[cat].filter((item) => item.id !== id),
    });
  };

  const addItem = (cat: CategoryKey) => {
    onChange({
      ...data,
      [cat]: [...data[cat], { id: uid(), field: "", value: "", confidence: "medium" as const }],
    });
  };

  const handleClear = () => {
    if (!confirm(t("inspection.clearConfirm"))) return;
    onChange({ ...EMPTY_INSPECTION });
  };

  const toggleCollapse = (cat: CategoryKey) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const confidenceDot = (c: "high" | "medium" | "low") => {
    const colors: Record<string, string> = {
      high: "#10b981",
      medium: "#f59e0b",
      low: "#ef4444",
    };
    return (
      <span
        title={t(`inspection.${c}` as "inspection.high" | "inspection.medium" | "inspection.low")}
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: colors[c],
          marginRight: 6,
          flexShrink: 0,
        }}
      />
    );
  };

  return (
    <div className="inspection-view" style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <ClipboardCheck size={24} style={{ color: "var(--primary)" }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
          {t("inspection.title")}
        </h1>
        {totalItems > 0 && (
          <span
            style={{
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(123,91,255,0.12)",
              color: "var(--primary)",
              fontWeight: 500,
            }}
          >
            {totalItems}
          </span>
        )}
      </div>

      <div
        className="inspection-split"
        style={{
          display: "grid",
          gridTemplateColumns: hasExtracted ? "1fr 1fr" : "1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT: Notes editor */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontWeight: 500, color: "var(--text-main)", fontSize: 14 }}>
                {t("inspection.notesLabel")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {hasExtracted && (
                <button
                  onClick={handleClear}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={12} />
                  {t("inspection.clear")}
                </button>
              )}
              <button
                onClick={handleExtract}
                disabled={extracting || !data.notes.trim()}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    extracting || !data.notes.trim()
                      ? "rgba(123,91,255,0.3)"
                      : "var(--primary)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: extracting || !data.notes.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: extracting || !data.notes.trim() ? "none" : "0 0 12px rgba(123,91,255,0.25)",
                }}
              >
                <Sparkles size={14} />
                {extracting
                  ? t("inspection.extracting")
                  : hasExtracted
                    ? t("inspection.reExtract")
                    : t("inspection.extract")}
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            placeholder={t("inspection.notesPlaceholder")}
            style={{
              width: "100%",
              minHeight: hasExtracted ? 300 : 420,
              padding: "16px 20px",
              background: "transparent",
              color: "var(--text-main)",
              border: "none",
              outline: "none",
              resize: "vertical",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13,
              lineHeight: 1.7,
              boxSizing: "border-box",
            }}
          />
          {error && (
            <div
              style={{
                padding: "10px 20px",
                background: "rgba(239,68,68,0.08)",
                color: "#f87171",
                fontSize: 13,
                borderTop: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: Structured data */}
        {hasExtracted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--text-main)", fontSize: 14 }}>
                {t("inspection.extracted")}
              </span>
              {data.extractedAt && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(data.extractedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {CATEGORIES.map((cat) => {
              const items = data[cat];
              const Icon = categoryIcon[cat];
              const isCollapsed = collapsed[cat];
              return (
                <div
                  key={cat}
                  style={{
                    background: "var(--card-bg)",
                    borderRadius: 12,
                    border: "1px solid var(--border-color)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => toggleCollapse(cat)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      borderBottom: isCollapsed ? "none" : "1px solid var(--border-color)",
                      cursor: "pointer",
                      color: "var(--text-main)",
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                    )}
                    <Icon size={15} style={{ color: "var(--primary)" }} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>
                      {t(`inspection.${cat}` as "inspection.equipment" | "inspection.schedule" | "inspection.technical" | "inspection.general")}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginLeft: "auto",
                        background: "rgba(255,255,255,0.05)",
                        padding: "1px 7px",
                        borderRadius: 8,
                      }}
                    >
                      {items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div style={{ padding: "8px 0" }}>
                      {items.length === 0 ? (
                        <div
                          style={{
                            padding: "12px 16px",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          {t("inspection.emptyCategory")}
                        </div>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "8px 1fr 1fr 28px",
                              gap: 8,
                              alignItems: "center",
                              padding: "6px 16px",
                              fontSize: 13,
                            }}
                          >
                            {confidenceDot(item.confidence)}
                            <input
                              value={item.field}
                              onChange={(e) => updateItem(cat, item.id, "field", e.target.value)}
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 6,
                                padding: "5px 8px",
                                color: "var(--text-main)",
                                fontSize: 12,
                                fontWeight: 500,
                                outline: "none",
                              }}
                            />
                            <input
                              value={item.value}
                              onChange={(e) => updateItem(cat, item.id, "value", e.target.value)}
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 6,
                                padding: "5px 8px",
                                color: "var(--text-main)",
                                fontSize: 12,
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() => deleteItem(cat, item.id)}
                              title={t("inspection.deleteRow")}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: 2,
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        onClick={() => addItem(cat)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 16px",
                          fontSize: 12,
                          color: "var(--primary)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          marginTop: 2,
                        }}
                      >
                        <Plus size={12} />
                        {t("inspection.addRow")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !extracting && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 40px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <Sparkles size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ maxWidth: 360 }}>{t("inspection.noData")}</p>
            </div>
          )
        )}
      </div>

      {hasExtracted && data.notes && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 0",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            {showOriginal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FileText size={13} />
            {t("inspection.originalNotes")}
          </button>
          {showOriginal && (
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {data.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
