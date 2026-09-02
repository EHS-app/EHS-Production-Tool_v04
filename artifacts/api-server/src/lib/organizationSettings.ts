import {
  db,
  organizationSettingsTable,
  type OrganizationSettingsRow,
} from "@workspace/db";

export const ORGANIZATION_SETTINGS_ID = "singleton";
export const ORGANIZATION_SETTINGS_DEFAULTS = {
  id: ORGANIZATION_SETTINGS_ID,
  companyName: "EHS Lyd · Lys · Bilder",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  defaultCurrency: "NOK",
  logoUrl: "",
  defaultVatRateBasisPoints: 2_500,
  defaultPaymentTermsDays: 14,
  fallbackDayRateMinor: 0,
  fallbackHourlyRateMinor: 0,
  overtimeThresholdMinutes: 8 * 60,
  overtimeMultiplierBasisPoints: 15_000,
  departments: [
    "Rigging",
    "Lights",
    "LED",
    "Sound",
    "Stage",
    "Inspection",
    "Logistics",
  ],
  updatedByUserId: null,
} as const;

/** Seed-on-read makes deployments safe even when no administrator has opened
 * settings yet. The primary key makes concurrent first reads idempotent. */
export async function getOrganizationSettings(): Promise<OrganizationSettingsRow> {
  await db
    .insert(organizationSettingsTable)
    .values({
      ...ORGANIZATION_SETTINGS_DEFAULTS,
      departments: [...ORGANIZATION_SETTINGS_DEFAULTS.departments],
    })
    .onConflictDoNothing({ target: organizationSettingsTable.id });
  const [settings] = await db.select().from(organizationSettingsTable).limit(1);
  if (!settings) throw new Error("Failed to initialize organization settings.");
  return settings;
}

export function organizationDefaultsSnapshot(
  settings: OrganizationSettingsRow,
): Record<string, unknown> {
  return {
    companyName: settings.companyName,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
    defaultCurrency: settings.defaultCurrency,
    logoUrl: settings.logoUrl,
    defaultVatRateBasisPoints: settings.defaultVatRateBasisPoints,
    defaultPaymentTermsDays: settings.defaultPaymentTermsDays,
    fallbackDayRateMinor: settings.fallbackDayRateMinor,
    fallbackHourlyRateMinor: settings.fallbackHourlyRateMinor,
    overtimeThresholdMinutes: settings.overtimeThresholdMinutes,
    overtimeMultiplierBasisPoints: settings.overtimeMultiplierBasisPoints,
    departments: [...settings.departments],
  };
}