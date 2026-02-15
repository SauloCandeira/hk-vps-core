import { Controller, Get } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { TelemetryService } from '../../runtime/telemetry.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly logger: LoggingService,
  ) {}

  @Get('llm')
  async llm() {
    const dbMetrics = await this.telemetry.fetchLlmMetricsFromDb();
    if (dbMetrics) {
      this.logger.system({ action: 'metrics_llm', status: 'ok', metadata: { source: 'postgres' } });
      return withMeta(dbMetrics);
    }

    const fallback = this.telemetry.buildLlmMetricsFromLogs();
    this.logger.system({ action: 'metrics_llm', status: 'fallback', metadata: { source: 'logs' } });
    return withMeta({
      total_cost_today: 0,
      total_cost_month: 0,
      total_tokens_today: 0,
      total_requests_today: fallback.total_requests || 0,
      most_used_model: null,
      usage_by_model: [],
      usage_by_agent: Object.entries(fallback.agents_activity || {}).map(([agent, count]) => ({
        agent,
        tokens: Number(count) || 0,
        cost_usd: 0,
      })),
      recent_operations: (fallback.last_executions || []).map((entry: any) => ({
        model: 'unknown',
        agent: entry.agent || 'unknown',
        tokens: 0,
        cost_usd: 0,
        endpoint: entry.action || 'unknown',
        created_at: entry.timestamp || null,
      })),
    });
  }

  @Get('system')
  system() {
    this.logger.system({ action: 'metrics_system', status: 'ok' });
    return withMeta({ status: 'placeholder', message: 'System metrics will be available in a future release.' });
  }

  @Get('agents')
  agents() {
    this.logger.system({ action: 'metrics_agents', status: 'ok' });
    return withMeta({ status: 'placeholder', message: 'Agent metrics will be available in a future release.' });
  }
}
