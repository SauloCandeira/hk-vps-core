import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import os from 'os';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';
import { InfraService } from '../../runtime/infra.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
    private readonly infra: InfraService,
  ) {}

  @Get('status')
  status() {
    const agents = this.runtime.listAgents();
    const contexts = this.runtime.loadAllContexts();
    const crons = this.runtime.listCrons();
    const contextCount = contexts.system.length + contexts.agents.length + contexts.runtime.length;
    const memory = process.memoryUsage();

    this.logger.system({ action: 'system_status', status: 'ok', metadata: { agent_count: agents.length, context_count: contextCount } });

    return withMeta({
      system: 'HKTECH AI Core',
      openclaw: 'running',
      vps: 'online',
      gateway: 'active',
      architecture: 'GitHub Pages + Firebase + VPS AI Gateway',
      mission: 'Autonomous AI Education Platform',
      uptime: process.uptime(),
      gateway_version: process.env.GATEWAY_VERSION || '1.0.0',
      agent_count: agents.length,
      context_count: contextCount,
      cron_count: crons.jobs_count || 0,
      memory_usage: {
        rss: memory.rss,
        heap_total: memory.heapTotal,
        heap_used: memory.heapUsed,
      },
      host: {
        platform: os.platform(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
      },
    });
  }

  @Get('structure')
  structure() {
    const contexts = this.runtime.loadAllContexts();
    const totalContexts = contexts.system.length + contexts.agents.length + contexts.runtime.length;
    const structure = this.runtime.getSystemStructure(totalContexts);
    this.logger.system({ action: 'system_structure', status: 'ok', metadata: { context_count: totalContexts } });
    return withMeta({ structure });
  }

  @Post('kill-switch')
  setKillSwitch(@Body() body: { enabled?: boolean }) {
    const nextValue = String(Boolean(body?.enabled));
    process.env.AI_KILL_SWITCH = nextValue;
    this.logger.system({ action: 'kill_switch_update', status: 'ok', metadata: { enabled: nextValue === 'true' } });
    return withMeta({ kill_switch: nextValue === 'true' });
  }

  @Post('run-tests')
  async runTests(@Req() req: any, @Res() res: any) {
    const key = req.headers['x-api-key'] as string | undefined;
    const result = await this.infra.runTests(req.ip || req.socket?.remoteAddress || 'unknown', key);
    return res.status(result.statusCode).send(result.payload);
  }

  @Get('infra-status')
  infraStatus() {
    return this.infra.infraStatus();
  }

  @Get('infra-logs')
  infraLogs(@Res() res: any) {
    const logs = this.infra.infraLogs();
    if (!logs) return res.status(404).type('text/plain').send('No infra logs found.');
    return res.type('text/plain').send(logs);
  }
}
