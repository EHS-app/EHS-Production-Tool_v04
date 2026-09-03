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
  onSuccess: () => void;
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

  const isDeleteDisabled = isActive ? confirmText !== nameToMatch : false;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleteDisabled || loading) return;
    
    setLoading(true);
    setError("");
    
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
        if (res.status === 409) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || t("project.delete.error.conflict"));
        }
        throw new Error(t("project.delete.error.generic"));
      }
      
      toast.success(t("project.delete.success"));
      onSuccess();
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
      setOpen(false);
      setConfirmText("");
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
              onChange={(e) => setConfirmText(e.target.value)}
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
            disabled={isDeleteDisabled || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? t("project.delete.deleting") : t("project.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
