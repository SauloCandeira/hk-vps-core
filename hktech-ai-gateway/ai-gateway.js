// ...existing code...
import { Pool } from "pg";

// Budget-aware test system config
const MAX_TEST_BUDGET_USD = parseFloat(process.env.MAX_TEST_BUDGET_USD || "1.0");
const MAX_TESTS_PER_DAY = parseInt(process.env.MAX_TESTS_PER_DAY || "5");
const TEST_RATE_LIMIT = 3; // per hour
const TEST_TIMEOUT_MS = 30000;
const TEST_TAG_SOURCE = "test";
const TEST_TAG_ENDPOINT = "run-tests";

// PG pool for telemetry
const pgPool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 1
});

// In-memory rate limit (reset hourly)
let testRateLimit = {};
setInterval(() => { testRateLimit = {}; }, 60 * 60 * 1000);

// Helper: check test budget
async function checkTestBudget() {
  try {
    const client = await pgPool.connect();
    const q = `SELECT SUM(cost_usd) AS total FROM llm_telemetry WHERE (source = $1 OR endpoint = $2)`;
    const { rows } = await client.query(q, [TEST_TAG_SOURCE, TEST_TAG_ENDPOINT]);
    client.release();
    const total = parseFloat(rows[0].total || 0);
    if (isNaN(total)) return { allowed: false, reason: "telemetry_query_failed" };
    if (total >= MAX_TEST_BUDGET_USD) {
      return { allowed: false, reason: "test_budget_exceeded", total };
    }
    return { allowed: true, total };
  } catch (e) {
    return { allowed: false, reason: "telemetry_unavailable" };
  }
}

// Helper: log test telemetry
async function logTestTelemetry(cost = 0) {
  try {
    const client = await pgPool.connect();
    await client.query(
      `INSERT INTO llm_telemetry (source, endpoint, cost_usd, operation, timestamp) VALUES ($1, $2, $3, $4, NOW())`,
      [TEST_TAG_SOURCE, TEST_TAG_ENDPOINT, cost, "infra_test"]
    );
    client.release();
  } catch (e) {}
}

// Helper: safe local health checks
async function runLocalHealthChecks() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const base = `http://127.0.0.1:${process.env.PORT || 3001}`;
  const results = {};
  try {
    const h = await fetch(base + "/api/health");
    results.health = await h.json();
  } catch (e) { results.health = { error: true }; }
  try {
    const s = await fetch(base + "/api/system/status");
    results.system = await s.json();
  } catch (e) { results.system = { error: true }; }
  try {
    const pm2 = require('child_process').execSync('pm2 jlist', { encoding: 'utf-8', timeout: 5000 });
    results.pm2 = JSON.parse(pm2).map(p => ({ name: p.name, status: p.pm2_env.status }));
  } catch (e) { results.pm2 = { error: true }; }
  try {
    results.env = {
      INTERNAL_API_KEY: !!process.env.INTERNAL_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      PORT: process.env.PORT || 3001
    };
  } catch (e) { results.env = { error: true }; }
  return results;
}


import fs from "fs";
import path from "path";

import "dotenv/config";
import { createApp } from "./core/app.js";
import { serverConfig } from "./config/server.config.js";
import net from "net";

const app = createApp();

// POST /api/system/run-tests
app.post("/api/system/run-tests", async (req, res) => {
  // Auth: INTERNAL_API_KEY required
  const key = req.headers["x-api-key"] || req.headers["X-API-Key"];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Rate limit: 3 per hour per IP
  const ip = req.ip || req.connection.remoteAddress;
  testRateLimit[ip] = (testRateLimit[ip] || 0) + 1;
  if (testRateLimit[ip] > TEST_RATE_LIMIT) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  // Budget check (fail-safe: block if DB/telemetry fails)
  const budget = await Promise.race([
    checkTestBudget(),
    new Promise(r => setTimeout(() => r({ allowed: false, reason: "timeout" }), 5000))
  ]);
  if (!budget.allowed) {
    return res.status(403).json({
      status: "blocked",
      reason: budget.reason || "test_budget_exceeded",
      max_budget_usd: MAX_TEST_BUDGET_USD
    });
  }
  // Run tests (timeout protection)
  let testResults = null;
  let timedOut = false;
  await Promise.race([
    (async () => { testResults = await runLocalHealthChecks(); })(),
    new Promise(r => setTimeout(() => { timedOut = true; r(); }, TEST_TIMEOUT_MS))
  ]);
  if (timedOut) {
    return res.status(504).json({ error: "Test routine timeout" });
  }
  // Log test telemetry
  await logTestTelemetry(0);
  res.json({ status: "ok", testResults });
});

// Infra observability endpoints
const infraLogPath = "/root/logs/infra-sync.log";
const infraLockPath = "/root/runtime/infra.lock";

app.get("/api/system/infra-status", (req, res) => {
  let lastSync = null;
  let automationActive = fs.existsSync(infraLockPath) ? false : true;
  let restartReason = null;
  let filesChanged = [];
  let healthResults = {};
  if (fs.existsSync(infraLogPath)) {
    const logLines = fs.readFileSync(infraLogPath, "utf-8").split("\n").reverse();
    for (const line of logLines) {
      if (line.includes("Triggering infra-auto-sync.sh")) {
        lastSync = line.match(/\[(.*?)\]/)[1];
        restartReason = line.split("due to:")[1]?.split(". Files:")[0]?.trim();
        filesChanged = line.split("Files:")[1]?.split(", ") || [];
        break;
      }
    }
    for (const line of logLines) {
      if (line.includes("Health check: /api/health")) healthResults.health = line;
      if (line.includes("Health check: /api/system/status")) healthResults.system = line;
      if (line.includes("Health check: /api/metrics/llm")) healthResults.metrics = line;
    }
  }
  res.json({
    lastSync,
    automationActive,
    restartReason,
    filesChanged,
    healthResults
  });
});

app.get("/api/system/infra-logs", (req, res) => {
  if (fs.existsSync(infraLogPath)) {
    const logs = fs.readFileSync(infraLogPath, "utf-8");
    res.type("text/plain").send(logs);
  } else {
    res.status(404).send("No infra logs found.");
  }
});

console.log("[ENV CHECK] INTERNAL_API_KEY loaded:", !!process.env.INTERNAL_API_KEY);

// Runtime safety guard: check if port is already in use
const port = serverConfig.port;
const bind = serverConfig.bind || "0.0.0.0";
const serverProbe = net.createServer();
serverProbe.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[STARTUP GUARD] Port ${port} is already in use. Another gateway instance may be running. Startup aborted.`);
    process.exit(1);
  } else {
    throw err;
  }
});
serverProbe.once("listening", () => {
  serverProbe.close();
  app.listen(port, bind, () => {
    console.log(`HKTECH AI Gateway running on port ${port}`);
    console.log(`Public API: http://147.93.33.246:${port}/api/ai-team`);
  });
});
serverProbe.listen(port, bind);
