import { Controller, Get } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';

@Controller('contexts')
export class ContextsController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
  ) {}

  @Get()
  list() {
    const contexts = this.runtime.loadAllContexts();
    const total = contexts.system.length + contexts.agents.length + contexts.runtime.length;
    this.logger.system({ action: 'contexts_load', status: 'ok', metadata: { total } });
    return withMeta({ contexts, total_contexts: total });
  }
}
