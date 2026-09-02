import { Router, type IRouter } from "express";
import { and, asc, eq, gt, inArray, or } from "drizzle-orm";
import {
  db,
  freelancerProfilesTable,
  projectMembersTable,
  projectsTable,
  transportRunsTable,
  transportVehiclesTable,
} from "@workspace/db";
import { getProjectAccess, isProjectWriter, UUID_PATTERN } from "../lib/projectAccess";

const router: IRouter = Router();

const VEHICLE_TYPES = new Set(["truck", "van", "trailer", "rental"]);
const AVAILABILITY = new Set(["available", "assigned", "maintenance", "unavailable"]);
const RUN_STATUSES = new Set(["scheduled", "in_transit", "delivered", "returned"]);

function textValue(raw: unknown, max: number, required = false): string | null {
  if (typeof raw !== "string") return required ? null : "";
  const value = raw.trim().slice(0, max);
  return required && !value ? null : value;
}

function nullableId(raw: unknown): string | null | undefined {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 200) return undefined;
  return raw;
}

function nullableInt(raw: unknown): number | null | undefined {
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) return undefined;
  return value;
}

function instant(raw: unknown, required = false): Date | null | undefined {
  if (raw === null || raw === "") return required ? undefined : null;
  if (typeof raw !== "string") return undefined;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

async function canWriteProject(projectId: string, userId: string): Promise<"ok" | "missing" | "readonly"> {
  if (!UUID_PATTERN.test(projectId)) return "missing";
  const access = await getProjectAccess(projectId, userId);
  if (!access) return "missing";
  return isProjectWriter(access) ? "ok" : "readonly";
}

router.get("/transport", async (req, res): Promise<void> => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const accessibleProjects = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .leftJoin(
        projectMembersTable,
        and(
          eq(projectMembersTable.projectId, projectsTable.id),
          eq(projectMembersTable.userId, userId),
        ),
      )
      .where(
        or(
          eq(projectsTable.userId, userId),
          eq(projectMembersTable.userId, userId),
        ),
      );
    const projectIds = accessibleProjects.map((row) => row.id);
    const vehicles = await db
      .select({
        id: transportVehiclesTable.id,
        name: transportVehiclesTable.name,
        vehicleType: transportVehiclesTable.vehicleType,
        licensePlate: transportVehiclesTable.licensePlate,
        capacityKg: transportVehiclesTable.capacityKg,
        volumeM3: transportVehiclesTable.volumeM3,
        primaryDriverUserId: transportVehiclesTable.primaryDriverUserId,
        primaryDriverName: freelancerProfilesTable.fullName,
        availabilityStatus: transportVehiclesTable.availabilityStatus,
        notes: transportVehiclesTable.notes,
      })
      .from(transportVehiclesTable)
      .leftJoin(
        freelancerProfilesTable,
        eq(transportVehiclesTable.primaryDriverUserId, freelancerProfilesTable.userId),
      )
      .orderBy(asc(transportVehiclesTable.name));

    const runs =
      projectIds.length === 0
        ? []
        : await db
            .select({
              id: transportRunsTable.id,
              projectId: transportRunsTable.projectId,
              projectName: projectsTable.name,
              vehicleId: transportRunsTable.vehicleId,
              vehicleName: transportVehiclesTable.name,
              vehicleLicensePlate: transportVehiclesTable.licensePlate,
              driverUserId: transportRunsTable.driverUserId,
              driverName: freelancerProfilesTable.fullName,
              title: transportRunsTable.title,
              origin: transportRunsTable.origin,
              destination: transportRunsTable.destination,
              departureAt: transportRunsTable.departureAt,
              loadInAt: transportRunsTable.loadInAt,
              loadOutAt: transportRunsTable.loadOutAt,
              status: transportRunsTable.status,
              cargoNotes: transportRunsTable.cargoNotes,
            })
            .from(transportRunsTable)
            .innerJoin(projectsTable, eq(transportRunsTable.projectId, projectsTable.id))
            .innerJoin(
              transportVehiclesTable,
              eq(transportRunsTable.vehicleId, transportVehiclesTable.id),
            )
            .leftJoin(
              freelancerProfilesTable,
              eq(transportRunsTable.driverUserId, freelancerProfilesTable.userId),
            )
            .where(inArray(transportRunsTable.projectId, projectIds))
            .orderBy(asc(transportRunsTable.departureAt));
    res.json({ ok: true, vehicles, runs });
  } catch (err) {
    req.log.error({ err }, "transport dashboard GET failed");
    res.status(500).json({ ok: false, error: "Could not load transport data." });
  }
});

