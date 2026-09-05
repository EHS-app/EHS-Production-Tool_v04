import { useEffect, useState } from "react";

export function useAdminAccess(
  getToken: () => Promise<string | null>,
): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setIsAdmin(response.ok);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return isAdmin;
}