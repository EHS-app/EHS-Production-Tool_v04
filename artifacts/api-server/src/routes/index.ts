import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAutoSignInRouter from "./devAutoSignIn";
import rigplanAnalyzeRouter from "./rigplanAnalyze";
import venueMemoryRouter from "./venueMemory";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devAutoSignInRouter);
router.use(rigplanAnalyzeRouter);
router.use(venueMemoryRouter);
router.use(storageRouter);

export default router;
