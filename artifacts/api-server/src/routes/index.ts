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

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(questsRouter);
router.use(interviewRouter);
router.use(testRouter);
router.use(jobsRouter);
router.use(leaderboardRouter);
router.use(aiRouter);
router.use(anthropicRouter);
router.use(courseRouter);

export default router;
