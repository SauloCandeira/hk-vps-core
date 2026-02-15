import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Injectable } from '@nestjs/common';
import { readFileTail } from '../common/fs-utils';

@Injectable()
export class InfraService {
  async runTests(ip: string, apiKey?: string) {
    const allowedKey = process.env.INTERNAL_API_KEY || process.env.API_KEY || '';
    if (!allowedKey || !apiKey || apiKey !== allowedKey) {
      return { statusCode: 401, payload: { error: 'Unauthorized' } };
    }

    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(cmd, ['run', 'build'], {
      encoding: 'utf-8',
      timeout: 120000,
    });

    return {
      statusCode: result.status === 0 ? 200 : 500,
      payload: {
        source_ip: ip,
        ok: result.status === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      },
    };
  }

  infraStatus() {
    const logsPath = path.resolve('/root/hktech-ai-gateway/logs');
    return {
      node: process.version,
      uptime_seconds: process.uptime(),
      memory: process.memoryUsage(),
      logs_dir_exists: fs.existsSync(logsPath),
      cwd: process.cwd(),
    };
  }

  infraLogs() {
    const candidates = [
      path.resolve('/root/hktech-ai-gateway/logs/system.log'),
      path.resolve('/root/hktech-ai-gateway/logs/agents.log'),
    ];

    const existing = candidates.find((entry) => fs.existsSync(entry));
    if (!existing) return null;
    return readFileTail(existing, 20000);
  }
}
