import { Router, type IRouter } from "express";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import {
  db,
  freelancerProfilesTable,
  gigsTable,
  MANUAL_EXPENSE_CATEGORIES,
  projectExpensesTable,
  projectFinanceSettingsTable,
  projectMembersTable,
  projectsTable,
  timeEntriesTable,
  type FinanceCategory,
} from "@workspace/db";
import { requireEmployee } from "../middleware/userType";
import { getOrganizationSettings } from "../lib/organizationSettings";
import {
  getProjectAccess,
  isProjectWriter,
  UUID_PATTERN,
} from "../lib/projectAccess";

const router: IRouter = Router();
const MAX_MINOR_UNITS = 2_147_483_647;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SETTING_KEYS = [
  "contractRevenueMinor",
  "easyjobRevenueMinor",
  "laborBudgetMinor",
  "hotelBudgetMinor",
  "cateringBudgetMinor",
  "transportBudgetMinor",
  "subRentalsBudgetMinor",
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];
type Settings = Record<SettingKey, number | null>;

function userId(req: unknown): string {
  return (req as { _userId: string })._userId;
}

function isMinorUnits(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_MINOR_UNITS
  );
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Convert a PostgreSQL numeric NOK-major-unit string to integer øre without
 * passing it through binary floating point. Gigs are producer-controlled and
 * therefore the trusted compensation source. */
function majorNokToMinor(raw: string): number {
  const match = raw.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error("Invalid trusted gig compensation value.");
  const whole = Number(match[1]);
  const fractional = `${match[2] ?? ""}00`.slice(0, 2);
  const amount = whole * 100 + Number(fractional);
  if (!Number.isSafeInteger(amount) || amount > MAX_MINOR_UNITS) {
    throw new Error("Trusted gig compensation is outside supported range.");
  }
  return amount;
}

