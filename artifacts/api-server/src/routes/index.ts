import { Router, type IRouter } from "express";
import healthRouter from "./health";
import articlesRouter from "./articles";
import categoriesRouter from "./categories";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(articlesRouter);
router.use(categoriesRouter);
router.use(authRouter);

export default router;
