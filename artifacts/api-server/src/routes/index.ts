import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devAutoSignInRouter from "./devAutoSignIn";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devAutoSignInRouter);

export default router;
