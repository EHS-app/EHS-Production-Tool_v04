import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAutoSignInRouter from "./devAutoSignIn";
import rigplanAnalyzeRouter from "./rigplanAnalyze";
import venueMemoryRouter from "./venueMemory";
import storageRouter from "./storage";
import portalProfileRouter from "./portalProfile";
import portalBriefsRouter from "./portalBriefs";
import portalGigsRouter from "./portalGigs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devAutoSignInRouter);
router.use(rigplanAnalyzeRouter);
router.use(venueMemoryRouter);
router.use(storageRouter);
router.use(portalProfileRouter);
router.use(portalBriefsRouter);
router.use(portalGigsRouter);

export default router;
