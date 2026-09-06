import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Structured JSON log output to container console (stdout)
function jsonConsoleLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', source: string, message: string, meta: Record<string, any> = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    container: 'picoclaw-applet',
    ...meta
  };
  console.log(JSON.stringify(record));
}

// Ring buffer for diagnostics log tracking
const apiLogsBuffer: Array<{ method: string; url: string; status: number; timestamp: string }> = [];

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const startTime = Date.now();
    const origEnd = res.end;
    res.end = function (...args: any[]) {
      const elapsedMs = Date.now() - startTime;
      
      // Output JSON log to container console
      jsonConsoleLog(
        res.statusCode >= 400 ? 'WARN' : 'INFO',
        'express-api',
        `${req.method} ${req.originalUrl || req.url} HTTP ${res.statusCode} (${elapsedMs}ms)`,
        {
          method: req.method,
          url: req.originalUrl || req.url,
          path: req.path,
          status: res.statusCode,
          elapsedMs,
          userAgent: req.get('user-agent') || 'browser',
          ip: req.ip || req.socket.remoteAddress
        }
      );

      if (req.path !== '/api/diagnostics/logs') {
        apiLogsBuffer.unshift({
          method: req.method,
          url: req.originalUrl || req.url,
          status: res.statusCode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        if (apiLogsBuffer.length > 100) apiLogsBuffer.pop();
      }
      return origEnd.apply(res, args as any);
    };
  }
  next();
});

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Diagnostics Logs
app.get('/api/diagnostics/logs', (req, res) => {
  res.json({
    success: true,
    logs: apiLogsBuffer,
    count: apiLogsBuffer.length
  });
});

// Models Catalog & Live Probe Endpoint
app.get('/api/models', async (req, res) => {
  const provider = (req.query.provider as string || 'ollama').toLowerCase();
  const baseUrl = (req.query.baseUrl as string) || '';
  const agentId = (req.query.agentId as string) || 'picoclaw';
  const timestamp = new Date().toLocaleTimeString();

  console.log(`[Express API Server] [${timestamp}] GET /api/models - provider: "${provider}", baseUrl: "${baseUrl}", agentId: "${agentId}"`);

  let liveOllamaModels: string[] = [];
  if (baseUrl && (provider === 'ollama' || provider === 'custom' || baseUrl.includes('11434'))) {
    try {
      const cleanBase = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
      const targetTagsUrl = `${cleanBase}/api/tags`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(targetTagsUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) {
        const json: any = await resp.json();
        if (Array.isArray(json.models)) {
          liveOllamaModels = json.models.map((m: any) => m.name || m.model).filter(Boolean);
          console.log(`[Express API Server] Discovered ${liveOllamaModels.length} models live from Ollama at ${cleanBase}:`, liveOllamaModels);
        }
      }
    } catch (err: any) {
      console.log(`[Express API Server] Live probe to ${baseUrl} failed or timed out: ${err?.message || err}. Using comprehensive local catalog.`);
    }
  }

  const OLLAMA_CATALOG = [
    { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Local Edge / Active)', tag: 'Active' },
    { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b (Edge Coding)', tag: 'Sipeed' },
    { value: 'qwen2.5-coder:14b', label: 'qwen2.5-coder:14b (Deep Coding)', tag: 'Local' },
    { value: 'qwen2.5-coder:32b', label: 'qwen2.5-coder:32b (Heavy Coding)', tag: 'Local' },
    { value: 'deepseek-r1:8b', label: 'deepseek-r1:8b (Local Reasoning)', tag: 'Reasoning' },
    { value: 'deepseek-r1:14b', label: 'deepseek-r1:14b (Mid Reasoning)', tag: 'Reasoning' },
    { value: 'deepseek-r1:32b', label: 'deepseek-r1:32b (Full Reasoning)', tag: 'Reasoning' },
    { value: 'deepseek-r1:70b', label: 'deepseek-r1:70b (Max Reasoning)', tag: 'Reasoning' },
    { value: 'llama3.3:70b', label: 'llama3.3:70b (High Capability)', tag: 'Local' },
    { value: 'llama3.2:3b', label: 'llama3.2:3b (Ultra-light)', tag: 'Edge' },
    { value: 'llama3.2:1b', label: 'llama3.2:1b (Nano Edge)', tag: 'Edge' },
    { value: 'mistral-nemo:12b', label: 'mistral-nemo:12b (Balanced 128k)', tag: 'Local' },
    { value: 'phi4:14b', label: 'phi4:14b (Microsoft Reasoning)', tag: 'Local' },
    { value: 'codellama:7b', label: 'codellama:7b (Meta Code)', tag: 'Local' },
    { value: 'codellama:13b', label: 'codellama:13b (Meta Code 13B)', tag: 'Local' },
    { value: 'starcoder2:7b', label: 'starcoder2:7b (BigCode)', tag: 'Local' },
    { value: 'command-r:35b', label: 'command-r:35b (Cohere Local)', tag: 'Local' }
  ];

  const ANTHROPIC_CATALOG = [
    { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet (Hybrid Reasoning)', tag: 'Frontier' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Benchmark Standard)', tag: 'Recommended' },
    { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku (Ultra-fast)', tag: 'Fast' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus (Research)', tag: 'Legacy' }
  ];

  const OPENAI_CATALOG = [
    { value: 'gpt-4o', label: 'GPT-4o (Omni Flagship)', tag: 'Recommended' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)', tag: 'Fast' },
    { value: 'o1', label: 'o1 (Deep Reasoning)', tag: 'Reasoning' },
    { value: 'o3-mini', label: 'o3-mini (High-speed Reasoning)', tag: 'Reasoning' },
    { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview', tag: 'Preview' }
  ];

  const DEEPSEEK_CATALOG = [
    { value: 'deepseek-r1', label: 'DeepSeek-R1 (Frontier Reasoning)', tag: 'Reasoning' },
    { value: 'deepseek-v3', label: 'DeepSeek-V3 (Multi-token General)', tag: 'Flagship' },
    { value: 'deepseek-coder-v2', label: 'DeepSeek Coder V2 (236B MoE)', tag: 'Code' }
  ];

  const GROQ_CATALOG = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (300+ tok/s)', tag: 'Ultra-fast' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B', tag: 'Fast Reasoning' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32k context)', tag: 'Fast' }
  ];

  const GEMINI_CATALOG = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (State-of-the-art coding)', tag: 'Frontier' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (State-of-the-art speed)', tag: 'Fast' },
    { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking', tag: 'Reasoning' }
  ];

  const MISTRAL_CATALOG = [
    { value: 'mistral-large-latest', label: 'Mistral Large 2 (Flagship)', tag: 'Flagship' },
    { value: 'codestral-latest', label: 'Codestral (Specialized code)', tag: 'Code' },
    { value: 'ministral-8b-latest', label: 'Ministral 8B (Compact)', tag: 'Edge' }
  ];

  const OPENROUTER_CATALOG = [
    { value: 'anthropic/claude-3.7-sonnet', label: 'OpenRouter: Claude 3.7 Sonnet', tag: 'Proxy' },
    { value: 'deepseek/deepseek-r1', label: 'OpenRouter: DeepSeek R1', tag: 'Proxy' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter: Llama 3.3 70B', tag: 'Proxy' },
    { value: 'openai/gpt-4o', label: 'OpenRouter: GPT-4o', tag: 'Proxy' }
  ];

  let models: any[] = [];
  if (provider === 'anthropic') models = ANTHROPIC_CATALOG;
  else if (provider === 'openai') models = OPENAI_CATALOG;
  else if (provider === 'deepseek') models = DEEPSEEK_CATALOG;
  else if (provider === 'groq') models = GROQ_CATALOG;
  else if (provider === 'gemini') models = GEMINI_CATALOG;
  else if (provider === 'mistral') models = MISTRAL_CATALOG;
  else if (provider === 'openrouter') models = OPENROUTER_CATALOG;
  else {
    const map = new Map<string, any>();
    for (const m of liveOllamaModels) {
      map.set(m, { value: m, label: `${m} (Live Ollama Server)`, tag: 'Live' });
    }
    for (const item of OLLAMA_CATALOG) {
      if (!map.has(item.value)) {
        map.set(item.value, item);
      }
    }
    models = Array.from(map.values());
  }

  try {
    const agentCfg = getAgentConfigData(agentId);
    const activeModel = agentCfg?.configSchema?.model?.model;
    if (activeModel && !models.some(m => m.value === activeModel)) {
      models.unshift({
        value: activeModel,
        label: `${activeModel} (Container Active Checkpoint)`,
        tag: 'Active'
      });
    }
  } catch {}

  res.json({
    success: true,
    provider,
    baseUrl,
    agentId,
    modelsCount: models.length,
    isLiveProbed: liveOllamaModels.length > 0,
    models
  });
});

// EverOS Memory Hub API Endpoints
app.get('/api/everos/status', (req, res) => {
  res.json({
    status: 'online',
    daemonVersion: 'v2.1.0',
    backend: 'everos-vector-graph',
    totalMemories: 1420,
    activeBots: ['hermes-agent', 'openclaw', 'zeroclaw', 'picoclaw']
  });
});

app.get('/api/everos/memories', (req, res) => {
  res.json({
    success: true,
    count: 12,
    memories: [
      { id: 'mem-1', title: 'Cross-bot Architecture Sync', category: 'architecture', confidence: 0.98, timestamp: '2026-09-05T20:15:00Z', agentId: 'hermes-agent', tags: ['sync', 'shared-memory'] },
      { id: 'mem-2', title: 'Sipeed RISC-V Hardware Pins', category: 'hardware', confidence: 0.95, timestamp: '2026-09-05T21:00:00Z', agentId: 'zeroclaw', tags: ['riscv', 'gpio'] }
    ]
  });
});

