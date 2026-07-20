import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import articlesRouter from "./articles";
import storageRouter from "./storage";
import usersRouter from "./users";
import profileRouter from "./profile";
import complaintsRouter from "./complaints";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(articlesRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(profileRouter);
router.use(complaintsRouter);

export default router;