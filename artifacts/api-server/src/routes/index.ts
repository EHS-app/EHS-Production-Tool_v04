import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAutoSignInRouter from "./devAutoSignIn";
import rigplanAnalyzeRouter from "./rigplanAnalyze";
import venueMemoryRouter from "./venueMemory";
import storageRouter from "./storage";
import portalProfileRouter from "./portalProfile";
import portalBriefsRouter from "./portalBriefs";
import portalGigsRouter from "./portalGigs";
import portalTimeEntriesRouter from "./portalTimeEntries";
import projectsRouter from "./projects";
import inspectionExtractRouter from "./inspectionExtract";
import adminRouter from "./admin";
import { requireEmployee } from "../middleware/userType";

const router: IRouter = Router();

// Public / shared infra (no user type gate).
router.use(healthRouter);
router.use(devAutoSignInRouter);

// Production Tool surface — employee-only. Any freelancer-tagged
// Clerk user calling these endpoints gets a 403 before the route
// handler ever runs, so even a tampered frontend can't reach them.
// The middleware also sets `req._userId` for downstream handlers.
router.use(requireEmployee, rigplanAnalyzeRouter);
router.use(requireEmployee, venueMemoryRouter);
router.use(requireEmployee, storageRouter);
router.use(requireEmployee, projectsRouter);
router.use(requireEmployee, inspectionExtractRouter);

// Admin tools — gated internally to @ehs.no callers via its own
// `requireAdmin` middleware. Mounted outside `requireEmployee` so we
// don't accidentally double-gate it, but the admin gate is strictly
// tighter than the employee gate.
router.use(adminRouter);

// Portal surface — open to both freelancers (their own data) and
// employees (producers reading freelancer data via the Crew Report).
// Individual handlers still enforce their own per-row ownership.
router.use(portalProfileRouter);
router.use(portalBriefsRouter);
router.use(portalGigsRouter);
router.use(portalTimeEntriesRouter);

export default router;
