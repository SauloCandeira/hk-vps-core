import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3001;

// 🔐 CORS ROBUSTO (DEV + PRODUÇÃO HKTECH)
const allowedOrigins = [
  "http://localhost:5173",   // Vite dev
  "http://localhost:3000",   // React fallback
  "https://hktech.com.br",   // Produção
  "http://147.93.33.246:5173" // caso acesse via IP em dev
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true); // libera geral temporariamente (fase DEV HKTECH)
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// ⚠️ MUITO IMPORTANTE: Preflight global (resolve erro CORS do React/Vite)
app.use(express.json());

// Caminhos do OpenClaw (cérebro da IA)
const workspace = "/root/.openclaw/workspace";
const reportsPath = path.join(workspace, "reports");

// 🔥 ENDPOINT PRINCIPAL — IA TEAM (Admin Panel HKTECH)
app.get("/api/ai-team", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.json({
    platform: "HKTECH",
    system: "Autonomous AI Startup",
    timestamp: new Date(),
    agents: [
      {
        name: "Jarvis",
        role: "CEO & Orchestrator",
        status: "active"
      },
      {
        name: "Friday",
        role: "Lead Developer",
        status: "active"
      },
      {
        name: "Sentinel",
        role: "Ops & Monitoring",
        status: "monitoring"
      },
      {
        name: "Oracle",
        role: "Analyst & Reports",
        status: "scheduled"
      },
      {
        name: "Elon",
        role: "Growth & Marketing",
        status: "strategic"
      }
    ]
  });
});

// 📊 Relatório do Oracle (cron reports)
app.get("/api/reports/latest", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!fs.existsSync(reportsPath)) {
      return res.json({ message: "No reports directory yet" });
    }

    const files = fs.readdirSync(reportsPath);

    if (files.length === 0) {
      return res.json({ message: "No reports generated yet" });
    }

    const latest = files.sort().reverse()[0];
    const content = fs.readFileSync(
      path.join(reportsPath, latest),
      "utf-8"
    );

    res.json({
      file: latest,
      content
    });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ error: "Failed to read reports" });
  }
});

// 💰 Status do Sistema HKTECH (VPS + OpenClaw)
app.get("/api/system/status", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.json({
    system: "HKTECH AI Core",
    openclaw: "running",
    vps: "online",
    gateway: "active",
    architecture: "GitHub Pages + Firebase + VPS AI Gateway",
    mission: "Autonomous AI Education Platform",
    uptime: process.uptime()
  });
});

// 🧪 Healthcheck (importante para monitoramento)
app.get("/api/health", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.json({
    status: "ok",
    service: "HKTECH AI Gateway",
    port: PORT,
    timestamp: new Date()
  });
});

// Start server (bind externo para GitHub Pages acessar)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 HKTECH AI Gateway running on port ${PORT}`);
  console.log(`🌐 Public API: http://147.93.33.246:${PORT}/api/ai-team`);
});

// 📂 Diretório dos agentes OpenClaw
const agentsDir = "/root/.openclaw/agents";

// 📖 LISTAR TODOS OS SOULs
app.get("/api/agents/souls", (req, res) => {
  try {
    const agents = fs.readdirSync(agentsDir);
    
    const souls = agents.map(agent => {
      const soulPath = path.join(agentsDir, agent, "SOUL.md");
      
      if (fs.existsSync(soulPath)) {
        const content = fs.readFileSync(soulPath, "utf-8");
        return { name: agent, soul: content };
      }
      
      return { name: agent, soul: null };
    });

    res.json({ agents: souls });
  } catch (error) {
    res.status(500).json({ error: "Failed to read SOUL files" });
  }
});

// 📥 LER SOUL DE UM AGENTE
app.get("/api/agents/soul/:name", (req, res) => {
  try {
    const agentName = req.params.name.toLowerCase();
    const soulPath = path.join(agentsDir, agentName, "SOUL.md");

    if (!fs.existsSync(soulPath)) {
      return res.status(404).json({ error: "SOUL not found" });
    }

    const content = fs.readFileSync(soulPath, "utf-8");
    res.json({ name: agentName, soul: content });

  } catch (error) {
    res.status(500).json({ error: "Failed to read SOUL" });
  }
});

// ✏️ EDITAR SOUL (SINCRONIZA COM VPS)
app.post("/api/agents/soul/:name", (req, res) => {
  try {
    const agentName = req.params.name.toLowerCase();
    const { soul } = req.body;

    if (!soul) {
      return res.status(400).json({ error: "SOUL content required" });
    }

    const agentPath = path.join(agentsDir, agentName);
    const soulPath = path.join(agentPath, "SOUL.md");

    // Cria pasta do agente se não existir
    if (!fs.existsSync(agentPath)) {
      fs.mkdirSync(agentPath, { recursive: true });
    }

    // Salva o SOUL.md (fonte oficial)
    fs.writeFileSync(soulPath, soul, "utf-8");

    res.json({
      success: true,
      message: `SOUL of ${agentName} updated and synced with VPS`
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update SOUL" });
  }
});