function csvCell(value: string | number | null): string {
  const initial = value == null ? "" : String(value);
  // Excel/Sheets discard leading whitespace before evaluating a formula.
  // Treat ASCII controls and all JavaScript whitespace as leading whitespace
  // too, so a tab/newline-prefixed formula cannot bypass neutralization.
  const raw = /^[\s\u0000-\u001f]*[=+\-@]/.test(initial)
    ? `'${initial}`
    : initial;
  return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

async function loadEconomy(callerUserId: string) {
  const organization = await getOrganizationSettings();
  const projects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      client: projectsTable.client,
      easyjobNumber: projectsTable.easyjobNumber,
      activeBriefId: sql<string>`${projectsTable.data}->>'activeBriefId'`,
      accessRole: sql<"owner" | "editor" | "viewer">`case when ${projectsTable.userId} = ${callerUserId} then 'owner' else ${projectMembersTable.role} end`,
      contractRevenueMinor: projectFinanceSettingsTable.contractRevenueMinor,
      easyjobRevenueMinor: projectFinanceSettingsTable.easyjobRevenueMinor,
      laborBudgetMinor: projectFinanceSettingsTable.laborBudgetMinor,
      hotelBudgetMinor: projectFinanceSettingsTable.hotelBudgetMinor,
      cateringBudgetMinor: projectFinanceSettingsTable.cateringBudgetMinor,
      transportBudgetMinor: projectFinanceSettingsTable.transportBudgetMinor,
      subRentalsBudgetMinor: projectFinanceSettingsTable.subRentalsBudgetMinor,
    })
    .from(projectsTable)
    .leftJoin(
      projectMembersTable,
      and(
        eq(projectMembersTable.projectId, projectsTable.id),
        eq(projectMembersTable.userId, callerUserId),
      ),
    )
    .leftJoin(
      projectFinanceSettingsTable,
      eq(projectFinanceSettingsTable.projectId, projectsTable.id),
    )
    .where(
      and(
        isNotNull(sql`nullif(${projectsTable.data}->>'activeBriefId', '')`),
        or(
          eq(projectsTable.userId, callerUserId),
          eq(projectMembersTable.userId, callerUserId),
        ),
      ),
    );

  const projectIds = projects.map((project) => project.id);
  const activeBriefIds = projects.map((project) => project.activeBriefId);
  const [expenses, laborRows] = await Promise.all([
    db
      .select({
        id: projectExpensesTable.id,
        projectId: projectExpensesTable.projectId,
        category: projectExpensesTable.category,
        amountMinor: projectExpensesTable.amountMinor,
        incurredOn: projectExpensesTable.incurredOn,
        description: projectExpensesTable.description,
        vendor: projectExpensesTable.vendor,
        reference: projectExpensesTable.reference,
        createdAt: projectExpensesTable.createdAt,
      })
      .from(projectExpensesTable)
      .where(inArray(projectExpensesTable.projectId, projectIds)),
    db
      .select({
        briefId: timeEntriesTable.briefId,
        gigId: gigsTable.id,
        startMinute: timeEntriesTable.startMinute,
        endMinute: timeEntriesTable.endMinute,
        breakMinutes: timeEntriesTable.breakMinutes,
        producerBreakMinutes: timeEntriesTable.producerBreakMinutes,
        producerAdjustmentMinutes: timeEntriesTable.producerAdjustmentMinutes,
        overtimeMinutes: timeEntriesTable.overtimeMinutes,
        approvedRateMinor: timeEntriesTable.approvedRateMinor,
        approvedFlatFeeMinor: timeEntriesTable.approvedFlatFeeMinor,
        approvedOvertimeMultiplierBasisPoints:
          timeEntriesTable.approvedOvertimeMultiplierBasisPoints,
        rate: gigsTable.rate,
        flatFee: gigsTable.flatFee,
        profileDayRate: freelancerProfilesTable.defaultDayRate,
      })
      .from(timeEntriesTable)
      .innerJoin(gigsTable, eq(timeEntriesTable.gigId, gigsTable.id))
      .leftJoin(
        freelancerProfilesTable,
        eq(timeEntriesTable.freelancerUserId, freelancerProfilesTable.userId),
      )
      .where(
        and(
          inArray(timeEntriesTable.briefId, activeBriefIds),
          inArray(timeEntriesTable.status, ["approved", "locked"]),
        ),
      ),
  ]);

  const projectByBrief = new Map(
    projects.map((project) => [project.activeBriefId, project.id]),
  );
  const actualByProject = new Map<string, Record<FinanceCategory, number>>();
  for (const project of projects) {
    actualByProject.set(project.id, {
      labor: 0,
      hotel: 0,
      catering: 0,
      transport: 0,
      subRentals: 0,
    });
  }
  for (const expense of expenses) {
    if (
      !MANUAL_EXPENSE_CATEGORIES.includes(
        expense.category as (typeof MANUAL_EXPENSE_CATEGORIES)[number],
      )
    ) {
      throw new Error(`Invalid stored expense category: ${expense.category}`);
    }
    actualByProject.get(expense.projectId)![expense.category as FinanceCategory] +=
      expense.amountMinor;
  }

  const gigs = new Map<
    string,
    { projectId: string; hourlyCostMinor: number; flatFeeMinor: number }
  >();
  for (const row of laborRows) {
    if (!row.briefId) continue;
    const projectId = projectByBrief.get(row.briefId);
    if (!projectId) continue;
    const current = gigs.get(row.gigId) ?? {
      projectId,
      hourlyCostMinor: 0,
      flatFeeMinor: 0,
    };
    const hasSnapshot =
      row.approvedRateMinor != null || row.approvedFlatFeeMinor != null;
    const trustedGigFlat = majorNokToMinor(row.flatFee);
    const trustedGigHourly = majorNokToMinor(row.rate);
    const profileDayMinor = Math.max(0, row.profileDayRate ?? 0) * 100;
    const fallbackHourly =
      profileDayMinor > 0 && organization.overtimeThresholdMinutes > 0
        ? Math.ceil(
            (profileDayMinor * 60) / organization.overtimeThresholdMinutes,
          )
        : organization.fallbackHourlyRateMinor > 0
        ? organization.fallbackHourlyRateMinor
        : organization.fallbackDayRateMinor > 0 &&
            organization.overtimeThresholdMinutes > 0
          ? Math.ceil(
              (organization.fallbackDayRateMinor * 60) /
                organization.overtimeThresholdMinutes,
            )
          : 0;
    const flatFeeMinor = hasSnapshot
      ? (row.approvedFlatFeeMinor ?? 0)
      : trustedGigFlat;
    const rateMinor = hasSnapshot
      ? (row.approvedRateMinor ?? 0)
      : trustedGigFlat > 0
        ? 0
        : trustedGigHourly > 0
          ? trustedGigHourly
          : fallbackHourly;
    current.flatFeeMinor = Math.max(current.flatFeeMinor, flatFeeMinor);
    if (row.startMinute != null && row.endMinute != null) {
      const elapsed = (row.endMinute - row.startMinute + 1_440) % 1_440;
      const reviewedBreak = row.producerBreakMinutes ?? row.breakMinutes;
      const payable = Math.max(
        0,
        elapsed - reviewedBreak + row.producerAdjustmentMinutes,
      );
      const overtime = Math.min(payable, Math.max(0, row.overtimeMinutes));
      const regular = payable - overtime;
      const multiplier =
        row.approvedOvertimeMultiplierBasisPoints ??
        10_000;
      current.hourlyCostMinor += Math.ceil(
        (regular * rateMinor) / 60 +
          (overtime * rateMinor * multiplier) / (60 * 10_000),
      );
    }
    gigs.set(row.gigId, current);
  }
  for (const gig of gigs.values()) {
    /**
     * Conservative payroll estimate: a positive flat fee is counted once per
     * gig once any entry is approved/locked. Otherwise all approved payable
     * minutes are multiplied by the trusted hourly rate and rounded UP to the
     * next øre, so the estimate never understates cost due to rounding.
     */
    const actual =
      gig.flatFeeMinor > 0 ? gig.flatFeeMinor : gig.hourlyCostMinor;
    actualByProject.get(gig.projectId)!.labor += actual;
  }

  const summaries = projects.map((project) => {
    const actual = actualByProject.get(project.id)!;
    const budget: Record<FinanceCategory, number> = {
      labor: project.laborBudgetMinor ?? 0,
      hotel: project.hotelBudgetMinor ?? 0,
      catering: project.cateringBudgetMinor ?? 0,
      transport: project.transportBudgetMinor ?? 0,
      subRentals: project.subRentalsBudgetMinor ?? 0,
    };
    const categories = (
      Object.keys(budget) as FinanceCategory[]
    ).map((category) => ({
      category,
      budgetMinor: budget[category],
      actualMinor: actual[category],
      varianceMinor: budget[category] - actual[category],
    }));
    const revenueMinor = project.contractRevenueMinor ?? 0;
    const totalExpensesMinor = categories.reduce(
      (sum, category) => sum + category.actualMinor,
      0,
    );
    const netProfitMinor = revenueMinor - totalExpensesMinor;
    const differenceMinor =
      project.easyjobRevenueMinor == null
        ? null
        : revenueMinor - project.easyjobRevenueMinor;
    return {
      projectId: project.id,
      projectName: project.name,
      client: project.client,
      accessRole: project.accessRole,
      revenueMinor,
      totalExpensesMinor,
      netProfitMinor,
      netMarginBasisPoints:
        revenueMinor === 0
          ? null
          : Math.trunc((netProfitMinor * 10_000) / revenueMinor),
      categories,
      easyjob: {
        number: project.easyjobNumber,
        recordedRevenueMinor: project.easyjobRevenueMinor,
        differenceMinor,
        status:
          !project.easyjobNumber
            ? "unlinked"
            : differenceMinor == null
              ? "pending"
              : differenceMinor === 0
                ? "matched"
                : "mismatch",
      },
    };
  });

  const allTimecards = projectIds.length === 0
    ? []
    : await db
        .select({
          id: timeEntriesTable.id,
          gigId: timeEntriesTable.gigId,
          briefId: timeEntriesTable.briefId,
          freelancerUserId: timeEntriesTable.freelancerUserId,
          freelancerName: freelancerProfilesTable.fullName,
          workDate: timeEntriesTable.workDate,
          startMinute: timeEntriesTable.startMinute,
          endMinute: timeEntriesTable.endMinute,
          breakMinutes: timeEntriesTable.breakMinutes,
          producerBreakMinutes: timeEntriesTable.producerBreakMinutes,
          producerAdjustmentMinutes: timeEntriesTable.producerAdjustmentMinutes,
          overtimeMinutes: timeEntriesTable.overtimeMinutes,
          notes: timeEntriesTable.notes,
          status: timeEntriesTable.status,
          rejectionReason: timeEntriesTable.rejectionReason,
          adjustmentReason: timeEntriesTable.adjustmentReason,
          flagReason: timeEntriesTable.flagReason,
          rate: gigsTable.rate,
          flatFee: gigsTable.flatFee,
          approvedRateMinor: timeEntriesTable.approvedRateMinor,
          approvedFlatFeeMinor: timeEntriesTable.approvedFlatFeeMinor,
          approvedOvertimeMultiplierBasisPoints:
            timeEntriesTable.approvedOvertimeMultiplierBasisPoints,
          profileDayRate: freelancerProfilesTable.defaultDayRate,
          createdAt: timeEntriesTable.createdAt,
          updatedAt: timeEntriesTable.updatedAt,
        })
        .from(timeEntriesTable)
        .innerJoin(gigsTable, eq(timeEntriesTable.gigId, gigsTable.id))
        .leftJoin(
          freelancerProfilesTable,
          eq(timeEntriesTable.freelancerUserId, freelancerProfilesTable.userId),
        )
        .where(inArray(timeEntriesTable.briefId, activeBriefIds));

  const timecards = allTimecards.flatMap((row) => {
    if (!row.briefId) return [];
    const projectId = projectByBrief.get(row.briefId);
    const project = summaries.find((item) => item.projectId === projectId);
    if (!project || row.startMinute == null || row.endMinute == null) return [];
    const elapsed = (row.endMinute - row.startMinute + 1_440) % 1_440;
    const reviewedBreak = row.producerBreakMinutes ?? row.breakMinutes;
    const workedMinutes = Math.max(0, elapsed - row.breakMinutes);
    const payableMinutes = Math.max(
      0,
      elapsed - reviewedBreak + row.producerAdjustmentMinutes,
    );
    return [{
      ...row,
      projectId: project.projectId,
      projectName: project.projectName,
      accessRole: project.accessRole,
      freelancerName: row.freelancerName || "Freelancer",
      workedMinutes,
      payableMinutes,
      rateMinor:
        row.approvedRateMinor ??
        (majorNokToMinor(row.flatFee) > 0
          ? 0
          : majorNokToMinor(row.rate) > 0
          ? majorNokToMinor(row.rate)
          : (row.profileDayRate ?? 0) > 0
            ? Math.ceil(
                (Math.max(0, row.profileDayRate ?? 0) * 100 * 60) /
                  Math.max(1, organization.overtimeThresholdMinutes),
              )
            : organization.fallbackHourlyRateMinor > 0
            ? organization.fallbackHourlyRateMinor
            : Math.ceil(
                (organization.fallbackDayRateMinor *
                  60) /
                  Math.max(1, organization.overtimeThresholdMinutes),
              )),
      flatFeeMinor:
        row.approvedFlatFeeMinor ?? majorNokToMinor(row.flatFee),
    }];
  });

  const expenseRows = expenses.map((expense) => {
    const project = summaries.find((item) => item.projectId === expense.projectId);
    return {
      ...expense,
      projectName: project?.projectName ?? "Unknown project",
      accessRole: project?.accessRole ?? "viewer",
    };
  });

  return {
    organization: {
      companyName: organization.companyName,
      currency: organization.defaultCurrency,
      vatRateBasisPoints: organization.defaultVatRateBasisPoints,
      paymentTermsDays: organization.defaultPaymentTermsDays,
    },
    projects: summaries,
    expenses: expenseRows,
    timecards,
    totals: {
      revenueMinor: summaries.reduce((sum, row) => sum + row.revenueMinor, 0),
      expensesMinor: summaries.reduce(
        (sum, row) => sum + row.totalExpensesMinor,
        0,
      ),
      netProfitMinor: summaries.reduce(
        (sum, row) => sum + row.netProfitMinor,
        0,
      ),
    },
    laborMethod:
      "Approved/locked entries only; positive flat fee once per gig, otherwise approved payable minutes × immutable/trusted/fallback hourly rate with snapshotted overtime, rounded up to øre.",
  };
}

