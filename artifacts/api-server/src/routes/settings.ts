import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, organizationSettingsTable } from "@workspace/db";
import { requireAdmin } from "./admin";
import {
  getOrganizationSettings,
  ORGANIZATION_SETTINGS_DEFAULTS,
  ORGANIZATION_SETTINGS_ID,
} from "../lib/organizationSettings";

const router: IRouter = Router();
const TEXT_LIMITS = {
  companyName: 300,
  contactEmail: 320,
  contactPhone: 100,
  contactAddress: 2_000,
  defaultCurrency: 3,
  logoUrl: 2_000,
} as const;
const NUMBER_LIMITS = {
  defaultVatRateBasisPoints: 100_000,
  defaultPaymentTermsDays: 3650,
  fallbackDayRateMinor: 2_147_483_647,
  fallbackHourlyRateMinor: 2_147_483_647,
  overtimeThresholdMinutes: 1_440,
  overtimeMultiplierBasisPoints: 100_000,
} as const;
const ALLOWED = new Set([
  ...Object.keys(TEXT_LIMITS),
  ...Object.keys(NUMBER_LIMITS),
  "departments",
]);

router.get("/settings", requireAdmin, async (req, res) => {
  try {
    res.json({ ok: true, settings: await getOrganizationSettings() });
  } catch (error) {
    req.log.error({ error }, "Failed to load organization settings");
    res.status(500).json({ ok: false, error: "Failed to load settings." });
  }
});

router.put("/settings", requireAdmin, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !ALLOWED.has(key))) {
    res.status(400).json({ ok: false, error: "Invalid or unknown settings fields." });
    return;
  }
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (
      key in body &&
      (typeof body[key] !== "string" ||
        (body[key] as string).trim().length > max ||
        (key === "companyName" && !(body[key] as string).trim()) ||
        (key === "defaultCurrency" &&
          !/^[A-Za-z]{3}$/.test((body[key] as string).trim())))
    ) {
      res.status(400).json({ ok: false, error: `Invalid ${key}.` });
      return;
    }
  }
  for (const [key, max] of Object.entries(NUMBER_LIMITS)) {
    const value = body[key];
    if (
      key in body &&
      (typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > max)
    ) {
      res.status(400).json({ ok: false, error: `Invalid ${key}.` });
      return;
    }
  }
  if (
    "departments" in body &&
    (!Array.isArray(body.departments) ||
      body.departments.length > 100 ||
      body.departments.some(
        (value) =>
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > 100,
      ))
  ) {
    res.status(400).json({ ok: false, error: "Invalid departments." });
    return;
  }

  try {
    const current = await getOrganizationSettings();
    const value = (key: keyof typeof ORGANIZATION_SETTINGS_DEFAULTS) =>
      key in body ? body[key] : current[key as keyof typeof current];
    const auth =
      typeof (req as unknown as { auth?: unknown }).auth === "function"
        ? (req as unknown as { auth: () => { userId?: string } }).auth()
        : (req as unknown as { auth?: { userId?: string } }).auth;
    const userId = auth?.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "Sign in required." });
      return;
    }
    const [settings] = await db
      .update(organizationSettingsTable)
      .set({
        companyName: String(value("companyName")).trim(),
        contactEmail: String(value("contactEmail")).trim(),
        contactPhone: String(value("contactPhone")).trim(),
        contactAddress: String(value("contactAddress")).trim(),
        defaultCurrency: String(value("defaultCurrency")).trim().toUpperCase(),
        logoUrl: String(value("logoUrl")).trim(),
        defaultVatRateBasisPoints: Number(value("defaultVatRateBasisPoints")),
        defaultPaymentTermsDays: Number(value("defaultPaymentTermsDays")),
        fallbackDayRateMinor: Number(value("fallbackDayRateMinor")),
        fallbackHourlyRateMinor: Number(value("fallbackHourlyRateMinor")),
        overtimeThresholdMinutes: Number(value("overtimeThresholdMinutes")),
        overtimeMultiplierBasisPoints: Number(
          value("overtimeMultiplierBasisPoints"),
        ),
        departments:
          "departments" in body
            ? [...new Set((body.departments as string[]).map((item) => item.trim()))]
            : current.departments,
        updatedByUserId: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(organizationSettingsTable.id, ORGANIZATION_SETTINGS_ID))
      .returning();
    res.json({ ok: true, settings });
  } catch (error) {
    req.log.error({ error }, "Failed to update organization settings");
    res.status(500).json({ ok: false, error: "Failed to update settings." });
  }
});

export default router;