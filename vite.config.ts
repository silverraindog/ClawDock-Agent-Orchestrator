import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function readRequestBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ raw: body });
      }
    });
    req.on('error', () => resolve({}));
  });
}

function apiServerPlugin(): Plugin {
  const dataDir = path.join(process.cwd(), 'data', 'clawdock');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {}

  const defaultAgentStates: Record<string, any> = {
    'hermes-agent': {
      status: 'running',
      containerId: 'c108a94fd32b',
      containerName: 'hermes-agent-core',
      version: 'v0.9.4',
      memoryUsageMb: 142.6,
      cpuUsagePct: 1.4,
      uptimeSeconds: 14230,
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
      containerName: 'zeroclaw-daemon',
      version: 'v0.4.1',
      memoryUsageMb: 14.8,
      cpuUsagePct: 0.2,
      uptimeSeconds: 0,
      logs: [
        '[ZeroClaw Daemon] Rust tokio runtime exited with code 0',
        '[ZeroClaw Daemon] Snapshot saved to /var/zeroclaw/memory.md'
      ]
    },
    'openclaw': {
      status: 'detected_local',
      containerId: '',
      containerName: 'openclaw-hub',
      version: 'v1.2.0',
      memoryUsageMb: 88.2,
      cpuUsagePct: 0.9,
      uptimeSeconds: 3600,
      logs: [
        '[OpenClaw Hub] Detected local Node.js v20 runtime',
        '[OpenClaw Hub] Gateway daemon ready to connect via Docker or Host port 8082'
      ]
    },
    'picoclaw': {
      status: 'running',
      containerId: 'e4991ac89b10',
      containerName: 'picoclaw-edge',
      version: 'v0.8.2',
      memoryUsageMb: 9.4,
      cpuUsagePct: 0.3,
      uptimeSeconds: 28400,
      logs: [
        '[PicoClaw Edge] Sipeed Go engine initialized (Memory: 9.4MB)',
        '[PicoClaw Edge] PicoLM Quantized GGUF inference ready',
        '[PicoClaw Edge] WebUI Gateway listening on 0.0.0.0:8083'
      ]
    }
  };

  let agentStates = { ...defaultAgentStates };

  interface ServerRequestLog {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    pathname: string;
    status: number;
    durationMs: number;
    clientIp: string;
  }

  const serverRequestLogs: ServerRequestLog[] = [];

  function recordServerLog(entry: ServerRequestLog) {
    serverRequestLogs.unshift(entry);
    if (serverRequestLogs.length > 200) {
      serverRequestLogs.pop();
    }
  }

  const defaultNativeFiles: Record<string, { fileName: string; format: string; content: string }> = {
    'hermes-agent': {
      fileName: 'hermes.yaml',
      format: 'yaml',
      content: `version: "1.0.0"
agent_id: "hermes-agent"
agent_name: "Hermes Code Assistant"
persona: "Hermes Prime"
system_preset: "engineer"

model:
  provider: "anthropic"
  model: "claude-3-7-sonnet"
  temperature: 0.3
  max_tokens: 4096
  context_window: 128000
  reasoning_effort: "high"

system:
  system_prompt: "You are Hermes Agent, a premier autonomous software engineering and problem-solving AI agent. You have direct access to workspace tools, shell execution, and persistent memory. Always structure complex tasks into clear execution steps, verify your code with tests or linters, and document non-trivial architecture decisions."
  language: "en-US"
  auto_format: true

channels:
  telegram:
    enabled: true
    bot_token: "env:TELEGRAM_BOT_TOKEN"
    allowed_users: "@developer"
    mode: "polling"
  discord:
    enabled: false
    bot_token: ""
  slack:
    enabled: false
  webhook:
    enabled: true
    port: 8080
    auth_token: "secure_bearer_token"

security:
  sandbox_mode: "docker_isolated"
  allowed_directories:
    - "/workspace"
    - "/data"
  block_network_access: false
  max_execution_time_sec: 120

storage:
  memory_backend: "everos"
  db_path: "/data/everos/memories/hermes-agent"
  auto_summarize_interval: 25
  vector_db_url: "http://everos:8080"
`
    },
    'openclaw': {
      fileName: 'openclaw.json',
      format: 'json',
      content: `{
  "agent_id": "openclaw",
  "version": "1.0.0",
  "agent_name": "OpenClaw Gateway",
  "persona": "OpenClaw Assistant",
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.5,
    "max_tokens": 4096,
    "context_window": 128000,
    "reasoning_effort": "high"
  },
  "system": {
    "system_prompt": "You are OpenClaw, a multi-channel cooperative assistant gateway. You bridge communication between humans across multiple platforms and coordinate autonomous tools and agents.",
    "preset": "researcher",
    "language": "en-US"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "bot_token": "env:TELEGRAM_BOT_TOKEN",
      "allowed_users": "@developer"
    },
    "discord": {
      "enabled": false,
      "bot_token": ""
    },
    "slack": {
      "enabled": false
    },
    "webhook": {
      "enabled": true,
      "port": 8080,
      "auth_token": "secure_bearer_token"
    }
  },
  "security": {
    "sandbox_mode": "docker_isolated",
    "allowed_directories": ["/workspace", "/data"],
    "block_network_access": false,
    "max_execution_time_sec": 120
  },
  "storage": {
    "memory_backend": "everos",
    "db_path": "/data/everos/memories/openclaw",
    "auto_summarize_interval": 25,
    "vector_db_url": "http://everos:8080"
  }
}`
    },
    'zeroclaw': {
      fileName: 'zeroclaw.toml',
      format: 'toml',
      content: `agent_id = "zeroclaw"
version = "1.0.0"
agent_name = "ZeroClaw Edge"
persona = "ZeroClaw Edge"

[model]
provider = "deepseek"
model = "deepseek-r1"
temperature = 0.2
max_tokens = 4096
context_window = 128000
reasoning_effort = "high"

[system]
system_prompt = "You are ZeroClaw, an ultra-fast, minimal AI assistant running natively in Rust. Keep responses concise, direct, and actionable. Conserve tokens and prioritize efficiency."
preset = "edge_assistant"
language = "en-US"

[channels.telegram]
enabled = true
bot_token = "env:TELEGRAM_BOT_TOKEN"
allowed_users = "@developer"

[channels.webhook]
enabled = true
port = 8080
auth_token = "secure_bearer_token"

[security]
sandbox_mode = "docker_isolated"
allowed_directories = ["/workspace", "/data"]
block_network_access = false
max_execution_time_sec = 120

[storage]
memory_backend = "everos"
db_path = "/data/everos/memories/zeroclaw"
auto_summarize_interval = 25
vector_db_url = "http://everos:8080"
`
    },
    'picoclaw': {
      fileName: 'picoclaw.json',
      format: 'json',
      content: `{
  "agent_id": "picoclaw",
  "version": "1.0.0",
  "agent_name": "PicoClaw Go",
  "persona": "PicoClaw Go",
  "model": {
    "provider": "ollama",
    "model": "qwen2.5-coder:7b",
    "temperature": 0.4,
    "max_tokens": 4096,
    "context_window": 128000,
    "reasoning_effort": "high"
  },
  "system": {
    "system_prompt": "You are PicoClaw by Sipeed. You run on lightweight edge hardware like RISC-V and ARM boards. Be smart, snappy, and hardware-friendly.",
    "preset": "edge_assistant",
    "language": "en-US"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "bot_token": "env:TELEGRAM_BOT_TOKEN",
      "allowed_users": "@developer"
    },
    "webhook": {
      "enabled": true,
      "port": 8080,
      "auth_token": "secure_bearer_token"
    }
  },
  "security": {
    "sandbox_mode": "host_restricted",
    "allowed_directories": ["/workspace", "/data"],
    "block_network_access": false,
    "max_execution_time_sec": 120
  },
  "storage": {
    "memory_backend": "everos",
    "db_path": "/data/everos/memories/picoclaw",
    "auto_summarize_interval": 25,
    "vector_db_url": "http://everos:8080"
  }
}`
    }
  };

  function parseConfigSchema(agentId: string, nativeContent: string, format: string) {
    let parsedAgentName = agentId;
    let parsedModelProvider = 'anthropic';
    let parsedModelName = 'claude-3-7-sonnet';
    let parsedTemperature = 0.3;
    let parsedSystemPrompt = 'Autonomous agent.';
    let parsedPreset = 'engineer';

    try {
      if (format === 'json') {
        const json = JSON.parse(nativeContent);
        if (json.agent_name) parsedAgentName = json.agent_name;
        if (json.model) {
          if (json.model.provider) parsedModelProvider = json.model.provider;
          if (json.model.model && json.model.model !== 'provider:') parsedModelName = json.model.model;
          if (json.model.temperature !== undefined) parsedTemperature = Number(json.model.temperature);
        }
        if (json.system) {
          if (json.system.system_prompt) parsedSystemPrompt = json.system.system_prompt;
          if (json.system.preset) parsedPreset = json.system.preset;
        }
      } else if (format === 'toml') {
        const matchName = nativeContent.match(/agent_name\s*=\s*["']([^"']+)["']/);
        if (matchName) parsedAgentName = matchName[1];
        const matchProv = nativeContent.match(/provider\s*=\s*["']([^"']+)["']/);
        if (matchProv) parsedModelProvider = matchProv[1];
        const matchModel = nativeContent.match(/model\s*=\s*["']([^"']+)["']/);
        if (matchModel && matchModel[1] !== 'provider:') parsedModelName = matchModel[1];
        const matchTemp = nativeContent.match(/temperature\s*=\s*([0-9.]+)/);
        if (matchTemp) parsedTemperature = Number(matchTemp[1]);
        const matchPrompt = nativeContent.match(/system_prompt\s*=\s*["']([^"']+)["']/);
        if (matchPrompt) parsedSystemPrompt = matchPrompt[1];
        const matchPreset = nativeContent.match(/preset\s*=\s*["']([^"']+)["']/);
        if (matchPreset) parsedPreset = matchPreset[1];
      } else {
        // YAML
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
        const matchPreset = nativeContent.match(/system_preset:\s*"([^"]+)"|system_preset:\s*([^\n]+)/);
        if (matchPreset) parsedPreset = (matchPreset[1] || matchPreset[2]).trim();
      }

      if (parsedModelName === 'provider:' || !parsedModelName) {
        parsedModelName = agentId === 'zeroclaw' ? 'deepseek-r1' : agentId === 'openclaw' ? 'gpt-4o' : agentId === 'picoclaw' ? 'qwen2.5-coder:7b' : 'claude-3-7-sonnet';
      }
    } catch {}

    return {
      agentId,
      version: '1.0.0',
      model: {
        provider: parsedModelProvider,
        model: parsedModelName,
        apiKey: '',
        temperature: parsedTemperature,
        reasoningEffort: 'high',
        maxTokens: 4096,
        contextWindow: 128000,
        topP: 0.95
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: 'env:TELEGRAM_BOT_TOKEN',
          allowedUsers: '@developer',
          mode: 'polling'
        },
        discord: { enabled: false, botToken: '', clientId: '', guildIds: '' },
        slack: { enabled: false, botToken: '', appToken: '', signingSecret: '', socketMode: true },
        whatsapp: { enabled: false, sessionId: '', webhookUrl: '' },
        matrix: { enabled: false, homeserver: '', accessToken: '', roomIds: '' },
        webhook: { enabled: true, port: 8080, authToken: 'secure_bearer_token', corsOrigin: '*' }
      },
      system: {
        preset: parsedPreset,
        systemPrompt: parsedSystemPrompt,
        agentName: parsedAgentName,
        personaName: parsedAgentName,
        language: 'en-US',
        autoFormatCode: true
      },
      security: {
        sandboxMode: 'docker_isolated',
        allowedDirectories: ['/workspace', '/data'],
        blockNetworkAccess: false,
        maxExecutionTimeSec: 120,
        requireApprovalForCommands: false,
        securityProfileFile: '.security.yml'
      },
      storage: {
        memoryBackend: 'everos',
        dbPath: `/data/everos/memories/${agentId}`,
        autoSummarizeInterval: 25,
        maxHistoryTurns: 100,
        vectorDbUrl: 'http://everos:8080'
      },
      moa: {
        enabled: agentId === 'hermes-agent',
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
    };
  }

  function getAgentConfig(agentId: string) {
    const fallback = defaultNativeFiles[agentId] || defaultNativeFiles['hermes-agent'];
    const filePath = path.join(dataDir, fallback.fileName);
    const absPath = `/data/clawdock/${fallback.fileName}`;
    let content = fallback.content;
    let resolvedPath = filePath;
    try {
      if (fs.existsSync(absPath) && fs.statSync(absPath).size > 10) {
        content = fs.readFileSync(absPath, 'utf8');
        resolvedPath = absPath;
      } else if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10) {
        content = fs.readFileSync(filePath, 'utf8');
        resolvedPath = filePath;
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    } catch {}

    const configSchema = parseConfigSchema(agentId, content, fallback.format);
    return {
      success: true,
      agentId,
      nativeFileName: fallback.fileName,
      nativeFormat: fallback.format,
      nativeContent: content,
      filePath: resolvedPath,
      configSchema,
      config: configSchema,
      source: resolvedPath.startsWith('/data') ? 'clawdock_mount_file' : 'vite_data_clawdock'
    };
  }

  function createApiHandler() {
    return async (req: any, res: any, next: any) => {
      if (!req.url || !req.url.startsWith('/api/')) {
        return next();
      }

      const timestamp = new Date().toISOString();
      const method = req.method || 'GET';
      const parsedUrl = new URL(req.url, 'http://localhost');
      const rawPath = parsedUrl.pathname;
      const pathname = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
      const startTime = Date.now();

      // Intercept res.end to log all requests into serverRequestLogs
      const originalEnd = res.end;
      let isLogged = false;
      res.end = function (...args: any[]) {
        if (!isLogged) {
          isLogged = true;
          const durationMs = Math.round(Date.now() - startTime);
          recordServerLog({
            id: 'req_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            method,
            url: req.url,
            pathname,
            status: res.statusCode || 200,
            durationMs,
            clientIp: req.socket?.remoteAddress || '127.0.0.1'
          });
        }
        return originalEnd.apply(res, args);
      };

      // Comprehensive logging for all incoming API requests (Method + URL)
      console.log(`[Vite API Server] [${timestamp}] ${method} ${pathname} (Query: ${parsedUrl.search})`);

      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

      if (method === 'OPTIONS') {
        console.log(`[Vite API Server] [${timestamp}] Handled CORS preflight for ${pathname}`);
        res.statusCode = 200;
        return res.end();
      }

      // Centralized Request Router using switch statement
      switch (pathname) {
        // 1. Health endpoint
        case '/api/health': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] 200 OK: GET /api/health`);
          return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp }));
        }

        // 2. State endpoint (GET, POST, PUT) - Full agent states object
        case '/api/state': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] [TRACE /api/state] Direct Router Match: method=${method}, url="${req.url}", exact pathname="${pathname}", matchedSwitchCase="/api/state", clientIP=${req.socket?.remoteAddress || 'unknown'}`);
          if (method === 'GET') {
            console.log(`[Vite API Server] [${timestamp}] 200 OK: GET /api/state - Full Agent States:`, Object.keys(agentStates));
            return res.end(JSON.stringify({
              success: true,
              agentStates: { ...agentStates },
              timestamp
            }));
          }

          if (method === 'POST' || method === 'PUT') {
            const body = await readRequestBody(req);
            console.log(`[Vite API Server] [${timestamp}] 200 OK: ${method} /api/state - Updated state:`, body?.agentStates ? Object.keys(body.agentStates) : 'none');
            if (body && body.agentStates) {
              agentStates = { ...agentStates, ...body.agentStates };
            }
            return res.end(JSON.stringify({
              success: true,
              agentStates: { ...agentStates },
              timestamp
            }));
          }
          res.statusCode = 405;
          return res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use GET, POST, or PUT.' }));
        }

        // 3. Diagnostics Request Logs (Real-time HTTP requests ring buffer)
        case '/api/diagnostics/request-logs': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] 200 OK: GET /api/diagnostics/request-logs (${serverRequestLogs.length} items)`);
          return res.end(JSON.stringify({
            success: true,
            logs: serverRequestLogs,
            total: serverRequestLogs.length,
            timestamp
          }));
        }

        // 3. Standardized Agent Config retrieval: /api/agents/all/config (and alias /api/agents/all/configs)
        case '/api/agents/all/config':
        case '/api/agents/all/configs': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] 200 OK: GET ${pathname} (Standardized /config suffix)`);
          const agentIds = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
          const configs: Record<string, any> = {};
          for (const id of agentIds) {
            configs[id] = getAgentConfig(id);
          }
          return res.end(JSON.stringify({ success: true, configs }));
        }

        // 4. Persistence endpoint (GET, POST, PUT)
        case '/api/persistence': {
          res.setHeader('Content-Type', 'application/json');
          const persistenceFile = path.join(dataDir, 'persistence.json');

          if (method === 'GET') {
            console.log(`[Vite API Server] [${timestamp}] 200 OK: GET /api/persistence`);
            let data: any = {};
            try {
              if (fs.existsSync(persistenceFile)) {
                data = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
              }
            } catch {}
            return res.end(JSON.stringify({ success: true, data }));
          }

          if (method === 'POST' || method === 'PUT') {
            const body = await readRequestBody(req);
            console.log(`[Vite API Server] [${timestamp}] 200 OK: ${method} /api/persistence - Processing persistence write`);
            let existing: any = {};
            try {
              if (fs.existsSync(persistenceFile)) {
                existing = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
              }
            } catch {}

            if (body.key && body.value !== undefined) {
              existing[body.key] = body.value;
            } else if (body.data && typeof body.data === 'object') {
              existing = { ...existing, ...body.data };
            } else if (body && typeof body === 'object') {
              existing = { ...existing, ...body };
            }

            try {
              fs.writeFileSync(persistenceFile, JSON.stringify(existing, null, 2), 'utf8');
            } catch {}

            return res.end(JSON.stringify({ success: true, data: existing }));
          }
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        // 5. Docker status endpoint
        case '/api/docker/status': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] 200 OK: /api/docker/status`);
          return res.end(JSON.stringify({
            success: true,
            dockerOnline: true,
            daemonVersion: '27.1.1-ce',
            apiEndpoint: '/var/run/docker.sock',
            runningContainers: 2,
            totalContainers: 4,
            containers: [
              { id: 'c108a94fd32b', name: 'hermes-agent-core', image: 'ghcr.io/nousresearch/hermes-agent:latest', status: 'Up 4 hours', ports: '0.0.0.0:8080->8080/tcp' },
              { id: 'e4991ac89b10', name: 'picoclaw-edge', image: 'sipeed/picoclaw:latest', status: 'Up 8 hours', ports: '0.0.0.0:8083->8083/tcp' },
              { id: 'b94101e4aa22', name: 'zeroclaw-daemon', image: 'zeroclaw/zeroclaw:latest', status: 'Exited (0) 2 hours ago', ports: '0.0.0.0:8081->8081/tcp' }
            ]
          }));
        }

        // 6. Diagnostics Logs
        case '/api/diagnostics/logs': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] 200 OK: /api/diagnostics/logs`);
          return res.end(JSON.stringify({
            logs: [
              `[${timestamp}] [SYSTEM] Clawdock container daemon v2.4 initialized.`,
              `[${timestamp}] [DOCKER] Bridge network clawdock-net active at 172.28.0.0/16.`,
              `[${timestamp}] [EVEROS] Memory graph synchronization active.`
            ]
          }));
        }

        // 7. AI Chat Endpoint
        case '/api/chat': {
          res.setHeader('Content-Type', 'application/json');
          const body = await readRequestBody(req);
          console.log(`[Vite API Server] [${timestamp}] 200 OK: POST /api/chat`);
          return res.end(JSON.stringify({
            success: true,
            response: `[Clawdock Simulator] Received message "${body?.message || ''}". Agent is fully active in container.`
          }));
        }

        default: {
          // Dynamic router fallback: Match agentConfigMatch and agentActionMatch with exact pathname logging

          // Individual Agent Config: /api/agents/:id/config
          const agentConfigMatch = pathname.match(/^\/api\/agents\/([^/]+)\/config$/);
          if (agentConfigMatch) {
            const agentId = agentConfigMatch[1];
            console.log(`[Vite API Server] [${timestamp}] Regex matched agentConfigMatch on exact pathname: "${pathname}" -> agentId="${agentId}"`);

            res.setHeader('Content-Type', 'application/json');

            if (agentId === 'all') {
              const agentIds = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
              const configs: Record<string, any> = {};
              for (const id of agentIds) {
                configs[id] = getAgentConfig(id);
              }
              return res.end(JSON.stringify({ success: true, configs }));
            }

            if (method === 'GET') {
              console.log(`[Vite API Server] [${timestamp}] 200 OK: GET /api/agents/${agentId}/config`);
              const cfg = getAgentConfig(agentId);
              return res.end(JSON.stringify(cfg));
            }

            if (method === 'PUT' || method === 'POST') {
              const body = await readRequestBody(req);
              console.log(`[Vite API Server] [${timestamp}] 200 OK: ${method} /api/agents/${agentId}/config - Writing config`);
              const nativeContent = body.nativeContent;
              const restart = body.restart !== false && body.restartContainer !== false;

              const fallback = defaultNativeFiles[agentId] || defaultNativeFiles['hermes-agent'];
              const fileName = fallback.fileName;
              const filePath = path.join(dataDir, fileName);

              if (typeof nativeContent === 'string') {
                try {
                  fs.writeFileSync(filePath, nativeContent, 'utf8');
                } catch {}
                try {
                  const rootPath = `/data/clawdock/${fileName}`;
                  if (fs.existsSync('/data/clawdock')) {
                    fs.writeFileSync(rootPath, nativeContent, 'utf8');
                  }
                } catch {}
              }

              // Update persistence file with config
              try {
                const pFile = path.join(dataDir, 'persistence.json');
                let pObj: any = {};
                if (fs.existsSync(pFile)) {
                  pObj = JSON.parse(fs.readFileSync(pFile, 'utf8'));
                }
                if (!pObj.configs) pObj.configs = {};
                pObj.configs[agentId] = body.config || body;
                fs.writeFileSync(pFile, JSON.stringify(pObj, null, 2), 'utf8');
              } catch {}

              // Update state to restarting then running
              if (restart && agentStates[agentId]) {
                agentStates[agentId].status = 'restarting';
                agentStates[agentId].logs.push(`[Docker Engine] Config saved to ${filePath}. Restarting container...`);
                setTimeout(() => {
                  if (agentStates[agentId]) {
                    agentStates[agentId].status = 'running';
                    agentStates[agentId].logs.push(`[Docker Engine] Container restarted with updated settings.`);
                  }
                }, 1200);
              }

              const updatedCfg = getAgentConfig(agentId);
              return res.end(JSON.stringify({
                success: true,
                agentId,
                filePath: `data/clawdock/${fileName}`,
                restarted: restart,
                nativeContent: updatedCfg.nativeContent,
                configSchema: updatedCfg.configSchema
              }));
            }
          }

          // Agent Lifecycle Actions: /api/agents/:id/:action
          const agentActionMatch = pathname.match(/^\/api\/agents\/([^/]+)\/(start|stop|install|detect|logs|docker-exec-config)$/);
          if (agentActionMatch) {
            const agentId = agentActionMatch[1];
            const action = agentActionMatch[2];
            console.log(`[Vite API Server] [${timestamp}] Regex matched agentActionMatch on exact pathname: "${pathname}" -> agentId="${agentId}", action="${action}"`);

            res.setHeader('Content-Type', 'application/json');
            console.log(`[Vite API Server] [${timestamp}] 200 OK: ${method} /api/agents/${agentId}/${action}`);

            if (action === 'start') {
              if (agentStates[agentId]) {
                agentStates[agentId].status = 'running';
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Container started.`);
              }
              return res.end(JSON.stringify({ success: true, status: 'running' }));
            }

            if (action === 'stop') {
              if (agentStates[agentId]) {
                agentStates[agentId].status = 'stopped';
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Container stopped.`);
              }
              return res.end(JSON.stringify({ success: true, status: 'stopped' }));
            }

            if (action === 'install') {
              return res.end(JSON.stringify({ success: true, status: 'installed' }));
            }

            if (action === 'detect') {
              return res.end(JSON.stringify({ success: true, detected: true, agentId }));
            }

            if (action === 'logs') {
              const current = agentStates[agentId];
              return res.end(JSON.stringify({ success: true, logs: current ? current.logs : [] }));
            }

            if (action === 'docker-exec-config') {
              if (method !== 'GET' && method !== 'POST') {
                res.statusCode = 405;
                return res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use GET or POST.' }));
              }
              const cfg = getAgentConfig(agentId);
              return res.end(JSON.stringify({
                success: true,
                agentId,
                nativeFileName: cfg.nativeFileName,
                nativeFormat: cfg.nativeFormat,
                nativeContent: cfg.nativeContent,
                filePath: `data/clawdock/${cfg.nativeFileName}`,
                configSchema: cfg.configSchema,
                config: cfg.configSchema,
                source: 'vite_api_docker_exec'
              }));
            }
          }

          // EverOS Memory Hub endpoints
          if (pathname.startsWith('/api/everos/')) {
            res.setHeader('Content-Type', 'application/json');
            console.log(`[Vite API Server] [${timestamp}] 200 OK: EverOS endpoint ${pathname}`);
            if (pathname === '/api/everos/status') {
              return res.end(JSON.stringify({
                status: 'online',
                daemonVersion: 'v2.1.0',
                backend: 'everos-vector-graph',
                totalMemories: 1420,
                activeBots: ['hermes-agent', 'openclaw', 'zeroclaw', 'picoclaw']
              }));
            }
            return res.end(JSON.stringify({ success: true, count: 0, items: [] }));
          }

          console.warn(`[Vite API Server] [${timestamp}] Unhandled API route: ${method} ${pathname}`);
          next();
        }
      }
    };
  }

  return {
    name: 'clawdock-api-server',
    configureServer(server) {
      server.middlewares.use(createApiHandler());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiHandler());
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    }
  };
});
