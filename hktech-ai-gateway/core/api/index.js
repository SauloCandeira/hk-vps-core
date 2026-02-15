import { Router } from "express";
import agentsRoutes from "./agents.routes.js";
import contextsRoutes from "./contexts.routes.js";
import reportsRoutes from "./reports.routes.js";
import cronsRoutes from "./crons.routes.js";
import skillsRoutes from "./skills.routes.js";
import systemRoutes from "./system.routes.js";
import metricsRoutes from "./metrics.routes.js";
import legacyRoutes from "./legacy.routes.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { killSwitchMiddleware } from "../middleware/killSwitch.middleware.js";

const router = Router();

const protectedPrefixes = [
	"/agents",
	"/contexts",
	"/reports",
	"/crons",
	"/system",
	"/metrics"
];

router.use((req, res, next) => {
	const isProtected = protectedPrefixes.some((prefix) => req.path.startsWith(prefix));
	if (!isProtected) return next();
	return authMiddleware(req, res, next);
});

router.use((req, res, next) => {
	const isProtected = protectedPrefixes.some((prefix) => req.path.startsWith(prefix));
	if (!isProtected) return next();
	return killSwitchMiddleware(req, res, next);
});

router.use(agentsRoutes);
router.use(contextsRoutes);
router.use(reportsRoutes);
router.use(cronsRoutes);
router.use(skillsRoutes);
router.use(systemRoutes);
router.use(metricsRoutes);

router.use(legacyRoutes);

export default router;