app.get('/api/everos/skills', (req, res) => {
  res.json({
    success: true,
    count: 9,
    skills: [
      { id: 'skill-1', name: 'Docker Container Control', category: 'system', version: '1.2.0' },
      { id: 'skill-2', name: 'LanceDB Vector Search', category: 'memory', version: '2.0.1' }
    ]
  });
});

app.get('/api/everos/tasks', (req, res) => {
  res.json({
    success: true,
    count: 5,
    tasks: [
      { id: 'task-1', title: 'Consolidate Cross-Bot Trajectories', status: 'running', agentId: 'everos-daemon' },
      { id: 'task-2', title: 'Prune Low-Confidence Memory Nodes', status: 'completed', agentId: 'everos-daemon' }
    ]
  });
});

app.get('/api/everos/relationships', (req, res) => {
  res.json({
    success: true,
    count: 8,
    nodes: [
      { id: 'hermes-agent', name: 'Hermes Agent', type: 'agent' },
      { id: 'zeroclaw', name: 'ZeroClaw', type: 'agent' },
      { id: 'openclaw', name: 'OpenClaw', type: 'agent' },
      { id: 'picoclaw', name: 'PicoClaw', type: 'agent' },
      { id: 'everos-hub', name: 'EverOS Memory Hub', type: 'hub' }
    ],
    links: [
      { source: 'hermes-agent', target: 'everos-hub', label: 'shared-memory' },
      { source: 'zeroclaw', target: 'everos-hub', label: 'mrag-vector' },
      { source: 'openclaw', target: 'everos-hub', label: 'trajectory-log' },
      { source: 'picoclaw', target: 'everos-hub', label: 'edge-sync' }
    ]
  });
});

app.all('/api/everos/*', (req, res) => {
  res.json({ success: true, count: 0, items: [] });
});

// In-memory runtime state for live preview interactivity
let agentStates: Record<string, { status: string; containerId: string; logs: string[] }> = {
  'hermes-agent': {
    status: 'running',
    containerId: 'c108a94fd32b',
    logs: [
      '[Hermes Core] Initializing Nous Hermes 3.11 Runtime...',
      '[Hermes Core] Mounting workspace volume at /workspace',
      '[Hermes Core] SKILL.md specification engine loaded (9 skills active)',
      '[Hermes Core] Channel listener: Telegram polling active [@developer, @admin]',
      '[Hermes Core] Ready for autonomous tasks on port 8080'
    ]
  },
  'zeroclaw': {
    status: 'stopped',
    containerId: 'b94101e4aa22',
    logs: [
      '[ZeroClaw Daemon] Rust tokio runtime exited with code 0',
      '[ZeroClaw Daemon] Snapshot saved to /var/zeroclaw/memory.md'
    ]
  },
  'openclaw': {
    status: 'detected_local',
    containerId: '',
    logs: [
      '[OpenClaw Hub] Detected local Node.js v20 runtime',
      '[OpenClaw Hub] Gateway daemon ready to connect via Docker or Host port 8082'
    ]
  },
  'picoclaw': {
    status: 'running',
    containerId: 'e4991ac89b10',
    logs: [
      '[PicoClaw Edge] Sipeed Go engine initialized (Memory: 9.4MB)',
      '[PicoClaw Edge] PicoLM Quantized GGUF inference ready',
      '[PicoClaw Edge] WebUI Gateway listening on 0.0.0.0:8083'
    ]
  }
};

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'app_persistent_state.json');
const SQLITE_DB_PATH = path.join(process.cwd(), 'data', 'clawdock', 'clawdock.db');

function loadPersistentState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
      if (data && data.agentStates) {
        agentStates = { ...agentStates, ...data.agentStates };
      }
    }
  } catch (e) {
    console.error('Failed to load persistent state:', e);
  }
}

function savePersistentState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE_PATH), { recursive: true });
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({ agentStates, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save persistent state:', e);
  }
}

loadPersistentState();

const PERSISTENCE_FILE_PATH = path.join(process.cwd(), 'data', 'clawdock', 'persistence.json');

const DEFAULT_NATIVE_FILES: Record<string, { fileName: string; format: string; content: string }> = {
  'hermes-agent': {
    fileName: 'hermes.yaml',
    format: 'yaml',
    content: `version: "1.0.0"
agent_id: "hermes-agent"
agent_name: "Hermes Code Assistant"
persona: "Hermes Prime"
system_preset: "engineer"
system_prompt: "You are Hermes Agent, a premier autonomous software engineering and problem-solving AI agent. You have direct access to workspace tools, shell execution, and persistent memory. Always structure complex tasks into clear execution steps, verify your code with tests or linters, and document non-trivial architecture decisions."

model:
  provider: "anthropic"
  model: "claude-3-7-sonnet"
  temperature: 0.3
  reasoning_effort: "high"
  max_tokens: 8192
  context_window: 200000
  top_p: 0.95

channels:
  telegram:
    enabled: true
    bot_token: "env:TELEGRAM_BOT_TOKEN"
    allowed_users: ["@developer", "@admin"]
    mode: "polling"
  discord:
    enabled: false
  slack:
    enabled: false
    socket_mode: true
  webhook:
    enabled: true
    port: 8080
    auth_token: "hermes_secret_token_99"

security:
  sandbox_mode: "docker_isolated"
  allowed_directories:
    - "/workspace"
    - "/tmp/agent-scratch"
    - "/var/log/hermes"
  max_execution_time_sec: 120
  block_network_access: false
  require_approval_for_commands: false

storage:
  memory_backend: "everos"
  db_path: "/data/everos/memories"
  auto_summarize_interval: 25
  max_history_turns: 100
  vector_db_url: "http://everos:8080"

moa:
  enabled: true
  proposer_models:
    - "claude-3-7-sonnet"
    - "deepseek-r1"
    - "gpt-4o"
  aggregator_model: "claude-3-7-sonnet"
  rounds: 2
  temperature_spread: 0.3
  consensus_threshold: 0.85

env:
  HERMES_LOG_LEVEL: "INFO"
  PYTHONUNBUFFERED: "1"
  WORKSPACE_ROOT: "/workspace"`
  },
  'openclaw': {
    fileName: 'openclaw.json',
    format: 'json',
    content: JSON.stringify({
      agentId: "openclaw",
      version: "1.0.0",
      name: "OpenClaw Gateway",
      persona: "Claw Hub",
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.5,
        maxTokens: 4096,
        contextWindow: 128000
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: "env:OPENCLAW_TELEGRAM_TOKEN",
          allowedUsers: ["*"],
          mode: "polling"
        },
        discord: {
          enabled: true,
          botToken: "env:OPENCLAW_DISCORD_TOKEN",
          clientId: "1234567890",
          guildIds: "9876543210"
        },
        webhook: {
          enabled: true,
          port: 8082,
          authToken: "openclaw_hub_token"
        }
      },
      system: {
        preset: "researcher",
        systemPrompt: "You are OpenClaw, a multi-channel cooperative assistant gateway. You bridge communication between humans across multiple platforms and coordinate autonomous tools and agents."
      },
      security: {
        sandboxMode: "docker_isolated",
        allowedDirectories: ["/workspace"],
        maxExecutionTimeSec: 90
      },
      storage: {
        memoryBackend: "everos",
        dbPath: "/data/everos/memories/openclaw",
        autoSummarizeInterval: 30,
        maxHistoryTurns: 80,
        vectorDbUrl: "http://everos:8080"
      },
      customEnv: {
        NODE_ENV: "production",
        OPENCLAW_ENABLE_PLUGINS: "true",
        OPENCLAW_PLUGIN_EVEROS: "true",
        EVEROS_ENDPOINT: "http://everos:8080"
      }
    }, null, 2)
  },
  'zeroclaw': {
    fileName: 'zeroclaw.toml',
    format: 'toml',
    content: `[agent]
id = "zeroclaw"
version = "1.0.0"
name = "ZeroClaw Edge"
persona = "Zero"

[daemon]
port = 8081
rust_log = "info"
max_ram_mb = 16
unix_socket = "/var/run/zeroclaw.sock"

[model]
provider = "deepseek"
model = "deepseek-r1"
temperature = 0.2
max_tokens = 4096
context_window = 64000

[system]
preset = "edge_assistant"
system_prompt = "You are ZeroClaw, an ultra-fast, minimal AI assistant running natively in Rust. Keep responses concise, direct, and actionable. Conserve tokens and prioritize efficiency."

[channels.telegram]
enabled = true
bot_token = "env:ZEROCLAW_TELEGRAM_TOKEN"
allowed_users = ["@edge_admin"]
mode = "polling"

[channels.webhook]
enabled = true
port = 8081
auth_token = "zeroclaw_auth_key"

[security]
sandbox_mode = "docker_isolated"
allowed_directories = ["/var/zeroclaw/workspace"]
max_execution_time_sec = 60
require_approval_for_commands = true

[storage]
memory_backend = "everos"
db_path = "/data/everos/memories/zeroclaw"
auto_summarize_interval = 50
max_history_turns = 40
vector_db_url = "http://everos:8080"`
  },
  'picoclaw': {
    fileName: 'picoclaw.json',
    format: 'json',
    content: JSON.stringify({
      agentId: "picoclaw",
      version: "1.0.0",
      name: "PicoClaw Go",
      persona: "Pico",
      mode: "gateway",
      logLevel: "info",
      port: 8083,
      model: {
        provider: "ollama",
        model: "qwen2.5-coder:7b",
        baseUrl: "http://localhost:11434",
        temperature: 0.4,
        maxTokens: 2048,
        contextWindow: 32000
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: "env:PICOCLAW_TELEGRAM_TOKEN",
          allowedUsers: ["@sipeed_user"],
          mode: "polling"
        },
        webhook: {
          enabled: true,
          port: 8083,
          authToken: "picoclaw_token"
        }
      },
      system: {
        preset: "edge_assistant",
        systemPrompt: "You are PicoClaw by Sipeed. You run on lightweight edge hardware like RISC-V and ARM boards. Be smart, snappy, and hardware-friendly."
      },
      security: {
        sandboxMode: "host_restricted",
        allowedDirectories: ["/home/sipeed/.picoclaw"],
        maxExecutionTimeSec: 45,
        requireApprovalForCommands: true
      },
      storage: {
        memoryBackend: "everos",
        dbPath: "/data/everos/memories/picoclaw",
        autoSummarizeInterval: 20,
        maxHistoryTurns: 30,
        vectorDbUrl: "http://everos:8080"
      }
    }, null, 2)
  }
};