router.get("/economy", requireEmployee, async (req, res): Promise<void> => {
  try {
    res.json({ ok: true, ...(await loadEconomy(userId(req))) });
  } catch (error) {
    req.log.error({ error }, "Failed to load economy");
    res.status(500).json({ ok: false, error: "Failed to load economy." });
  }
});

router.patch(
  "/economy/projects/:projectId/settings",
  requireEmployee,
  async (req, res): Promise<void> => {
    const projectId = String(req.params.projectId);
    if (!UUID_PATTERN.test(projectId)) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const keys = Object.keys(body);
    if (
      keys.length === 0 ||
      keys.some((key) => !SETTING_KEYS.includes(key as SettingKey)) ||
      keys.some(
        (key) =>
          !isMinorUnits(body[key]) &&
          !(key === "easyjobRevenueMinor" && body[key] === null),
      )
    ) {
      res.status(400).json({ ok: false, error: "Invalid financial settings." });
      return;
    }
    try {
      const callerUserId = userId(req);
      const access = await getProjectAccess(projectId, callerUserId);
      if (!access) {
        res.status(404).json({ ok: false, error: "Project not found." });
        return;
      }
      if (!isProjectWriter(access)) {
        res.status(403).json({ ok: false, error: "Project is read-only." });
        return;
      }
      const existing = await db
        .select()
        .from(projectFinanceSettingsTable)
        .where(eq(projectFinanceSettingsTable.projectId, projectId))
        .limit(1);
      const defaults: Settings = {
        contractRevenueMinor: 0,
        easyjobRevenueMinor: null,
        laborBudgetMinor: 0,
        hotelBudgetMinor: 0,
        cateringBudgetMinor: 0,
        transportBudgetMinor: 0,
        subRentalsBudgetMinor: 0,
      };
      const stored = existing[0];
      const value = (key: SettingKey): number | null =>
        key in body
          ? (body[key] as number | null)
          : stored?.[key] ?? defaults[key];
      const [settings] = await db
        .insert(projectFinanceSettingsTable)
        .values({
          projectId,
          contractRevenueMinor: value("contractRevenueMinor")!,
          easyjobRevenueMinor: value("easyjobRevenueMinor"),
          laborBudgetMinor: value("laborBudgetMinor")!,
          hotelBudgetMinor: value("hotelBudgetMinor")!,
          cateringBudgetMinor: value("cateringBudgetMinor")!,
          transportBudgetMinor: value("transportBudgetMinor")!,
          subRentalsBudgetMinor: value("subRentalsBudgetMinor")!,
          updatedByUserId: callerUserId,
        })
        .onConflictDoUpdate({
          target: projectFinanceSettingsTable.projectId,
          set: {
            contractRevenueMinor: value("contractRevenueMinor")!,
            easyjobRevenueMinor: value("easyjobRevenueMinor"),
            laborBudgetMinor: value("laborBudgetMinor")!,
            hotelBudgetMinor: value("hotelBudgetMinor")!,
            cateringBudgetMinor: value("cateringBudgetMinor")!,
            transportBudgetMinor: value("transportBudgetMinor")!,
            subRentalsBudgetMinor: value("subRentalsBudgetMinor")!,
            updatedByUserId: callerUserId,
            updatedAt: sql`now()`,
          },
        })
        .returning();
      res.json({ ok: true, settings });
    } catch (error) {
      req.log.error({ error }, "Failed to update financial settings");
      res
        .status(500)
        .json({ ok: false, error: "Failed to update financial settings." });
    }
  },
);

