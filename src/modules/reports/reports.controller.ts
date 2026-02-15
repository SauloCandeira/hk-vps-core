import { Controller, Get } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
  ) {}

  @Get()
  list() {
    const reports = this.runtime.listReports();
    const latest = this.runtime.latestReport();
    this.logger.system({ action: 'reports_list', status: 'ok', metadata: { count: reports.length } });
    return withMeta({ reports, total_reports: reports.length, latest });
  }
}