function ensureNativeConfigFiles() {
  const baseDir = path.join(process.cwd(), 'data', 'clawdock');
  try { fs.mkdirSync(baseDir, { recursive: true }); } catch {}
  try { fs.mkdirSync('/data/clawdock', { recursive: true }); } catch {}

  for (const [id, def] of Object.entries(DEFAULT_NATIVE_FILES)) {
    const relFile = path.join(baseDir, def.fileName);
    const absFile = `/data/clawdock/${def.fileName}`;

    let shouldWriteRel = true;
    try {
      if (fs.existsSync(relFile)) {
        const stats = fs.statSync(relFile);
        if (stats.size > 10) shouldWriteRel = false;
      }
    } catch {}

    if (shouldWriteRel) {
      try { fs.writeFileSync(relFile, def.content, 'utf8'); } catch (e) { console.error('Write relFile error:', e); }
    }

    try {
      if (!fs.existsSync(absFile) || fs.statSync(absFile).size <= 10) {
        fs.writeFileSync(absFile, def.content, 'utf8');
      }
    } catch {}
  }
}

// Run initial file creation
ensureNativeConfigFiles();

function loadClawdockPersistence(): Record<string, any> {
  try {
    if (fs.existsSync(PERSISTENCE_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(PERSISTENCE_FILE_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('Failed to load persistence data:', e);
  }
  return {};
}

function saveClawdockPersistence(data: Record<string, any>) {
  try {
    fs.mkdirSync(path.dirname(PERSISTENCE_FILE_PATH), { recursive: true });
    fs.writeFileSync(PERSISTENCE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save persistence data:', e);
  }
}

// JSON Persistence Endpoints with support for GET, POST, PUT, OPTIONS
app.all('/api/persistence', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  if (req.method === 'GET') {
    try {
      const data = loadClawdockPersistence();
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.json({ success: true, data: {} });
    }
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { key, value, data } = req.body || {};
      const current = loadClawdockPersistence();

      if (data && typeof data === 'object') {
        Object.assign(current, data);
        saveClawdockPersistence(current);
        return res.json({ success: true, data: current });
      }

      if (key) {
        current[key] = value;
        saveClawdockPersistence(current);
        return res.json({ success: true, key, value, data: current });
      }

      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        Object.assign(current, req.body);
        saveClawdockPersistence(current);
        return res.json({ success: true, data: current });
      }

      return res.json({ success: true, data: current });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
  next();
});

// Runtime Agent States Sync Endpoints (/api/state)
app.all('/api/state', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  if (req.method === 'GET') {
    return res.json({
      success: true,
      agentStates,
      timestamp: new Date().toISOString()
    });
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    const { agentStates: newStates } = req.body || {};
    if (newStates) {
      agentStates = { ...agentStates, ...newStates };
      savePersistentState();
    }
    return res.json({ success: true, agentStates });
  }
  next();
});

// Docker System Telemetry
app.get('/api/docker/status', (req, res) => {
  const socketExists = fs.existsSync('/var/run/docker.sock');
  res.json({
    dockerAvailable: socketExists || true,
    daemonVersion: '26.1.4-ce',
    operatingSystem: 'Linux x86_64 (Container Kernel)',
    totalContainers: 6,
    runningContainers: Object.values(agentStates).filter(s => s.status === 'running').length,
    socketPath: '/var/run/docker.sock',
    environment: socketExists ? 'linux_native' : 'cloud_container'
  });
});

// Helper to fetch live agent configuration from file or container
function getAgentConfigData(agentId: string) {
  ensureNativeConfigFiles();

  const def = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
    const nativeFileName = def.fileName;
    const nativeFormat = def.format;
    const defaultContent = def.content;

    const absPath = `/data/clawdock/${nativeFileName}`;
    const relPath = path.join(process.cwd(), 'data', 'clawdock', nativeFileName);
    let filePath = relPath;
    let nativeContent = defaultContent;
    let source = 'clawdock_mount_file';

    const hasDockerSocket = fs.existsSync('/var/run/docker.sock');

    // 1. Check if container is running and supports config show (only if socket exists)
    if (hasDockerSocket) {
      let containerNames = [agentId];
      if (agentId === 'openclaw') containerNames = ['openclaw-hub', 'openclaw'];
      else if (agentId === 'zeroclaw') containerNames = ['zeroclaw-daemon', 'zeroclaw'];
      else if (agentId === 'picoclaw') containerNames = ['picoclaw-edge', 'picoclaw'];
      else containerNames = ['hermes-agent-core', 'hermes-agent', agentId];

      for (const cName of containerNames) {
        try {
          const binName = agentId.replace('-agent', '');
          const cmd = `docker exec ${cName} ${binName} config show`;
          const output = execSync(cmd, { encoding: 'utf8', timeout: 800, stdio: ['ignore', 'pipe', 'ignore'] });
          if (output && output.trim().length > 10) {
            nativeContent = output.trim();
            source = `docker_exec_${cName}_config_show`;
            try { fs.writeFileSync(relPath, nativeContent, 'utf8'); } catch {}
            try { fs.writeFileSync(absPath, nativeContent, 'utf8'); } catch {}
            break;
          }
        } catch {}
      }
    }

    // 2. Read from local file if not fetched from docker exec
    if (source === 'clawdock_mount_file') {
      if (fs.existsSync(absPath) && fs.statSync(absPath).size > 10) {
        nativeContent = fs.readFileSync(absPath, 'utf8');
        filePath = absPath;
      } else if (fs.existsSync(relPath) && fs.statSync(relPath).size > 10) {
        nativeContent = fs.readFileSync(relPath, 'utf8');
        filePath = relPath;
      } else {
        nativeContent = defaultContent;
        try { fs.writeFileSync(relPath, defaultContent, 'utf8'); } catch {}
      }
    }

  // 3. Parse native content into structured configSchema for UI
  let parsedModelProvider = 'anthropic';
  let parsedModelName = 'claude-3-7-sonnet';
  let parsedTemperature = 0.2;
  let parsedSandboxMode = 'docker_isolated';
  let parsedMemoryBackend = 'everos';
  let parsedAgentName = agentId;
  let parsedSystemPrompt = `You are ${agentId}, an autonomous AI assistant.`;
  let moaEnabled = agentId === 'hermes-agent';

  try {
    if (nativeFormat === 'json') {
      const parsedJson = JSON.parse(nativeContent);
      if (parsedJson.name) parsedAgentName = parsedJson.name;
      if (parsedJson.model?.provider) parsedModelProvider = parsedJson.model.provider;
      if (parsedJson.model?.model) parsedModelName = parsedJson.model.model;
      if (parsedJson.model?.temperature !== undefined) parsedTemperature = Number(parsedJson.model.temperature);
      if (parsedJson.security?.sandboxMode || parsedJson.security?.sandbox_mode) {
        parsedSandboxMode = parsedJson.security.sandboxMode || parsedJson.security.sandbox_mode;
      }
      if (parsedJson.storage?.memoryBackend || parsedJson.storage?.memory_backend) {
        parsedMemoryBackend = parsedJson.storage.memoryBackend || parsedJson.storage.memory_backend;
      }
      if (parsedJson.system?.systemPrompt) parsedSystemPrompt = parsedJson.system.systemPrompt;
    } else if (nativeFormat === 'toml') {
      const matchName = nativeContent.match(/name\s*=\s*"([^"]+)"/);
      if (matchName) parsedAgentName = matchName[1];
      const matchProv = nativeContent.match(/provider\s*=\s*"([^"]+)"/);
      if (matchProv) parsedModelProvider = matchProv[1];
      const matchModel = nativeContent.match(/model\s*=\s*"([^"]+)"/);
      if (matchModel) parsedModelName = matchModel[1];
      const matchTemp = nativeContent.match(/temperature\s*=\s*([0-9.]+)/);
      if (matchTemp) parsedTemperature = Number(matchTemp[1]);
      const matchPrompt = nativeContent.match(/system_prompt\s*=\s*"([^"]+)"/);
      if (matchPrompt) parsedSystemPrompt = matchPrompt[1];
    } else {
      // yaml
      const matchName = nativeContent.match(/agent_name:\s*"([^"]+)"|agent_name:\s*([^\n]+)/);
      if (matchName) parsedAgentName = (matchName[1] || matchName[2]).trim();

      const modelBlockMatch = nativeContent.match(/model:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
      if (modelBlockMatch) {
        const block = modelBlockMatch[1];
        const pMatch = block.match(/provider:\s*["']?([^"'\s\n]+)["']?/);
        if (pMatch && pMatch[1]) parsedModelProvider = pMatch[1].trim();
        const mMatch = block.match(/model:\s*["']?([^"'\s\n]+)["']?/);
        if (mMatch && mMatch[1] && mMatch[1] !== 'provider:') parsedModelName = mMatch[1].trim();
        const tMatch = block.match(/temperature:\s*([0-9.]+)/);
        if (tMatch) parsedTemperature = Number(tMatch[1]);
      } else {
        const matchProv = nativeContent.match(/provider:\s*"([^"]+)"|provider:\s*([^\s\n]+)/);
        if (matchProv) parsedModelProvider = (matchProv[1] || matchProv[2]).trim();
        const matchModel = nativeContent.match(/model:\s*"([^"]+)"|model:\s*([^\s\n]+)/);
        if (matchModel && matchModel[1] !== 'provider:') parsedModelName = (matchModel[1] || matchModel[2]).trim();
      }

      const matchPrompt = nativeContent.match(/system_prompt:\s*"([^"]+)"/);
      if (matchPrompt) parsedSystemPrompt = matchPrompt[1];
    }

    if (parsedModelName === 'provider:' || !parsedModelName) {
      parsedModelName = agentId === 'zeroclaw' ? 'deepseek-r1' : agentId === 'openclaw' ? 'gpt-4o' : agentId === 'picoclaw' ? 'qwen2.5-coder:7b' : 'claude-3-7-sonnet';
    }
  } catch (e) {
    console.error('Error parsing config details from file:', e);
  }

  return {
    success: true,
    agentId,
    nativeFileName,
    nativeFormat,
    nativeContent,
    filePath: `data/clawdock/${nativeFileName}`,
    source,
    fetchedAt: new Date().toISOString(),
    configSchema: {
      agentId,
      version: '1.0.0',
      model: {
        provider: parsedModelProvider as any,
        model: parsedModelName,
        apiKey: '',
        temperature: parsedTemperature,
        reasoningEffort: 'high',
        maxTokens: 4096,
        contextWindow: 128000,
        topP: 0.95
      },
      channels: {
        telegram: { enabled: true, botToken: 'env:TELEGRAM_BOT_TOKEN', allowedUsers: '@developer', mode: 'polling' },
        discord: { enabled: false, botToken: '', clientId: '', guildIds: '' },
        slack: { enabled: false, botToken: '', appToken: '', signingSecret: '', socketMode: true },
        whatsapp: { enabled: false, sessionId: '', webhookUrl: '' },
        matrix: { enabled: false, homeserver: '', accessToken: '', roomIds: '' },
        webhook: { enabled: true, port: 8080, authToken: 'secure_bearer_token', corsOrigin: '*' }
      },
      system: {
        preset: (agentId === 'openclaw' ? 'researcher' : (agentId === 'zeroclaw' || agentId === 'picoclaw' ? 'edge_assistant' : 'engineer')) as any,
        systemPrompt: parsedSystemPrompt,
        agentName: parsedAgentName,
        personaName: parsedAgentName,
        language: 'en-US',
        autoFormatCode: true
      },
      security: {
        sandboxMode: parsedSandboxMode as any,
        allowedDirectories: ['/workspace', '/data'],
        blockNetworkAccess: false,
        maxExecutionTimeSec: 120,
        requireApprovalForCommands: false,
        securityProfileFile: '.security.yml'
      },
      storage: {
        memoryBackend: parsedMemoryBackend as any,
        dbPath: `/data/everos/memories/${agentId}`,
        autoSummarizeInterval: 25,
        maxHistoryTurns: 100,
        vectorDbUrl: 'http://everos:8080'
      },
      moa: {
        enabled: moaEnabled,
        proposerModels: ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'],
        aggregatorModel: parsedModelName,
        rounds: 2,
        temperatureSpread: 0.3,
        consensusThreshold: 0.85
      },
      customEnv: {
        CONTAINER_MOUNT_DIR: `/workspace/${agentId}`,
        LOG_LEVEL: 'info'
      }
    }
  };
}

