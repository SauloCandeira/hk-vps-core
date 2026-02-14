import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3001;

// Caminhos do OpenClaw
const workspace = "/root/.openclaw/workspace";
const agentsPath = "/root/.openclaw/agents";

// Endpoint: Status dos agentes (IA Team)
app.get("/api/agents", (req, res) => {
  const agents = [
    { name: "Jarvis", role: "CEO", status: "active" },
    { name: "Friday", role: "Developer", status: "active" },
    { name: "Sentinel", role: "Ops", status: "monitoring" },
    { name: "Oracle", role: "Analyst", status: "scheduled" },
    { name: "Elon", role: "Growth", status: "strategic" }
  ];

  res.json({
    system: "HKTECH AI TEAM",
    timestamp: new Date(),
    agents
  });
});

// Endpoint: Relatório Oracle
app.get("/api/reports/latest", (req, res) => {
  try {
    const reportDir = path.join(workspace, "reports");
    const files = fs.readdirSync(reportDir);
    const latest = files.sort().reverse()[0];

    if (!latest) {
      return res.json({ message: "No reports yet" });
    }

    const content = fs.readFileSync(
      path.join(reportDir, latest),
      "utf-8"
    );

    res.json({ file: latest, content });
  } catch (err) {
    res.json({ error: "Report not found" });
  }
});

// Endpoint: Telemetria de custos
app.get("/api/telemetry", (req, res) => {
  res.json({
    cost_estimate: "tracking",
    source: "OpenClaw Logs",
    status: "active"
  });
});

app.listen(PORT, () => {
  console.log(`HKTECH AI Gateway running on port ${PORT}`);
});
