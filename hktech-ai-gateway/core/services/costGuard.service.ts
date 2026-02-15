// services/costGuard.service.ts
import { Pool } from 'pg';

const MAX_DAILY_COST_USD = parseFloat(process.env.MAX_DAILY_COST_USD || '1.0');
const LOW_COST_MODE = String(process.env.LOW_COST_MODE || 'true') === 'true';

const pgPool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 1
});

export async function checkDailyBudget(): Promise<{allowed: boolean, costToday: number, maxBudget: number, failSafe: boolean}> {
  try {
    const client = await pgPool.connect();
    const q = `SELECT SUM(cost_usd) AS total FROM llm_telemetry WHERE DATE(timestamp) = CURRENT_DATE`;
    const { rows } = await client.query(q);
    client.release();
    const total = parseFloat(rows[0].total || 0);
    if (isNaN(total)) {
      // fail_safe: liberar acesso
      return { allowed: true, costToday: 0, maxBudget: MAX_DAILY_COST_USD, failSafe: true };
    }
    if (total >= MAX_DAILY_COST_USD) {
      return { allowed: false, costToday: total, maxBudget: MAX_DAILY_COST_USD, failSafe: false };
    }
    return { allowed: true, costToday: total, maxBudget: MAX_DAILY_COST_USD, failSafe: false };
  } catch (e) {
    // fail_safe: liberar acesso
    return { allowed: true, costToday: 0, maxBudget: MAX_DAILY_COST_USD, failSafe: true };
  }
}
