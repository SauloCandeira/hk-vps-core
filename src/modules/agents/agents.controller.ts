import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
  ) {}

  @Get()
  list() {
    const agents = this.runtime.listAgents();
    this.logger.agent({ action: 'agents_list', status: 'ok', metadata: { count: agents.length } });
    return withMeta({ agents, total_agents: agents.length });
  }

  @Get(':name')
  detail(@Param('name') name: string) {
    const agent = this.runtime.getAgentDetail(name);
    if (!agent) {
      this.logger.agent({ action: 'agent_detail', status: 'not_found', agent: name });
      throw new NotFoundException(withMeta({ error: 'Agent not found' }));
    }

    this.logger.agent({ action: 'agent_detail', status: 'ok', agent: agent.name });
    return withMeta({ agent });
  }
}
