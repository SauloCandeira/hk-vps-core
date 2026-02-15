import express from "express";
import cors from "cors";
import apiRouter from "./api/index.js";
import { checkDailyBudget } from "./services/costGuard.service.js";
import { serverConfig } from "../config/server.config.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import { logSystemEvent, logError } from "./services/logging.service.js";

export const createApp = () => {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (serverConfig.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Internal-Key"],
    credentials: false
  }));


  app.use(express.json());
  app.use(rateLimitMiddleware);

  // Global cost guard middleware
  app.use(async (req, res, next) => {
    // Only guard endpoints that could trigger LLM/AI costs
    const costEndpoints = [
      "/ai-team", "/agents", "/contexts", "/reports", "/skills", "/system", "/crons" // add more as needed
    ];
    const isCostEndpoint = costEndpoints.some((prefix) => req.path.startsWith("/api" + prefix));
    if (!isCostEndpoint) return next();
    try {
      const budget = await checkDailyBudget();
      if (!budget.allowed) {
        return res.status(403).json({
          error: "COST_GUARD_BLOCKED",
          reason: budget.failSafe ? "telemetry_unavailable" : "daily_budget_exceeded",
          cost_today: budget.costToday,
          max_budget_usd: budget.maxBudget,
          fail_safe: budget.failSafe,
          timestamp: new Date().toISOString()
        });
      }
      next();
    } catch (e) {
      return res.status(503).json({
        error: "COST_GUARD_ERROR",
        message: "Cost guard check failed.",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.use((req, _res, next) => {
    logSystemEvent({
      action: "request",
      status: "received",
      metadata: { method: req.method, path: req.path }
    });
    next();
  });
  app.use("/api", apiRouter);

  app.use((err, _req, res, _next) => {
    logError({
      action: "request_error",
      status: "error",
      metadata: { message: err?.message || "Unexpected error" }
    });
    res.status(500).json({
      error: "Internal Server Error",
      timestamp: new Date().toISOString()
    });
  });

  return app;
};
