import React from "react";
import { Hammer } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export function GlobalPlaceholderPage({ title, description }: Props) {
  return (
    <div style={{ padding: "40px 16px", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "60px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--primary-soft)",
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24
        }}>
          <Hammer size={32} />
        </div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 300, margin: "0 0 12px 0", color: "var(--text-main)" }}>
          {title}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", margin: "0 0 32px 0", maxWidth: 480, lineHeight: 1.5 }}>
          {description}
        </p>
        
        <div style={{
          background: "var(--light)",
          border: "1px dashed var(--border-color)",
          padding: "16px 24px",
          borderRadius: "8px",
          display: "inline-flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)" }}>
            System Status
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
            Scheduled for Phase 2 Rollout
          </span>
        </div>
      </div>
    </div>
  );
}
