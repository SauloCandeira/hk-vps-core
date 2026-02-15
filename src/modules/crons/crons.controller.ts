import { Controller, Get } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';

@Controller('crons')
export class CronsController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
  ) {}

  @Get()
  list() {
    const crons = this.runtime.listCrons();
    this.logger.system({ action: 'crons_list', status: 'ok', metadata: { count: crons.jobs_count } });
    return withMeta({ crons, total_crons: crons.jobs_count });
  }
}
