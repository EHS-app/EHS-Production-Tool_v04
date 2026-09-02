import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";

export type OrganizationSettings = {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  defaultCurrency: string;
  logoUrl: string;
  defaultVatRateBasisPoints: number;
  defaultPaymentTermsDays: number;
  fallbackDayRateMinor: number;
  fallbackHourlyRateMinor: number;
  overtimeThresholdMinutes: number;
  overtimeMultiplierBasisPoints: number;
  departments: string[];
};

export function useSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch settings");
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to fetch settings");
      setSettings(json.settings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [getToken]);

  const updateSettings = useCallback(
    async (updates: Partial<OrganizationSettings>) => {
      try {
        const editableUpdates = {
          companyName: updates.companyName,
          contactEmail: updates.contactEmail,
          contactPhone: updates.contactPhone,
          contactAddress: updates.contactAddress,
          defaultCurrency: updates.defaultCurrency,
          logoUrl: updates.logoUrl,
          defaultVatRateBasisPoints: updates.defaultVatRateBasisPoints,
          defaultPaymentTermsDays: updates.defaultPaymentTermsDays,
          fallbackDayRateMinor: updates.fallbackDayRateMinor,
          fallbackHourlyRateMinor: updates.fallbackHourlyRateMinor,
          overtimeThresholdMinutes: updates.overtimeThresholdMinutes,
          overtimeMultiplierBasisPoints: updates.overtimeMultiplierBasisPoints,
          departments: updates.departments,
        };
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editableUpdates),
        });
        if (res.status === 401 || res.status === 403) {
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          const text = await res.text();
          let msg = "Failed to update settings";
          try {
            const parsed = JSON.parse(text);
            msg = parsed.error || msg;
          } catch {
            // ignore
          }
          throw new Error(msg);
        }
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to update settings");
        setSettings(json.settings);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
    [getToken],
  );

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
}