router.post("/transport/vehicles", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = textValue(body.name, 120, true);
  const licensePlate = textValue(body.licensePlate, 32, true);
  const vehicleType = textValue(body.vehicleType, 20, true);
  const availabilityStatus = textValue(body.availabilityStatus, 20) || "available";
  const capacityKg = nullableInt(body.capacityKg);
  const volumeM3 = nullableInt(body.volumeM3);
  const primaryDriverUserId = nullableId(body.primaryDriverUserId);
  if (
    !name ||
    !licensePlate ||
    !vehicleType ||
    !VEHICLE_TYPES.has(vehicleType) ||
    !AVAILABILITY.has(availabilityStatus) ||
    capacityKg === undefined ||
    volumeM3 === undefined ||
    primaryDriverUserId === undefined
  ) {
    res.status(400).json({ ok: false, error: "Invalid vehicle details." });
    return;
  }
  try {
    const [vehicle] = await db
      .insert(transportVehiclesTable)
      .values({
        name,
        licensePlate,
        vehicleType,
        availabilityStatus,
        capacityKg,
        volumeM3,
        primaryDriverUserId,
        notes: textValue(body.notes, 1000) ?? "",
      })
      .returning();
    res.status(201).json({ ok: true, vehicle });
  } catch (err) {
    req.log.error({ err }, "transport vehicle POST failed");
    res.status(500).json({ ok: false, error: "Could not create vehicle." });
  }
});

router.patch("/transport/vehicles/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "");
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Vehicle not found." });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if ("availabilityStatus" in body) {
    const status = textValue(body.availabilityStatus, 20, true);
    if (!status || !AVAILABILITY.has(status)) {
      res.status(400).json({ ok: false, error: "Invalid availability status." });
      return;
    }
    updates.availabilityStatus = status;
  }
  if ("primaryDriverUserId" in body) {
    const driver = nullableId(body.primaryDriverUserId);
    if (driver === undefined) {
      res.status(400).json({ ok: false, error: "Invalid driver." });
      return;
    }
    updates.primaryDriverUserId = driver;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ ok: false, error: "No editable fields supplied." });
    return;
  }
  try {
    if (updates.primaryDriverUserId) {
      const [driver] = await db
        .select({ userId: freelancerProfilesTable.userId })
        .from(freelancerProfilesTable)
        .where(eq(freelancerProfilesTable.userId, String(updates.primaryDriverUserId)))
        .limit(1);
      if (!driver) {
        res.status(400).json({ ok: false, error: "Driver is not in the Global Crew Directory." });
        return;
      }
    }
    if (
      updates.availabilityStatus === "maintenance" ||
      updates.availabilityStatus === "unavailable"
    ) {
      const [futureRun] = await db
        .select({ id: transportRunsTable.id })
        .from(transportRunsTable)
        .where(
          and(
            eq(transportRunsTable.vehicleId, id),
            gt(transportRunsTable.departureAt, new Date()),
            inArray(transportRunsTable.status, ["scheduled", "in_transit"]),
          ),
        )
        .limit(1);
      if (futureRun) {
        res.status(409).json({
          ok: false,
          error: "This vehicle has an upcoming active transport run.",
        });
        return;
      }
    }
    const [vehicle] = await db
      .update(transportVehiclesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transportVehiclesTable.id, id))
      .returning();
    if (!vehicle) {
      res.status(404).json({ ok: false, error: "Vehicle not found." });
      return;
    }
    res.json({ ok: true, vehicle });
  } catch (err) {
    req.log.error({ err }, "transport vehicle PATCH failed");
    res.status(500).json({ ok: false, error: "Could not update vehicle." });
  }
});

