import path from 'path';
import { Injectable } from '@nestjs/common';
import { defaultAgentStatus, knownAgents, runtimeConfig } from '../config/runtime.config';
import { listDirectories, listFilesByMtime, safeExists, safeListDir, safeReadFile, safeStat } from '../common/fs-utils';

type ContextEntry = { file: string; content: string };
type ContextBuckets = { system: ContextEntry[]; agents: ContextEntry[]; runtime: ContextEntry[] };

@Injectable()
export class RuntimeService {
  listAgents() {
    const fsAgents = listDirectories(runtimeConfig.agentsDir);
    const agents = Array.from(new Set([...knownAgents, ...fsAgents])).sort();

    return agents.map((name) => {
      const soulPath = path.join(runtimeConfig.agentsDir, name, 'SOUL.md');
      return {
        name,
        status: defaultAgentStatus[name] || 'active',
        has_soul: safeExists(soulPath),
      };
    });
  }

  getAgentDetail(name: string) {
    const normalized = String(name || '').toLowerCase();
    const soulPath = path.join(runtimeConfig.agentsDir, normalized, 'SOUL.md');
    const soul = safeReadFile(soulPath);
    if (!soul) return null;

    return {
      name: normalized,
      status: defaultAgentStatus[normalized] || 'active',
      soul,
    };
  }

  loadAllContexts(): ContextBuckets {
    return {
      system: this.readContextBucket('system'),
      agents: this.readContextBucket('agents'),
      runtime: this.readContextBucket('runtime'),
    };
  }

  listCrons() {
    const jobs = safeListDir(runtimeConfig.cronDir).filter((entry) => entry.endsWith('.cron'));
    const recentRuns = listFilesByMtime(runtimeConfig.cronRunsDir).slice(0, 20).map(({ name, stat }) => ({
      file: name,
      updated_at: stat?.mtime.toISOString() || null,
    }));

    return {
      jobs,
      jobs_count: jobs.length,
      recent_runs: recentRuns,
    };
  }

  listReports() {
    return listFilesByMtime(runtimeConfig.reportsDir).map(({ name, stat }) => ({
      file: name,
      updated_at: stat?.mtime.toISOString() || null,
      size_bytes: stat?.size || 0,
    }));
  }

  latestReport() {
    const latest = this.listReports()[0];
    if (!latest) return null;
    const content = safeReadFile(path.join(runtimeConfig.reportsDir, latest.file));
    return content ? { ...latest, content } : latest;
  }

  listSkills() {
    const scripts = safeListDir(runtimeConfig.scriptsDir).filter((entry) => entry.endsWith('.sh'));
    return {
      scripts,
      scripts_count: scripts.length,
    };
  }

  getSystemStructure(totalContexts: number) {
    const dirs = [
      runtimeConfig.openclawHome,
      runtimeConfig.workspace,
      runtimeConfig.agentsDir,
      runtimeConfig.contextsDir,
      runtimeConfig.reportsDir,
      runtimeConfig.cronDir,
      runtimeConfig.scriptsDir,
      runtimeConfig.memoryDir,
    ];

    return {
      contexts_total: totalContexts,
      paths: dirs.map((entry) => ({
        path: entry,
        exists: safeExists(entry),
        type: safeStat(entry)?.isDirectory() ? 'directory' : 'file_or_missing',
      })),
    };
  }

  private readContextBucket(bucket: 'system' | 'agents' | 'runtime'): ContextEntry[] {
    const bucketDir = path.join(runtimeConfig.contextsDir, bucket);
    return safeListDir(bucketDir)
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const content = safeReadFile(path.join(bucketDir, fileName));
        return {
          file: fileName,
          content: content || '',
        };
      });
  }
}
