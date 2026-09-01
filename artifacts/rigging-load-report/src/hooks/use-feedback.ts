import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export type FeedbackReport = {
  id: number;
  userId: string;
  userEmail: string | null;
  userRole: "employee" | "freelancer" | null;
  type: "bug" | "feature_request";
  title: string;
  description: string;
  pageUrl: string | null;
  userAgent: string | null;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
};

export function useSubmitFeedback() {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);
  
  const mutateAsync = async (data: { type: "bug" | "feature_request"; title: string; description: string; pageUrl: string }) => {
    setIsPending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      setIsPending(false);
    }
  };
  
  return { mutateAsync, isPending };
}

// Simple global emitter for invalidation
const listeners = new Set<() => void>();
function invalidateFeedback() {
  listeners.forEach((l) => l());
}

export function useFeedbackReports() {
  const { getToken } = useAuth();
  const [data, setData] = useState<FeedbackReport[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/admin/feedback`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json.reports || json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchReports();
    listeners.add(fetchReports);
    return () => { listeners.delete(fetchReports); };
  }, [fetchReports]);

  return { data, isLoading, error, refetch: fetchReports };
}

export function useUpdateFeedbackStatus() {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [variables, setVariables] = useState<{
    id: number;
    status: FeedbackReport["status"];
  } | null>(null);
  
  const mutate = async ({
    id,
    status,
  }: {
    id: number;
    status: FeedbackReport["status"];
  }) => {
    setIsPending(true);
    setVariables({ id, status });
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      invalidateFeedback();
      return await res.json();
    } finally {
      setIsPending(false);
      setVariables(null);
    }
  };
  
  return { mutate, isPending, variables };
}
