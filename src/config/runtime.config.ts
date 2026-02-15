import path from 'path';

const openclawHome = process.env.OPENCLAW_HOME || '/root/.openclaw';
const workspace = process.env.OPENCLAW_WORKSPACE || path.join(openclawHome, 'workspace');

export const runtimeConfig = {
  openclawHome,
  workspace,
  agentsDir: process.env.OPENCLAW_AGENTS_DIR || path.join(openclawHome, 'agents'),
  reportsDir: process.env.OPENCLAW_REPORTS_DIR || path.join(workspace, 'reports'),
  cronDir: process.env.OPENCLAW_CRON_DIR || path.join(openclawHome, 'cron'),
  cronRunsDir: process.env.OPENCLAW_CRON_RUNS_DIR || path.join(openclawHome, 'cron', 'runs'),
  scriptsDir: process.env.OPENCLAW_SCRIPTS_DIR || path.join(workspace, 'scripts'),
  memoryDir: process.env.OPENCLAW_MEMORY_DIR || path.join(workspace, 'memory'),
  contextsDir: process.env.OPENCLAW_CONTEXTS_DIR || path.join(workspace, 'contexts'),
};

export const knownAgents = ['jarvis', 'friday', 'oracle', 'sentinel'];
export const defaultAgentStatus: Record<string, string> = {
  jarvis: 'active', friday: 'active', oracle: 'scheduled', sentinel: 'monitoring',
};