router.post("/transport/runs", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const projectId = textValue(body.projectId, 40, true);
  const vehicleId = textValue(body.vehicleId, 40, true);
  const title = textValue(body.title, 120, true);
  const driverUserId = nullableId(body.driverUserId);
  const departureAt = instant(body.departureAt, true);
  const loadInAt = instant(body.loadInAt);
  const loadOutAt = instant(body.loadOutAt);
  const status = textValue(body.status, 20) || "scheduled";
  if (
    !projectId ||
    !vehicleId ||
    !UUID_PATTERN.test(vehicleId) ||
    !title ||
    driverUserId === undefined ||
    !departureAt ||
    loadInAt === undefined ||
    loadOutAt === undefined ||
    !RUN_STATUSES.has(status)
  ) {
    res.status(400).json({ ok: false, error: "Invalid transport run details." });
    return;
  }
  const access = await canWriteProject(projectId, (req as unknown as { _userId: string })._userId);
  if (access === "missing") {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (access === "readonly") {
    res.status(403).json({ ok: false, error: "Project is read-only." });
    return;
  }
  try {
    const [vehicle] = await db
      .select({ status: transportVehiclesTable.availabilityStatus })
      .from(transportVehiclesTable)
      .where(eq(transportVehiclesTable.id, vehicleId))
      .limit(1);
    if (!vehicle) {
      res.status(400).json({ ok: false, error: "Vehicle not found." });
      return;
    }
    if (vehicle.status === "maintenance" || vehicle.status === "unavailable") {
      res.status(409).json({ ok: false, error: "Vehicle is not available for dispatch." });
      return;
    }
    if (driverUserId) {
      const [driver] = await db
        .select({ userId: freelancerProfilesTable.userId })
        .from(freelancerProfilesTable)
        .where(eq(freelancerProfilesTable.userId, driverUserId))
        .limit(1);
      if (!driver) {
        res.status(400).json({ ok: false, error: "Driver is not in the Global Crew Directory." });
        return;
      }
    }
    if (loadInAt && loadOutAt && loadOutAt < loadInAt) {
      res.status(400).json({ ok: false, error: "Load-out time cannot be before load-in time." });
      return;
    }
    const [run] = await db
      .insert(transportRunsTable)
      .values({
        projectId,
        vehicleId,
        driverUserId,
        title,
        departureAt,
        loadInAt,
        loadOutAt,
        status,
        origin: textValue(body.origin, 200) ?? "",
        destination: textValue(body.destination, 200) ?? "",
        cargoNotes: textValue(body.cargoNotes, 2000) ?? "",
      })
      .returning();
    res.status(201).json({ ok: true, run });
  } catch (err) {
    req.log.error({ err }, "transport run POST failed");
    res.status(500).json({ ok: false, error: "Could not schedule transport run." });
  }
});

router.patch("/transport/runs/:id", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "");
  const status = textValue((req.body as Record<string, unknown> | undefined)?.status, 20, true);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Transport run not found." });
    return;
  }
  if (!status || !RUN_STATUSES.has(status)) {
    res.status(400).json({ ok: false, error: "Invalid load status." });
    return;
  }
  try {
    const [existing] = await db
      .select({ projectId: transportRunsTable.projectId })
      .from(transportRunsTable)
      .where(eq(transportRunsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ ok: false, error: "Transport run not found." });
      return;
    }
    const access = await canWriteProject(
      existing.projectId,
      (req as unknown as { _userId: string })._userId,
    );
    if (access !== "ok") {
      res.status(access === "readonly" ? 403 : 404).json({
        ok: false,
        error: access === "readonly" ? "Project is read-only." : "Project not found.",
      });
      return;
    }
    const [run] = await db
      .update(transportRunsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(transportRunsTable.id, id),
          eq(transportRunsTable.projectId, existing.projectId),
        ),
      )
      .returning();
    res.json({ ok: true, run });
  } catch (err) {
    req.log.error({ err }, "transport run PATCH failed");
    res.status(500).json({ ok: false, error: "Could not update transport run." });
  }
});

export default router;