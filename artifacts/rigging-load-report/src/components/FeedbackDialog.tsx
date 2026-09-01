import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useSubmitFeedback } from "../hooks/use-feedback";
import { toast } from "sonner";
import { Bug, Lightbulb } from "lucide-react";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitFeedback = useSubmitFeedback();

  const [type, setType] = useState<"bug" | "feature_request">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      await submitFeedback.mutateAsync({
        type,
        title: title.trim(),
        description: description.trim(),
        pageUrl: window.location.href,
      });
      
      toast.success("Feedback submitted. Thank you!");

      onOpenChange(false);

      // Reset after close animation
      setTimeout(() => {
        setType("bug");
        setTitle("");
        setDescription("");
      }, 300);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: "var(--card-bg, #25252F)",
          border: "1px solid var(--border-color, #2a2a34)",
          color: "var(--text-main, #E5E5EC)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-main, #E5E5EC)" }}>Submit Feedback</DialogTitle>
          <DialogDescription style={{ color: "var(--text-muted, #9999A6)" }}>
            Report an issue or request a new feature.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${type === "bug" ? "#F88000" : "var(--border-color, #2a2a34)"}`,
                background: type === "bug" ? "rgba(248,128,0,0.1)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="feedbackType"
                value="bug"
                checked={type === "bug"}
                onChange={() => setType("bug")}
                style={{ accentColor: "#F88000" }}
              />
              <Bug size={16} aria-hidden />
              Bug Report
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${type === "feature_request" ? "#F88000" : "var(--border-color, #2a2a34)"}`,
                background:
                  type === "feature_request"
                    ? "rgba(248,128,0,0.1)"
                    : "transparent",
              }}
            >
              <input
                type="radio"
                name="feedbackType"
                value="feature_request"
                checked={type === "feature_request"}
                onChange={() => setType("feature_request")}
                style={{ accentColor: "#F88000" }}
              />
              <Lightbulb size={16} aria-hidden />
              Feature Request
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main, #E5E5EC)" }}>Title</label>
            <input
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                background: "var(--input-bg, #1C1C24)",
                color: "var(--text-main, #E5E5EC)",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main, #E5E5EC)" }}>Details</label>
            <textarea
              required
              rows={5}
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                background: "var(--input-bg, #1C1C24)",
                color: "var(--text-main, #E5E5EC)",
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitFeedback.isPending}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                background: "transparent",
                color: "var(--text-main, #E5E5EC)",
                fontSize: "14px",
                cursor: submitFeedback.isPending ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitFeedback.isPending || !title.trim() || !description.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#F88000",
                color: "#0b0b0b",
                fontWeight: 600,
                fontSize: "14px",
                cursor: submitFeedback.isPending || !title.trim() || !description.trim() ? "not-allowed" : "pointer",
                opacity: submitFeedback.isPending || !title.trim() || !description.trim() ? 0.7 : 1,
              }}
            >
              {submitFeedback.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