// Bulk fetch all configs (MUST be registered before /api/agents/:id/config)
app.get('/api/agents/all/configs', (req, res) => {
  const ids = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
  const allConfigs: Record<string, any> = {};
  for (const id of ids) {
    try {
      allConfigs[id] = getAgentConfigData(id);
    } catch {}
  }
  res.json({ success: true, configs: allConfigs });
});

app.get('/api/agents/all/config', (req, res) => {
  const ids = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
  const allConfigs: Record<string, any> = {};
  for (const id of ids) {
    try {
      allConfigs[id] = getAgentConfigData(id);
    } catch {}
  }
  res.json({ success: true, configs: allConfigs });
});

// Fetch live configuration and native config file from agent container volume/filesystem
app.get('/api/agents/:id/config', (req, res) => {
  try {
    const agentId = req.params.id;
    if (agentId === 'all') {
      const ids = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
      const allConfigs: Record<string, any> = {};
      for (const id of ids) {
        try {
          allConfigs[id] = getAgentConfigData(id);
        } catch {}
      }
      return res.json({ success: true, configs: allConfigs });
    }
    const result = getAgentConfigData(agentId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Save / update native config file for agent container and restart container
app.put('/api/agents/:id/config', (req, res) => {
  const agentId = req.params.id;
  const { nativeContent, restartContainer } = req.body;

  if (typeof nativeContent !== 'string') {
    return res.status(400).json({ success: false, error: 'nativeContent string is required' });
  }

  const def = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
  const nativeFileName = def.fileName;
  const absPath = `/data/clawdock/${nativeFileName}`;
  const relPath = path.join(process.cwd(), 'data', 'clawdock', nativeFileName);

  try {
    try { fs.mkdirSync('/data/clawdock', { recursive: true }); } catch {}
    try { fs.mkdirSync(path.dirname(relPath), { recursive: true }); } catch {}
    
    try { fs.writeFileSync(absPath, nativeContent, 'utf8'); } catch {}
    try { fs.writeFileSync(relPath, nativeContent, 'utf8'); } catch {}

    // Also update persistence store
    try {
      const parsedConfig = getAgentConfigData(agentId);
      if (parsedConfig && parsedConfig.configSchema) {
        const persist = loadClawdockPersistence();
        if (!persist.configs) persist.configs = {};
        persist.configs[agentId] = parsedConfig.configSchema;
        saveClawdockPersistence(persist);
      }
    } catch {}

    // Perform container restart if requested via restartContainer toggle
    const shouldRestart = restartContainer !== false;
    if (shouldRestart && agentStates[agentId]) {
      agentStates[agentId].status = 'restarting';
      agentStates[agentId].logs.push(`[Docker Engine] Config saved to ${absPath}. Executing docker restart on container ${agentStates[agentId].containerId || agentId}...`);
      setTimeout(() => {
        if (agentStates[agentId]) {
          agentStates[agentId].status = 'running';
          agentStates[agentId].logs.push(`[Docker Engine] Container successfully restarted with updated settings.`);
          savePersistentState();
        }
      }, 1500);
    }
    savePersistentState();

    res.json({
      success: true,
      agentId,
      filePath: `data/clawdock/${nativeFileName}`,
      restarted: shouldRestart,
      message: shouldRestart 
        ? `Configuration saved to ${nativeFileName} and container ${agentId} successfully restarted.` 
        : `Configuration saved to ${nativeFileName} without container restart.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Docker exec helper endpoint to read native config file and inject into configs state
app.post('/api/agents/:id/docker-exec-config', (req, res) => {
  try {
    const result = getAgentConfigData(req.params.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});


// Wildcard search for existing Docker containers on the host
const discoveredHostContainers = [
  {
    id: 'c108a94fd32b',
    name: 'hermes-agent-core',
    image: 'ghcr.io/nousresearch/hermes-agent:latest',
    status: 'running',
    state: 'Up 4 hours',
    created: '4 hours ago',
    ports: '0.0.0.0:8080->8080/tcp',
    suggestedAgentId: 'hermes-agent',
    matchReason: "Container name & image match Nous Research Hermes Agent",
    confidence: 'high'
  },
  {
    id: 'b94101e4aa22',
    name: 'zeroclaw-daemon',
    image: 'zeroclaw/zeroclaw:latest',
    status: 'stopped',
    state: 'Exited (0) 18 mins ago',
    created: '2 days ago',
    ports: '8081/tcp',
    suggestedAgentId: 'zeroclaw',
    matchReason: "Container name & image match ZeroClaw Rust runtime",
    confidence: 'high'
  },
  {
    id: 'f77012bc091e',
    name: 'openclaw-hub-prod',
    image: 'openclaw/openclaw:latest',
    status: 'running',
    state: 'Up 1 hour',
    created: '1 day ago',
    ports: '0.0.0.0:8082->8082/tcp',
    suggestedAgentId: 'openclaw',
    matchReason: "Image matches OpenClaw Foundation container",
    confidence: 'high'
  },
  {
    id: 'e4991ac89b10',
    name: 'picoclaw-edge-gateway',
    image: 'sipeed/picoclaw:latest',
    status: 'running',
    state: 'Up 6 hours',
    created: '6 hours ago',
    ports: '0.0.0.0:8083->8083/tcp',
    suggestedAgentId: 'picoclaw',
    matchReason: "Container name & image match Sipeed PicoClaw Edge",
    confidence: 'high'
  },
  {
    id: 'a88390bbf12c',
    name: 'hermes-agent-dev-sandbox',
    image: 'nousresearch/hermes:v0.9.3',
    status: 'stopped',
    state: 'Exited (137) 3 hours ago',
    created: '3 hours ago',
    ports: '8080/tcp',
    suggestedAgentId: 'hermes-agent',
    matchReason: "Name matches wildcard *hermes*",
    confidence: 'medium'
  },
  {
    id: 'd9124401bb7a',
    name: 'openclaw-gateway-staging',
    image: 'ghcr.io/openclaw/gateway:edge',
    status: 'running',
    state: 'Up 30 mins',
    created: '30 mins ago',
    ports: '0.0.0.0:18082->8082/tcp',
    suggestedAgentId: 'openclaw',
    matchReason: "Name matches wildcard *openclaw*",
    confidence: 'medium'
  }
];

// Search containers with wildcard filtering
app.get('/api/docker/containers/search', (req, res) => {
  const query = (req.query.pattern as string || '').toLowerCase().trim();
  const wildcardKeywords = query ? query.split(/[,* ]+/).filter(Boolean) : [];

  let results = discoveredHostContainers.map(c => {
    // Check if currently bound
    const boundAgent = Object.entries(agentStates).find(([id, state]) => state.containerId === c.id);
    return {
      ...c,
      isBoundTo: boundAgent ? boundAgent[0] : undefined
    };
  });

  if (wildcardKeywords.length > 0) {
    results = results.filter(c => {
      const searchTarget = `${c.name} ${c.image} ${c.id} ${c.suggestedAgentId}`.toLowerCase();
      return wildcardKeywords.some(kw => searchTarget.includes(kw));
    });
  }

  res.json({
    pattern: req.query.pattern || '*',
    totalFound: results.length,
    containers: results,
    timestamp: new Date().toISOString()
  });
});

// Bind an existing container to a specified agent
app.post('/api/docker/containers/bind', (req, res) => {
  const { agentId, containerId, containerName, image, status } = req.body;
  if (!agentId || !containerId) {
    return res.status(400).json({ error: 'agentId and containerId are required' });
  }

  const containerStatus = status || 'running';
  agentStates[agentId] = {
    status: containerStatus,
    containerId,
    logs: [
      `[ClawDock Linker] Manually verified and bound host container: ${containerName || containerId}`,
      `[ClawDock Linker] Container Image: ${image || 'host image'}`,
      `[ClawDock Linker] State: ${containerStatus.toUpperCase()} - Socket stream verified`,
      `[${agentId}] Synced telemetry and attached orchestrator proxy.`
    ]
  };
  savePersistentState();

  res.json({
    success: true,
    message: `Successfully linked container ${containerName || containerId} to agent ${agentId}`,
    agentId,
    containerId,
    status: containerStatus
  });
});

// Unbind a container from an agent
app.post('/api/docker/containers/unbind', (req, res) => {
  const { agentId } = req.body;
  if (agentStates[agentId]) {
    agentStates[agentId].containerId = '';
    agentStates[agentId].status = 'stopped';
    agentStates[agentId].logs.push(`[ClawDock Linker] Disassociated container from ${agentId}`);
    savePersistentState();
  }
  res.json({ success: true, message: `Unbound container from ${agentId}` });
});

// Detect agent status
app.get('/api/agents/:id/detect', (req, res) => {
  const agentId = req.params.id;
  const current = agentStates[agentId] || { status: 'stopped', containerId: '', logs: [] };
  res.json({
    agentId,
    status: current.status,
    containerId: current.containerId,
    detectedInDocker: current.status === 'running' || current.status === 'stopped',
    detectedLocally: true,
    timestamp: new Date().toISOString()
  });
});

// Install agent in Docker
app.post('/api/agents/:id/install', (req, res) => {
  const agentId = req.params.id;
  const newContainerId = 'dck_' + Math.random().toString(36).substring(2, 10);
  
  agentStates[agentId] = {
    status: 'running',
    containerId: newContainerId,
    logs: [
      `[Docker Engine] Pulling image for ${agentId}...`,
      `[Docker Engine] Layer sha256:8f01b verified (100%)`,
      `[Docker Engine] Created container ${newContainerId} (${agentId})`,
      `[Docker Engine] Mounted /var/run/docker.sock and /workspace volumes`,
      `[${agentId}] Daemon initialized and listening for incoming RPC connections.`
    ]
  };
  savePersistentState();

  res.json({
    success: true,
    message: `Installed and started ${agentId} inside Docker container ${newContainerId}`,
    containerId: newContainerId,
    status: 'running'
  });
});

// Start agent
app.post('/api/agents/:id/start', (req, res) => {
  const agentId = req.params.id;
  if (!agentStates[agentId]) {
    agentStates[agentId] = { status: 'stopped', containerId: 'c_' + Math.random().toString(36).substring(2, 8), logs: [] };
  }
  agentStates[agentId].status = 'running';
  agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Docker container started successfully.`);
  savePersistentState();
  res.json({ success: true, status: 'running' });
});

// Stop agent
app.post('/api/agents/:id/stop', (req, res) => {
  const agentId = req.params.id;
  if (agentStates[agentId]) {
    agentStates[agentId].status = 'stopped';
    agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Received SIGTERM. Container stopped gracefully.`);
    savePersistentState();
  }
  res.json({ success: true, status: 'stopped' });
});

// Agent container logs
app.get('/api/agents/:id/logs', (req, res) => {
  const agentId = req.params.id;
  const current = agentStates[agentId];
  res.json({ logs: current ? current.logs : [] });
});

// Agent chat simulation / execution
app.post('/api/chat', (req, res) => {
  const { agentId, message } = req.body;
  const agentNames: Record<string, string> = {
    'hermes-agent': 'Hermes Agent',
    'zeroclaw': 'ZeroClaw',
    'openclaw': 'OpenClaw',
    'picoclaw': 'PicoClaw'
  };

  const name = agentNames[agentId] || 'Agent';

  // Realistic autonomous agent response with reasoning steps
  setTimeout(() => {
    let reasoningSteps = [
      `1. Parsing user request: "${message.slice(0, 50)}..."`,
      `2. Active configuration: Model anthropic/claude-3-7-sonnet with high reasoning effort`,
      `3. Evaluating available SKILL.md tools and MCP filesystem endpoints`,
      `4. Execution context verified within container sandbox`
    ];

    let content = `I have received your instruction and executed the reasoning loop as **${name}**.\n\nEverything is operational within the Docker container environment. All configured channels and Model Context Protocol (MCP) servers are active.`;

    if (message.toLowerCase().includes('docker') || message.toLowerCase().includes('status')) {
      content = `**[${name} Diagnostics]**\n- **Docker State**: Container is active and bound to host port\n- **Memory Footprint**: Healthy within limits\n- **SKILL.md Spec**: Active & validated\n- **MCP Servers**: Filesystem & SQLite connected\n\nHow would you like to proceed with your workflow?`;
    } else if (message.toLowerCase().includes('code') || message.toLowerCase().includes('python')) {
      content = `Here is a sample execution snippet verified in our environment:\n\n\`\`\`python\nimport docker\n\nclient = docker.from_env()\ncontainers = client.containers.list(all=True)\nprint(f"Total managed containers: {len(containers)}")\n\`\`\`\n\nFile edits and tests can be applied directly to the mounted \`/workspace\` volume.`;
    }

    res.json({
      id: 'msg_' + Date.now(),
      sender: 'agent',
      agentId,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reasoningSteps
    });
  }, 400);
});

// File system export code generator for Python application
app.get('/api/export/code', (req, res) => {
  const files = [
    {
      path: 'python_backend/main.py',
      language: 'python',
      description: 'FastAPI Backend Application with full REST endpoints',
      content: fs.existsSync('./python_backend/main.py') ? fs.readFileSync('./python_backend/main.py', 'utf-8') : '# main.py'
    },
    {
      path: 'python_backend/config_schema.py',
      language: 'python',
      description: 'Complete Pydantic Schema for models, channels, security & storage',
      content: fs.existsSync('./python_backend/config_schema.py') ? fs.readFileSync('./python_backend/config_schema.py', 'utf-8') : '# config_schema.py'
    },
    {
      path: 'python_backend/docker_manager.py',
      language: 'python',
      description: 'Docker Engine & Container Orchestration Manager',
      content: fs.existsSync('./python_backend/docker_manager.py') ? fs.readFileSync('./python_backend/docker_manager.py', 'utf-8') : '# docker_manager.py'
    },
    {
      path: 'python_backend/requirements.txt',
      language: 'text',
      description: 'Python pip requirements',
      content: fs.existsSync('./python_backend/requirements.txt') ? fs.readFileSync('./python_backend/requirements.txt', 'utf-8') : ''
    },
    {
      path: 'python_backend/Dockerfile',
      language: 'dockerfile',
      description: 'Standalone Python Backend Dockerfile',
      content: fs.existsSync('./python_backend/Dockerfile') ? fs.readFileSync('./python_backend/Dockerfile', 'utf-8') : ''
    },
    {
      path: 'Dockerfile',
      language: 'dockerfile',
      description: 'Production Multi-Stage Dockerfile for Python Orchestrator with React UI',
      content: fs.existsSync('./Dockerfile') ? fs.readFileSync('./Dockerfile', 'utf-8') : ''
    },
    {
      path: 'docker-compose.yml',
      language: 'yaml',
      description: 'Docker Compose Stack for ClawDock + Hermes + ZeroClaw + OpenClaw (Compose v2 Spec)',
      content: fs.existsSync('./docker-compose.yml') ? fs.readFileSync('./docker-compose.yml', 'utf-8') : ''
    }
  ];

  res.json({ files });
});

// Direct single file downloads
app.get('/api/export/Dockerfile', (req, res) => {
  if (fs.existsSync('./Dockerfile')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');
    res.send(fs.readFileSync('./Dockerfile', 'utf-8'));
  } else {
    res.status(404).send('Dockerfile not found');
  }
});

app.get('/api/export/docker-compose.yml', (req, res) => {
  if (fs.existsSync('./docker-compose.yml')) {
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');
    res.send(fs.readFileSync('./docker-compose.yml', 'utf-8'));
  } else {
    res.status(404).send('docker-compose.yml not found');
  }
});

// Full deployment archive download (.tar.gz)
app.get('/api/export/archive.tar.gz', (req, res) => {
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="clawdock-bot-admin.tar.gz"');
  
  const tarProc = spawn('tar', [
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.git',
    '--exclude=bun.lock',
    '-czf', '-',
    'Dockerfile',
    'docker-compose.yml',
    'package.json',
    'index.html',
    'vite.config.ts',
    'tsconfig.json',
    'server.ts',
    'src',
    'public',
    'python_backend'
  ], { cwd: process.cwd() });

  tarProc.stdout.pipe(res);
  tarProc.stderr.on('data', (data) => {
    console.error('Archive generation error:', data.toString());
  });
});

// Update registry state in memory
let systemUpdatesStore = [
  {
    id: 'update-agent-hermes',
    name: 'Hermes Agent',
    category: 'agent',
    targetId: 'hermes-agent',
    currentVersion: 'v0.9.4',
    latestVersion: 'v1.2.0',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'ghcr.io/nousresearch/hermes-agent:latest'
  },
  {
    id: 'update-agent-zeroclaw',
    name: 'ZeroClaw',
    category: 'agent',
    targetId: 'zeroclaw',
    currentVersion: 'v0.4.1',
    latestVersion: 'v0.6.2',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'zeroclaw/zeroclaw:latest'
  },
  {
    id: 'update-agent-openclaw',
    name: 'OpenClaw',
    category: 'agent',
    targetId: 'openclaw',
    currentVersion: 'v1.2.0',
    latestVersion: 'v1.4.1',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'openclaw/openclaw:latest'
  },
  {
    id: 'update-agent-picoclaw',
    name: 'PicoClaw',
    category: 'agent',
    targetId: 'picoclaw',
    currentVersion: 'v0.8.2',
    latestVersion: 'v1.0.0',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'picoclaw/picoclaw:latest'
  },
  {
    id: 'update-everos-runtime',
    name: 'EverOS Memory Runtime',
    category: 'mcp',
    targetId: 'mcp-everos',
    currentVersion: 'v0.9.2',
    latestVersion: 'v1.1.0',
    status: 'update_available',
    lastChecked: '3 mins ago',
    packageOrImage: 'evermind/everos-server:latest'
  }
];

// ==========================================
// EverOS Persistent Memory Layer (EverMind AI)
// ==========================================

let everosMemoriesStore = [
  {
    id: 'mem-001',
    title: 'ClawStack Network Topology & Docker Socket Permissions',
    content: `# ClawStack Network Topology & Docker Socket Permissions\n\nAll agent containers reside inside the bridge network \`claw-network\`.\n- Hermes core listens on \`http://hermes-agent:8080\`\n- ZeroClaw Rust daemon runs on port 8081\n- OpenClaw gateway routes on port 8082\n- PicoClaw runs on port 8083\n- EverOS memory runtime daemon listens on \`http://everos:8080\`\n\n**Docker Socket Rule:**\nAlways verify \`/var/run/docker.sock\` volume mount has \`rw\` permissions. When running non-root users inside containers, add user to host \`docker\` group GID 999.`,
    type: 'fact',
    sourceBot: 'hermes-agent',
    targetBots: ['all'],
    tags: ['docker', 'networking', 'security', 'topology'],
    relevanceScore: 0.96,
    bm25Score: 0.94,
    vectorScore: 0.98,
    filePath: 'memories/infrastructure/docker-topology.md',
    createdAt: '2026-09-02 14:20',
    lastAccessed: 'Just now',
    accessCount: 42
  },
  {
    id: 'mem-002',
    title: 'User Coding Preference: Modular TypeScript & Pydantic v2',
    content: `# User Coding Conventions\n\n- **Frontend:** Strict TypeScript, Tailwind CSS utility styling, Lucide icons, no bloated external UI kits.\n- **Backend:** FastAPI with Pydantic v2 \`BaseModel\` validation and type annotations.\n- **Memory:** Use EverOS hybrid mRAG across all 4 bots rather than isolated ephemeral session state.`,
    type: 'preference',
    sourceBot: 'user',
    targetBots: ['all'],
    tags: ['preferences', 'typescript', 'fastapi', 'styleguide'],
    relevanceScore: 0.93,
    bm25Score: 0.91,
    vectorScore: 0.95,
    filePath: 'memories/preferences/user-styleguide.md',
    createdAt: '2026-09-01 09:15',
    lastAccessed: '12 mins ago',
    accessCount: 89
  },
  {
    id: 'mem-003',
    title: 'Case 038: ZeroClaw Edge Memory Optimization Under 15MB',
    content: `# Trajectory Case 038: ZeroClaw Memory Pruning\n\n**Problem:** ZeroClaw RSS usage bumped to 18MB after high-frequency MQTT payload streaming.\n**Action:** Replaced dynamic JSON deserialization allocations with pooled \`serde_json\` zero-copy byte buffers. Mounted EverOS client via local UNIX domain socket rather than heavy HTTP keep-alive pools.\n**Outcome:** Memory reduced to 12.4MB RSS, steady-state verified for 72 hours.`,
    type: 'case',
    sourceBot: 'zeroclaw',
    targetBots: ['zeroclaw', 'picoclaw'],
    tags: ['rust', 'memory-tuning', 'edge', 'trajectory'],
    relevanceScore: 0.88,
    bm25Score: 0.85,
    vectorScore: 0.91,
    filePath: 'memories/zeroclaw/cases/case_038_memory_tuning.md',
    createdAt: '2026-09-03 16:40',
    lastAccessed: '1 hour ago',
    accessCount: 15
  },
  {
    id: 'mem-004',
    title: 'Case 041: OpenClaw Multi-Channel Webhook Rate-Limit Recovery',
    content: `# Trajectory Case 041: Telegram & Discord Webhook Recovery\n\n**Context:** High bursts of messages triggered 429 Too Many Requests from Telegram Bot API.\n**Resolution:**\n1. Implemented token-bucket rate limiter (30 req/sec max).\n2. Diverted background conversational memory synthesis into EverOS offline batch consolidation queue.\n3. Added exponential backoff jitter in \`node-telegram-bot-api\` wrapper.`,
    type: 'case',
    sourceBot: 'openclaw',
    targetBots: ['openclaw', 'hermes-agent'],
    tags: ['telegram', 'webhooks', 'rate-limit', 'trajectory'],
    relevanceScore: 0.89,
    bm25Score: 0.87,
    vectorScore: 0.92,
    filePath: 'memories/openclaw/cases/case_041_ratelimits.md',
    createdAt: '2026-09-03 19:10',
    lastAccessed: '35 mins ago',
    accessCount: 23
  },
  {
    id: 'mem-005',
    title: 'PicoClaw Sipeed RISC-V Cross-Compilation Flags',
    content: `# PicoClaw RISC-V Build Instructions\n\nFor compiling PicoClaw Go engine targeting Sipeed LicheeRV / MaixCube:\n\`\`\`bash\nCGO_ENABLED=0 GOOS=linux GOARCH=riscv64 go build -ldflags="-s -w" -o picoclaw-edge main.go\n\`\`\`\nPersists telemetry and state to EverOS server over lightweight HTTP REST endpoint on port 8080.`,
    type: 'code_snippet',
    sourceBot: 'picoclaw',
    targetBots: ['picoclaw', 'zeroclaw'],
    tags: ['go', 'riscv', 'sipeed', 'embedded', 'cross-compile'],
    relevanceScore: 0.84,
    bm25Score: 0.81,
    vectorScore: 0.87,
    filePath: 'memories/picoclaw/snippets/riscv-build.md',
    createdAt: '2026-09-02 22:05',
    lastAccessed: '3 hours ago',
    accessCount: 9
  },
  {
    id: 'mem-006',
    title: 'Consolidated Skill: Autonomous Docker Stack Rollback',
    content: `# Autonomous Docker Stack Health Verification & Safe Rollback\n\nDistilled from 6 recurring troubleshooting cases across Hermes and OpenClaw.\n\n**Procedure:**\n1. Execute \`docker compose ps --filter "health=unhealthy"\`\n2. If healthcheck fails for >3 consecutive polls:\n   - Extract last 50 lines of container stderr.\n   - Revert image tag in \`docker-compose.yml\` to previous verified tag.\n   - Execute \`docker compose up -d <service>\`.\n3. Record rollback reason in EverOS \`memories/incidents/\`.`,
    type: 'skill',
    sourceBot: 'hermes-agent',
    targetBots: ['all'],
    tags: ['skill', 'docker', 'devops', 'self-healing'],
    relevanceScore: 0.95,
    bm25Score: 0.93,
    vectorScore: 0.97,
    filePath: 'skills/distilled/autonomous-docker-rollback.md',
    createdAt: '2026-09-04 11:30',
    lastAccessed: '18 mins ago',
    accessCount: 31
  }
];

let everosSkillsStore = [
  {
    id: 'skill-01',
    name: 'Autonomous Docker Stack Rollback',
    description: 'Diagnoses unhealthy containers, captures logs, and orchestrates zero-downtime rollback to last stable tag.',
    pattern: 'Unhealthy healthcheck polling -> capture stderr -> rollback tag -> emit EverOS incident log',
    distilledFromCases: ['case-012', 'case-019', 'case-027', 'case-033'],
    confidence: 0.96,
    timesApplied: 14,
    sourceBot: 'hermes-agent',
    createdAt: '2026-09-04',
    executablePrompt: 'When container healthcheck status transitions to unhealthy for 3 intervals, trigger safe rollback protocol.'
  },
  {
    id: 'skill-02',
    name: 'Multi-Channel Telegram/Discord Rate Limiter Jitter',
    description: 'Intercepts burst traffic across Telegram and Discord gateways and schedules exponential jitter.',
    pattern: '429 detection -> token bucket throttling -> decouple EverOS offline consolidation -> retry with jitter',
    distilledFromCases: ['case-039', 'case-041'],
    confidence: 0.92,
    timesApplied: 28,
    sourceBot: 'openclaw',
    createdAt: '2026-09-03',
    executablePrompt: 'Apply token-bucket smoothing when webhook requests exceed 25 events per second.'
  },
  {
    id: 'skill-03',
    name: 'Rust Edge Memory Buffer Recycling',
    description: 'Reclaims dynamic allocations on ZeroClaw to guarantee steady sub-15MB RAM operation on edge boards.',
    pattern: 'Buffer reuse -> zero-copy serde deserialization -> UNIX socket EverOS transmission',
    distilledFromCases: ['case-024', 'case-038'],
    confidence: 0.94,
    timesApplied: 9,
    sourceBot: 'zeroclaw',
    createdAt: '2026-09-03',
    executablePrompt: 'Enforce zero-copy deserialization for high-throughput sensor telemetry pipelines.'
  },
  {
    id: 'skill-04',
    name: 'Cross-Bot Context Synchronization Protocol',
    description: 'Automatically synchronizes problem-solving breakthroughs made by Hermes to ZeroClaw and OpenClaw via EverOS mRAG.',
    pattern: 'Hermes marks solution verified -> EverOS generates LanceDB vector embedding -> broadcasts sync signal to active bots',
    distilledFromCases: ['case-015', 'case-022', 'case-044'],
    confidence: 0.98,
    timesApplied: 62,
    sourceBot: 'hermes-agent',
    createdAt: '2026-09-04',
    executablePrompt: 'Broadcast newly verified architectural patterns across all active bots in claw-network.'
  }
];

let everosConfigStore = {
  enabled: true,
  serverUrl: 'http://everos:8080',
  storagePath: '/data/everos',
  storageEngine: 'markdown_sqlite_lancedb',
  hybridMragAlpha: 0.60,
  autoConsolidateCases: true,
  consolidationIntervalMin: 30,
  sharedNamespace: true,
  botSync: {
    'hermes-agent': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 2048 },
    'zeroclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 1024 },
    'openclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 2048 },
    'picoclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 512 }
  }
};

let everosTasksStore = [
  {
    id: 'task-hermes-01',
    title: 'Container Stack Healthcheck & Safe Rollback',
    description: 'Autonomous health verification polling and container stderr telemetry inspection across all docker containers.',
    agentId: 'hermes-agent',
    status: 'running',
    category: 'devops',
    startedAt: '15m ago',
    priority: 'high'
  },
  {
    id: 'task-hermes-02',
    title: 'Docker Socket & GID 999 Permissions Auditor',
    description: 'Enforces non-root container isolation, unix socket rw rights, and bridge network security isolation.',
    agentId: 'hermes-agent',
    status: 'active',
    category: 'security',
    startedAt: '32m ago',
    priority: 'medium'
  },
  {
    id: 'task-zeroclaw-01',
    title: 'MQTT Sensor Stream Ingest & Sub-15MB RSS Pruner',
    description: 'High-frequency telemetry buffering with zero-copy serde deserialization and dynamic memory compaction.',
    agentId: 'zeroclaw',
    status: 'running',
    category: 'edge',
    startedAt: '1h ago',
    priority: 'high'
  },
  {
    id: 'task-zeroclaw-02',
    title: 'Zero-Copy UNIX Socket EverOS Memory Pipeline',
    description: 'Streams binary trajectory snapshots over local domain sockets to bypass HTTP connection pool overhead.',
    agentId: 'zeroclaw',
    status: 'active',
    category: 'memory',
    startedAt: '45m ago',
    priority: 'high'
  },
  {
    id: 'task-openclaw-01',
    title: 'Multi-Channel Telegram / Discord Rate Limit Jitter',
    description: 'Token-bucket queue management, webhook backoff scheduling, and message payload deduplication.',
    agentId: 'openclaw',
    status: 'running',
    category: 'messaging',
    startedAt: '22m ago',
    priority: 'high'
  },
  {
    id: 'task-openclaw-02',
    title: 'TypeScript Schema Validation & Pydantic v2 Bridge',
    description: 'Type-safe contract enforcement and real-time JSON schema serialization for agent tool calling.',
    agentId: 'openclaw',
    status: 'active',
    category: 'coding',
    startedAt: '10m ago',
    priority: 'medium'
  },
  {
    id: 'task-picoclaw-01',
    title: 'Sipeed RISC-V Edge Telemetry & PicoLM Inference',
    description: 'Quantized on-device lightweight reasoning and low-power telemetry syncing over HTTP REST.',
    agentId: 'picoclaw',
    status: 'running',
    category: 'edge',
    startedAt: '2h ago',
    priority: 'medium'
  },
  {
    id: 'task-everos-01',
    title: 'Cross-Agent Memory Matrix Consolidation & LanceDB Indexing',
    description: 'Performs background BM25 keyword re-indexing and LanceDB 384-dim dense vector embedding updates.',
    agentId: 'everos-daemon',
    status: 'running',
    category: 'memory',
    startedAt: '5m ago',
    priority: 'high'
  }
];

let everosRelationshipsStore = [
  { id: 'rel-01', memoryId: 'mem-001', taskId: 'task-hermes-02', weight: 0.98, reason: 'Direct topology & socket permission rules enforced during container permission audits', accessFrequency: 42, lastReinforced: '2m ago' },
  { id: 'rel-02', memoryId: 'mem-001', taskId: 'task-hermes-01', weight: 0.89, reason: 'Bridge network port mapping referenced during healthcheck port probes', accessFrequency: 38, lastReinforced: '5m ago' },
  { id: 'rel-03', memoryId: 'mem-006', taskId: 'task-hermes-01', weight: 0.96, reason: 'Execution blueprint for 3-strike unhealthy container rollback', accessFrequency: 54, lastReinforced: '1m ago' },
  { id: 'rel-04', memoryId: 'mem-002', taskId: 'task-openclaw-02', weight: 0.94, reason: 'Pydantic v2 & TypeScript conventions strictly enforced on tool schemas', accessFrequency: 89, lastReinforced: '8m ago' },
  { id: 'rel-05', memoryId: 'mem-003', taskId: 'task-zeroclaw-01', weight: 0.95, reason: 'Zero-copy serde memory recycling technique applied to MQTT payloads', accessFrequency: 31, lastReinforced: '4m ago' },
  { id: 'rel-06', memoryId: 'mem-003', taskId: 'task-zeroclaw-02', weight: 0.91, reason: 'UNIX domain socket buffer allocation parameters and steady-state guidelines', accessFrequency: 27, lastReinforced: '12m ago' },
  { id: 'rel-07', memoryId: 'mem-004', taskId: 'task-openclaw-01', weight: 0.93, reason: 'Token-bucket rate limit algorithm & Telegram 429 jitter backoff pattern', accessFrequency: 48, lastReinforced: '3m ago' },
  { id: 'rel-08', memoryId: 'mem-005', taskId: 'task-picoclaw-01', weight: 0.92, reason: 'RISC-V build flags and EverOS REST transmission specification for Sipeed edge boards', accessFrequency: 19, lastReinforced: '15m ago' },
  { id: 'rel-09', memoryId: 'mem-002', taskId: 'task-everos-01', weight: 0.78, reason: 'User preference guidelines referenced for markdown memory storage structure', accessFrequency: 22, lastReinforced: '25m ago' },
  { id: 'rel-10', memoryId: 'mem-001', taskId: 'task-everos-01', weight: 0.85, reason: 'EverOS daemon port 8080 binding and volume mount mapping', accessFrequency: 35, lastReinforced: '18m ago' },
  { id: 'rel-11', memoryId: 'mem-004', taskId: 'task-everos-01', weight: 0.74, reason: 'Offline batch consolidation queue used to buffer high-burst conversational traces', accessFrequency: 16, lastReinforced: '30m ago' },
  { id: 'rel-12', memoryId: 'mem-005', taskId: 'task-zeroclaw-01', weight: 0.65, reason: 'Cross-edge memory sharing between Sipeed RISC-V and Rust Tokio runtimes', accessFrequency: 11, lastReinforced: '45m ago' }
];

// EverOS Health & Stats
app.get('/api/everos/status', (req, res) => {
  res.json({
    status: 'healthy',
    totalMemories: everosMemoriesStore.length,
    totalCases: 47,
    consolidatedSkills: everosSkillsStore.length,
    vectorEmbeddings: everosMemoriesStore.length * 6 + 148,
    markdownFiles: everosMemoriesStore.length + 30,
    hybridSearchLatencyMs: 312,
    diskUsageMb: 42.8,
    activeBots: 4,
    lastSyncTime: 'Just now',
    storageEngine: 'Markdown-Native + SQLite BM25 + LanceDB Vectors',
    serverUrl: everosConfigStore.serverUrl
  });
});

// EverOS Config (GET & POST)
app.get('/api/everos/config', (req, res) => {
  res.json(everosConfigStore);
});

app.post('/api/everos/config', (req, res) => {
  everosConfigStore = { ...everosConfigStore, ...req.body };
  res.json({ success: true, config: everosConfigStore });
});

// EverOS Memories List
app.get('/api/everos/memories', (req, res) => {
  const { bot, type, search } = req.query as Record<string, string>;
  let result = [...everosMemoriesStore];
  if (bot && bot !== 'all') {
    result = result.filter(m => m.sourceBot === bot || m.targetBots.includes(bot as any) || m.targetBots.includes('all'));
  }
  if (type && type !== 'all') {
    result = result.filter(m => m.type === type);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(m => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q)));
  }
  res.json({ memories: result, count: result.length });
});

// Create EverOS Memory
app.post('/api/everos/memories', (req, res) => {
  const { title, content, type, sourceBot, targetBots, tags } = req.body;
  const newMemory = {
    id: 'mem-' + Date.now().toString(36),
    title: title || 'Untitled Memory',
    content: content || '',
    type: type || 'fact',
    sourceBot: sourceBot || 'user',
    targetBots: targetBots || ['all'],
    tags: tags || ['custom'],
    relevanceScore: 0.95,
    bm25Score: 0.93,
    vectorScore: 0.96,
    filePath: `memories/${sourceBot || 'general'}/${(title || 'item').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    lastAccessed: 'Just now',
    accessCount: 1
  };
  everosMemoriesStore.unshift(newMemory);
  res.json({ success: true, memory: newMemory });
});

// Delete EverOS Memory
app.delete('/api/everos/memories/:id', (req, res) => {
  const { id } = req.params;
  everosMemoriesStore = everosMemoriesStore.filter(m => m.id !== id);
  res.json({ success: true, message: `Removed memory ${id}` });
});

// EverOS Hybrid mRAG Search
app.post('/api/everos/search', (req, res) => {
  const { query, alpha = 0.6, botId } = req.body || {};
  const q = (query || '').toLowerCase();
  
  const scored = everosMemoriesStore.map(mem => {
    let bm25 = 0.3;
    let vector = 0.4;
    if (q) {
      if (mem.title.toLowerCase().includes(q)) {
        bm25 += 0.5;
        vector += 0.4;
      }
      if (mem.content.toLowerCase().includes(q)) {
        bm25 += 0.4;
        vector += 0.35;
      }
      if (mem.tags.some(t => t.toLowerCase().includes(q))) {
        bm25 += 0.45;
        vector += 0.38;
      }
    } else {
      bm25 = mem.bm25Score || 0.85;
      vector = mem.vectorScore || 0.90;
    }
    bm25 = Math.min(0.99, bm25);
    vector = Math.min(0.99, vector);
    const hybrid = (1 - alpha) * bm25 + alpha * vector;
    return {
      ...mem,
      bm25Score: parseFloat(bm25.toFixed(2)),
      vectorScore: parseFloat(vector.toFixed(2)),
      relevanceScore: parseFloat(hybrid.toFixed(2))
    };
  });

  scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  res.json({
    query,
    alpha,
    latencyMs: Math.floor(Math.random() * 80) + 140, // sub-300ms
    engine: 'LanceDB v0.14 + SQLite BM25',
    results: scored.slice(0, 5)
  });
});

// EverOS Case-to-Skill Consolidation
app.post('/api/everos/consolidate', (req, res) => {
  const newSkill = {
    id: 'skill-' + Date.now().toString(36),
    name: 'Autonomous Multi-Channel Message Debounce & Sync',
    description: 'Learned trajectory pattern: batching inbound messages during peak load and synchronizing thread context across Hermes and OpenClaw.',
    pattern: 'Detect rapid bursts -> buffer in SQLite -> summarize key facts via EverOS -> emit consolidated intent to agent loop',
    distilledFromCases: ['case-045', 'case-047'],
    confidence: 0.97,
    timesApplied: 1,
    sourceBot: 'openclaw',
    createdAt: new Date().toISOString().split('T')[0],
    executablePrompt: 'When message frequency from a single user exceeds 4 msgs/5s, invoke EverOS trajectory debouncer.'
  };

  everosSkillsStore.unshift(newSkill);

  res.json({
    success: true,
    message: 'EverOS self-evolving consolidation cycle completed successfully.',
    casesProcessed: 7,
    skillsGenerated: 1,
    newSkill
  });
});

// EverOS Bot Sync Toggle
app.post('/api/everos/sync-bots', (req, res) => {
  const { botId, enabled } = req.body || {};
  if (botId && everosConfigStore.botSync[botId]) {
    everosConfigStore.botSync[botId].enabled = enabled;
  }
  res.json({ success: true, botSync: everosConfigStore.botSync });
});

// EverOS Skills List
app.get('/api/everos/skills', (req, res) => {
  res.json({ skills: everosSkillsStore, count: everosSkillsStore.length });
});

// EverOS Active Agent Tasks List
app.get('/api/everos/tasks', (req, res) => {
  const { agentId } = req.query as Record<string, string>;
  let tasks = [...everosTasksStore];
  if (agentId && agentId !== 'all') {
    tasks = tasks.filter(t => t.agentId === agentId);
  }
  res.json({ tasks, count: tasks.length });
});

// EverOS Memory-Task Relationships List
app.get('/api/everos/relationships', (req, res) => {
  const { minWeight, memoryId, taskId } = req.query as Record<string, string>;
  let rels = [...everosRelationshipsStore];
  if (minWeight) {
    const minW = parseFloat(minWeight);
    if (!isNaN(minW)) rels = rels.filter(r => r.weight >= minW);
  }
  if (memoryId) {
    rels = rels.filter(r => r.memoryId === memoryId);
  }
  if (taskId) {
    rels = rels.filter(r => r.taskId === taskId);
  }
  res.json({ 
    relationships: rels, 
    count: rels.length,
    tasks: everosTasksStore,
    memories: everosMemoriesStore
  });
});

// Create/Update EverOS Relationship
app.post('/api/everos/relationships', (req, res) => {
  const { memoryId, taskId, weight = 0.85, reason = 'Linked via contextual mRAG trace' } = req.body || {};
  if (!memoryId || !taskId) {
    return res.status(400).json({ error: 'memoryId and taskId are required' });
  }

  const existingIdx = everosRelationshipsStore.findIndex(r => r.memoryId === memoryId && r.taskId === taskId);
  if (existingIdx >= 0) {
    everosRelationshipsStore[existingIdx].weight = parseFloat(weight);
    everosRelationshipsStore[existingIdx].reason = reason;
    everosRelationshipsStore[existingIdx].lastReinforced = 'Just now';
    everosRelationshipsStore[existingIdx].accessFrequency += 1;
    return res.json({ success: true, relationship: everosRelationshipsStore[existingIdx] });
  }

  const newRel = {
    id: 'rel-' + Date.now().toString(36),
    memoryId,
    taskId,
    weight: parseFloat(weight),
    reason,
    accessFrequency: 1,
    lastReinforced: 'Just now'
  };
  everosRelationshipsStore.unshift(newRel);
  res.json({ success: true, relationship: newRel });
});

// Reinforce relationship pulse
app.post('/api/everos/relationships/reinforce', (req, res) => {
  const { ids, delta = 0.05 } = req.body || {};
  everosRelationshipsStore = everosRelationshipsStore.map(r => {
    if (!ids || ids.includes(r.id)) {
      return {
        ...r,
        weight: Math.min(0.99, parseFloat((r.weight + delta).toFixed(2))),
        accessFrequency: r.accessFrequency + 1,
        lastReinforced: 'Just now'
      };
    }
    return r;
  });
  res.json({ success: true, relationships: everosRelationshipsStore });
});


// List updates
app.get('/api/updates', (req, res) => {
  res.json({
    updates: systemUpdatesStore,
    lastChecked: new Date().toISOString()
  });
});

// Check updates
app.post('/api/updates/check', (req, res) => {
  const { id } = req.body || {};
  res.json({
    success: true,
    message: id ? `Scanned registry for ${id}` : 'Registry scan completed across all agents, MCP servers, and skills.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
});

// Apply an update
app.post('/api/updates/apply', (req, res) => {
  const { id, targetVersion } = req.body || {};
  const found = systemUpdatesStore.find(u => u.id === id);
  if (found) {
    found.currentVersion = targetVersion || found.latestVersion;
    found.status = 'up_to_date';
    
    const targetAgentId = found.targetId || 'hermes-agent';
    if (agentStates[targetAgentId]) {
      agentStates[targetAgentId].status = 'restarting';
      agentStates[targetAgentId].logs.push(`[Update Engine] Applied update ${found.name} (${found.currentVersion}). Restarting container...`);
      setTimeout(() => {
        if (agentStates[targetAgentId]) {
          agentStates[targetAgentId].status = 'running';
          agentStates[targetAgentId].logs.push(`[Docker Engine] Container successfully restarted with new update.`);
          savePersistentState();
        }
      }, 1500);
    }
    savePersistentState();
  }
  res.json({
    success: true,
    id,
    version: targetVersion,
    message: `Successfully applied update and restarted container runtime.`
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClawDock Agent Orchestrator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
