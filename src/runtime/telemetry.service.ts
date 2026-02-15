import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TelemetryService {
  private readonly dbUrl = process.env.DATABASE_URL || '';
  private readonly maxBudget = Number(process.env.DAILY_MAX_USD || 10);

  async checkDailyBudget() {
    const metrics = await this.fetchLlmMetricsFromDb();
    if (!metrics) {
      return { allowed: true, failSafe: true, costToday: 0, maxBudget: this.maxBudget };
    }

    const costToday = Number(metrics.total_cost_today || 0);
    return {
      allowed: costToday <= this.maxBudget,
      failSafe: false,
      costToday,
      maxBudget: this.maxBudget,
    };
  }

  async fetchLlmMetricsFromDb() {
    if (!this.dbUrl) return null;

    const pool = new Pool({ connectionString: this.dbUrl });
    try {
      const client = await pool.connect();
      try {
        const totals = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN cost_usd END), 0) AS total_cost_today,
            COALESCE(SUM(cost_usd), 0) AS total_cost_month,
            COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN tokens_total END), 0) AS total_tokens_today,
            COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END), 0) AS total_requests_today
          FROM llm_metrics
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
        `);

        const model = await client.query(`
          SELECT model, COUNT(*)::int AS requests
          FROM llm_metrics
          GROUP BY model
          ORDER BY requests DESC
          LIMIT 1
        `);

        return {
          ...totals.rows[0],
          most_used_model: model.rows[0]?.model || null,
          usage_by_model: [],
          usage_by_agent: [],
          recent_operations: [],
        };
      } finally {
        client.release();
      }
    } catch {
      return null;
    } finally {
      await pool.end();
    }
  }

  buildLlmMetricsFromLogs() {
    const logsPath = path.resolve('/root/hktech-ai-gateway/logs/agents.log');
    if (!fs.existsSync(logsPath)) {
      return { total_requests: 0, agents_activity: {}, last_executions: [] as any[] };
    }

    const lines = fs.readFileSync(logsPath, 'utf-8').split('\n').filter(Boolean);
    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, any>>;

    const agentsActivity: Record<string, number> = {};
    for (const entry of entries) {
      const agent = String(entry.agent || 'unknown');
      agentsActivity[agent] = (agentsActivity[agent] || 0) + 1;
    }

    return {
      total_requests: entries.length,
      agents_activity: agentsActivity,
      last_executions: entries.slice(-20).reverse(),
    };
  }
}