router.post(
  "/economy/projects/:projectId/expenses",
  requireEmployee,
  async (req, res): Promise<void> => {
    const projectId = String(req.params.projectId);
    if (!UUID_PATTERN.test(projectId)) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const allowed = [
      "category",
      "amountMinor",
      "incurredOn",
      "description",
      "vendor",
      "reference",
    ];
    const validCategory =
      typeof body.category === "string" &&
      MANUAL_EXPENSE_CATEGORIES.includes(
        body.category as (typeof MANUAL_EXPENSE_CATEGORIES)[number],
      );
    const validText = (key: string, max: number) =>
      body[key] == null ||
      (typeof body[key] === "string" && body[key].length <= max);
    if (
      Object.keys(body).some((key) => !allowed.includes(key)) ||
      !validCategory ||
      !isMinorUnits(body.amountMinor) ||
      body.amountMinor === 0 ||
      !isCalendarDate(body.incurredOn) ||
      !validText("description", 2_000) ||
      !validText("vendor", 300) ||
      !validText("reference", 300)
    ) {
      res.status(400).json({ ok: false, error: "Invalid expense." });
      return;
    }
    try {
      const callerUserId = userId(req);
      const access = await getProjectAccess(projectId, callerUserId);
      if (!access) {
        res.status(404).json({ ok: false, error: "Project not found." });
        return;
      }
      if (!isProjectWriter(access)) {
        res.status(403).json({ ok: false, error: "Project is read-only." });
        return;
      }
      const [expense] = await db
        .insert(projectExpensesTable)
        .values({
          projectId,
          category: body.category as string,
          amountMinor: body.amountMinor,
          incurredOn: body.incurredOn,
          description:
            typeof body.description === "string" ? body.description.trim() : "",
          vendor: typeof body.vendor === "string" ? body.vendor.trim() : "",
          reference:
            typeof body.reference === "string" ? body.reference.trim() : "",
          createdByUserId: callerUserId,
        })
        .returning();
      res.status(201).json({ ok: true, expense });
    } catch (error) {
      req.log.error({ error }, "Failed to create project expense");
      res.status(500).json({ ok: false, error: "Failed to create expense." });
    }
  },
);

