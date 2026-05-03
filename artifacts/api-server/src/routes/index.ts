import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import questsRouter from "./quests";
import interviewRouter from "./interview";
import testRouter from "./test";
import jobsRouter from "./jobs";
import leaderboardRouter from "./leaderboard";
import aiRouter from "./ai";
import anthropicRouter from "./anthropic";
import courseRouter from "./course";
import profileRouter from "./profile";
import tpoRouter from "./tpo";
import driveCheckRouter from "./driveCheck";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(profileRouter);
router.use(questsRouter);
router.use(interviewRouter);
router.use(testRouter);
router.use(jobsRouter);
router.use(leaderboardRouter);
router.use(aiRouter);
router.use(anthropicRouter);
router.use(courseRouter);
router.use(tpoRouter);
router.use(driveCheckRouter);

export default router;
