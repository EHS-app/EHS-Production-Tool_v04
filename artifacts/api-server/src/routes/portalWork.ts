import { Router, type IRouter, type RequestHandler } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectTasksTable,
  transportRunsTable,
  transportVehiclesTable,
} from "@workspace/db";

const router: IRouter = Router();

const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

router.get("/portal/my-runs", requireSignedIn, async (req, res): Promise<void> => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const runs = await db
      .select({
        id: transportRunsTable.id,
        projectName: projectsTable.name,
        title: transportRunsTable.title,
        origin: transportRunsTable.origin,
        destination: transportRunsTable.destination,
        departureAt: transportRunsTable.departureAt,
        loadInAt: transportRunsTable.loadInAt,
        loadOutAt: transportRunsTable.loadOutAt,
        status: transportRunsTable.status,
        cargoNotes: transportRunsTable.cargoNotes,
        vehicleName: transportVehiclesTable.name,
        vehicleLicensePlate: transportVehiclesTable.licensePlate,
      })
      .from(transportRunsTable)
      .innerJoin(projectsTable, eq(transportRunsTable.projectId, projectsTable.id))
      .innerJoin(
        transportVehiclesTable,
        eq(transportRunsTable.vehicleId, transportVehiclesTable.id),
      )
      .where(eq(transportRunsTable.driverUserId, userId))
      .orderBy(asc(transportRunsTable.departureAt));
    res.json({ ok: true, runs });
  } catch (error) {
    req.log.error({ error }, "portal my-runs GET failed");
    res.status(500).json({ ok: false, error: "Could not load your transport runs." });
  }
});

router.get("/portal/my-tasks", requireSignedIn, async (req, res): Promise<void> => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const tasks = await db
      .select({
        id: projectTasksTable.id,
        projectName: projectsTable.name,
        projectVenue: projectsTable.venue,
        title: projectTasksTable.title,
        status: projectTasksTable.status,
        priority: projectTasksTable.priority,
        department: projectTasksTable.department,
        dueDate: projectTasksTable.dueDate,
        description: projectTasksTable.description,
      })
      .from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .where(eq(projectTasksTable.assignedUserId, userId))
      .orderBy(asc(projectTasksTable.dueDate), asc(projectTasksTable.createdAt));
    res.json({ ok: true, tasks });
  } catch (error) {
    req.log.error({ error }, "portal my-tasks GET failed");
    res.status(500).json({ ok: false, error: "Could not load your tasks." });
  }
});

export default router;