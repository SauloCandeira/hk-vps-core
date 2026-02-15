import path from "path";
import { openclawConfig, defaultAgentStatus, knownAgents } from "../../config/openclaw.config.js";
import {
  safeExists,
  safeListDir,
  safeReadFile,
  safeStat,
  listDirectories,
  listFilesByMtime,
  readFileTail,
  countFiles
} from "../utils/fsUtils.js";

const getAgentSoulPath = (agentName) => path.join(openclawConfig.agentsDir, agentName, "SOUL.md");

const resolveAgentStatus = (agentName) => {
  const key = agentName.toLowerCase();
  return defaultAgentStatus[key] || "unknown";
};

const getLatestActivity = (paths) => {
  const timestamps = paths
    .map((targetPath) => safeStat(targetPath))
    .filter((stat) => stat)
    .map((stat) => stat.mtimeMs);
  if (!timestamps.length) return null;
  const latest = Math.max(...timestamps);
  return new Date(latest).toISOString();
};

const getLatestSession = (agentName) => {
  const sessionsDir = path.join(openclawConfig.agentsDir, agentName, "sessions");
  if (!safeExists(sessionsDir)) return null;
  const sessions = listFilesByMtime(sessionsDir);
  if (!sessions.length) return null;
  return sessions[0];
};

export const listAgents = () => {
  const runtimeAgents = listDirectories(openclawConfig.agentsDir);
  const allAgents = Array.from(new Set([...knownAgents, ...runtimeAgents]));

  return allAgents.map((agent) => {
    const soulPath = getAgentSoulPath(agent);
    const soul = safeReadFile(soulPath);
    const latestSession = getLatestSession(agent);
    const lastActivity = getLatestActivity([
      soulPath,
      latestSession?.fullPath
    ].filter(Boolean));

    return {
      name: agent,
      status: resolveAgentStatus(agent),
      soul: soul || "",
      soul_preview: soul ? soul.slice(0, 280) : "",
      last_activity: lastActivity
    };
  });
};

export const getAgentDetail = (agentName) => {
  const normalized = agentName.toLowerCase();
  const agentDir = path.join(openclawConfig.agentsDir, normalized);
  const hasAgentDir = safeExists(agentDir);
  const soulPath = getAgentSoulPath(normalized);
  const soul = safeReadFile(soulPath) || "";
  const latestSession = getLatestSession(normalized);
  const logExcerpt = latestSession ? readFileTail(latestSession.fullPath) : null;
  const lastActivity = getLatestActivity([
    soulPath,
    latestSession?.fullPath
  ].filter(Boolean));

  if (!hasAgentDir && !soul && !knownAgents.includes(normalized)) {
    return null;
  }

  return {
    name: normalized,
    status: resolveAgentStatus(normalized),
    soul,
    last_activity: lastActivity,
    logs: latestSession
      ? {
          file: latestSession.name,
          updated_at: latestSession.stat?.mtime?.toISOString?.() || null,
          excerpt: logExcerpt || ""
        }
      : null
  };
};

export const listReports = () => {
  if (!safeExists(openclawConfig.reportsDir)) return [];
  return listFilesByMtime(openclawConfig.reportsDir).map((entry) => ({
    file: entry.name,
    updated_at: entry.stat?.mtime?.toISOString?.() || null,
    size: entry.stat?.size || 0
  }));
};

export const getLatestReport = () => {
  const reports = listReports();
  if (!reports.length) return null;
  const latest = reports[0];
  const content = safeReadFile(path.join(openclawConfig.reportsDir, latest.file)) || "";
  return {
    ...latest,
    content
  };
};

export const listCrons = () => {
  const jobsPath = path.join(openclawConfig.cronDir, "jobs.json");
  const content = safeReadFile(jobsPath);
  let jobsObj = { jobs: [] };
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        jobsObj.jobs = parsed;
      } else if (parsed && Array.isArray(parsed.jobs)) {
        jobsObj = parsed;
      }
    } catch (error) {
      jobsObj.jobs = [];
    }
  }
  return {
    jobs: jobsObj,
    jobs_count: Array.isArray(jobsObj.jobs) ? jobsObj.jobs.length : 0,
    runs_dir: openclawConfig.cronRunsDir
  };
};

export const listSkills = () => {
  const scripts = safeListDir(openclawConfig.scriptsDir);
  const toolsDocPath = path.join(openclawConfig.workspace, "TOOLS.md");
  const toolsDoc = safeReadFile(toolsDocPath);
  const filteredScripts = scripts.filter((entry) => {
    const lower = entry.toLowerCase();
    return lower.endsWith(".sh") || lower.endsWith(".js") || lower.endsWith(".ts");
  });
  return {
    scripts: filteredScripts,
    scripts_count: filteredScripts.length,
    tools_doc_path: toolsDocPath,
    tools_doc_preview: toolsDoc ? toolsDoc.slice(0, 600) : ""
  };
};

export const getSystemStructure = (contextCount = 0) => {
  const agents = listDirectories(openclawConfig.agentsDir);
  const reports = listReports();
  const skills = safeListDir(openclawConfig.scriptsDir);
  const memoryCount = countFiles(openclawConfig.memoryDir);

  return {
    paths: {
      agents: openclawConfig.agentsDir,
      reports: openclawConfig.reportsDir,
      crons: openclawConfig.cronDir,
      scripts: openclawConfig.scriptsDir,
      memory: openclawConfig.memoryDir,
      contexts: openclawConfig.contextsDir
    },
    counts: {
      agents: agents.length,
      reports: reports.length,
      skills: skills.length,
      memory_items: memoryCount,
      contexts: contextCount
    }
  };
};
