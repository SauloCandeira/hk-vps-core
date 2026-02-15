import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private logsDir = path.resolve('/root/hktech-ai-gateway/logs');
  private systemLogPath = path.join(this.logsDir, 'system.log');
  private agentsLogPath = path.join(this.logsDir, 'agents.log');

  private append(filePath: string, payload: object) {
    if (!fs.existsSync(this.logsDir)) fs.mkdirSync(this.logsDir, { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...payload })}\n`, 'utf-8');
  }

  system(payload: object) { this.append(this.systemLogPath, payload); }
  agent(payload: object) { this.append(this.agentsLogPath, payload); }
  error(payload: object) { this.append(this.systemLogPath, { level: 'error', ...payload }); }
}
