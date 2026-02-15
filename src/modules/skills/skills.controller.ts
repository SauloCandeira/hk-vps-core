import { Controller, Get } from '@nestjs/common';
import { withMeta } from '../../common/response';
import { LoggingService } from '../../common/logging.service';
import { RuntimeService } from '../../runtime/runtime.service';

@Controller('skills')
export class SkillsController {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly logger: LoggingService,
  ) {}

  @Get()
  list() {
    const skills = this.runtime.listSkills();
    this.logger.system({ action: 'skills_list', status: 'ok', metadata: { count: skills.scripts_count } });
    return withMeta({ skills, total_skills: skills.scripts_count });
  }
}