router.get(
  "/economy/export.csv",
  requireEmployee,
  async (req, res): Promise<void> => {
    try {
      const economy = await loadEconomy(userId(req));
      const rows: Array<Array<string | number | null>> = [
        // This finance CSV is the application's invoice/export surface; there
        // is intentionally no separate invoice route.
        [
          "organization",
          "currency",
          "vat_rate_basis_points",
          "payment_terms_days",
          "project_id",
          "project",
          "client",
          "easyjob_number",
          "easyjob_status",
          "category",
          "revenue_minor",
          "budget_minor",
          "actual_minor",
          "variance_minor",
          "total_expenses_minor",
          "net_profit_minor",
          "net_margin_basis_points",
        ],
      ];
      for (const project of economy.projects) {
        for (const category of project.categories) {
          rows.push([
            economy.organization.companyName,
            economy.organization.currency,
            economy.organization.vatRateBasisPoints,
            economy.organization.paymentTermsDays,
            project.projectId,
            project.projectName,
            project.client,
            project.easyjob.number,
            project.easyjob.status,
            category.category,
            project.revenueMinor,
            category.budgetMinor,
            category.actualMinor,
            category.varianceMinor,
            project.totalExpensesMinor,
            project.netProfitMinor,
            project.netMarginBasisPoints,
          ]);
        }
      }
      const csv = `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="economy-export.csv"',
      );
      res.send(csv);
    } catch (error) {
      req.log.error({ error }, "Failed to export economy");
      res.status(500).json({ ok: false, error: "Failed to export economy." });
    }
  },
);

export default router;