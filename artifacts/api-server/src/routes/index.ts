import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAutoSignInRouter from "./devAutoSignIn";
import rigplanAnalyzeRouter from "./rigplanAnalyze";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devAutoSignInRouter);
router.use(rigplanAnalyzeRouter);

export default router;
