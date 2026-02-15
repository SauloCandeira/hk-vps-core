import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { runtimeConfig } from '../../config/runtime.config';

@Controller()
export class LegacyController {
  @Get('ai-team')
  aiTeam() {
    return {
      platform: 'HKTECH',
      system: 'Autonomous AI Startup',
      timestamp: new Date(),
      agents: [
        { name: 'Jarvis', role: 'CEO & Orchestrator', status: 'active' },
        { name: 'Friday', role: 'Lead Developer', status: 'active' },
        { name: 'Sentinel', role: 'Ops & Monitoring', status: 'monitoring' },
        { name: 'Oracle', role: 'Analyst & Reports', status: 'scheduled' },
        { name: 'Elon', role: 'Growth & Marketing', status: 'strategic' },
      ],
    };
  }

  @Get('reports/latest')
  latestReport() {
    if (!fs.existsSync(runtimeConfig.reportsDir)) return { message: 'No reports directory yet' };
    const files = fs.readdirSync(runtimeConfig.reportsDir);
    if (!files.length) return { message: 'No reports generated yet' };
    const latest = files.sort().reverse()[0];
    const content = fs.readFileSync(path.join(runtimeConfig.reportsDir, latest), 'utf-8');
    return { file: latest, content };
  }

  @Get('agents/souls')
  souls() {
    const agents = fs.existsSync(runtimeConfig.agentsDir) ? fs.readdirSync(runtimeConfig.agentsDir) : [];
    return {
      agents: agents.map((agent) => {
        const soulPath = path.join(runtimeConfig.agentsDir, agent, 'SOUL.md');
        return { name: agent, soul: fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf-8') : null };
      }),
    };
  }

  @Get('agents/soul/:name')
  soul(@Param('name') name: string, @Res() res: any) {
    const soulPath = path.join(runtimeConfig.agentsDir, name.toLowerCase(), 'SOUL.md');
    if (!fs.existsSync(soulPath)) return res.status(404).send({ error: 'SOUL not found' });
    return res.send({ name: name.toLowerCase(), soul: fs.readFileSync(soulPath, 'utf-8') });
  }

  @Post('agents/soul/:name')
  upsertSoul(@Param('name') name: string, @Body() body: { soul?: string }, @Res() res: any) {
    if (!body?.soul) return res.status(400).send({ error: 'SOUL content required' });
    const agentPath = path.join(runtimeConfig.agentsDir, name.toLowerCase());
    fs.mkdirSync(agentPath, { recursive: true });
    fs.writeFileSync(path.join(agentPath, 'SOUL.md'), body.soul, 'utf-8');
    return res.send({ success: true, message: `SOUL of ${name.toLowerCase()} updated and synced with VPS` });
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'HKTECH AI Gateway',
      port: Number(process.env.PORT || 3001),
      timestamp: new Date(),
    };
  }
}
