/** Server-side defaults used while creating a project. Client supplied
 * organization snapshots are deliberately discarded: they are audit data and
 * must reflect the organization configuration at the time of creation. */
export function projectDataWithOrganizationDefaults(
  raw: unknown,
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  data.organizationDefaults = { ...snapshot };
  return data;
}

/** Values supplied in regular project data are retained, but only recognized
 * safe finance fields are used to seed the transactional finance row. */
export function projectFinanceSeed(rawData: Record<string, unknown>) {
  const raw =
    rawData.financeSettings &&
    typeof rawData.financeSettings === "object" &&
    !Array.isArray(rawData.financeSettings)
      ? (rawData.financeSettings as Record<string, unknown>)
      : {};
  const minor = (key: string) =>
    typeof raw[key] === "number" &&
    Number.isSafeInteger(raw[key]) &&
    (raw[key] as number) >= 0 &&
    (raw[key] as number) <= 2_147_483_647
      ? (raw[key] as number)
      : 0;
  return {
    contractRevenueMinor: minor("contractRevenueMinor"),
    easyjobRevenueMinor:
      raw.easyjobRevenueMinor === null ? null : minor("easyjobRevenueMinor"),
    laborBudgetMinor: minor("laborBudgetMinor"),
    hotelBudgetMinor: minor("hotelBudgetMinor"),
    cateringBudgetMinor: minor("cateringBudgetMinor"),
    transportBudgetMinor: minor("transportBudgetMinor"),
    subRentalsBudgetMinor: minor("subRentalsBudgetMinor"),
  };
}