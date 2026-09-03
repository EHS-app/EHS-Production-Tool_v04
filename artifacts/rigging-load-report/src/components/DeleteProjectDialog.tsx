import React, { useState } from "react";
import { useT } from "../lib/i18n/I18nContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface Props {
  projectId: string;
  projectName: string;
  projectStatus: 'active' | 'planning' | 'draft';
  getToken: () => Promise<string | null>;
  onSuccess: () => void | Promise<void>;
  trigger: React.ReactNode;
}

export function DeleteProjectDialog({
  projectId,
  projectName,
  projectStatus,
  getToken,
  onSuccess,
  trigger
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isActive = projectStatus === "active";
  const nameToMatch = projectName || t("shell.breadcrumb.untitled");

  const confirmationMatches =
    !isActive || confirmText.trim() === nameToMatch.trim();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!confirmationMatches) {
      setError("Please type the exact project name to confirm deletion.");
      return;
    }
    
    setLoading(true);
    setError("");
    let succeeded = false;
    
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const serverMessage =
          json && typeof json.error === "string" ? json.error : "";
        throw new Error(serverMessage || t("project.delete.error.generic"));
      }
      
      succeeded = true;
      toast.success(t("project.delete.success"));
      await onSuccess();
    } catch (err: any) {
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? t("project.delete.error.generic")
          : err?.message || t("project.delete.error.generic");
      setError(message);
      toast.error(message);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      if (succeeded) {
        setOpen(false);
        setConfirmText("");
        setError("");
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("project.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("project.delete.description", { name: nameToMatch })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {isActive && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("project.delete.confirmLabel")} <span className="font-bold">{nameToMatch}</span>
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError("");
              }}
              placeholder={nameToMatch}
            />
          </div>
        )}
        
        {error && (
          <div className="mt-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
        
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={loading} onClick={(e) => {
            e.stopPropagation();
            setConfirmText("");
            setError("");
          }}>
            {t("project.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? t("project.delete.deleting") : t("project.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
