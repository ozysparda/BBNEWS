import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import articlesRouter from "./articles";
import complaintsRouter from "./complaints";
import storageRouter from "./storage";
import usersRouter from "./users";
import profileRouter from "./profile";
import donationsRouter from "./donations";
import donationVerificationRouter from "./donation-verification";
import sitemapRouter from "./sitemap";
import feedRouter from "./feed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(articlesRouter);
router.use(complaintsRouter);
router.use(storageRouter);
router.use(usersRouter);
router.use(profileRouter);
router.use(donationsRouter);
router.use(donationVerificationRouter);
router.use(sitemapRouter);
router.use(feedRouter);

export default router;