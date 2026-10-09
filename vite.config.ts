import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { OFFICIAL_MCP_REGISTRY, OFFICIAL_MCP_CATEGORIES } from './src/data/officialMcpServers';

function readRequestBody(req: any): Promise<any> {
  if (req.bodyPayload !== undefined) {
    return Promise.resolve(req.bodyPayload);
  }
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    req.bodyPayload = req.body;
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        req.bodyPayload = {};
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        req.bodyPayload = parsed;
        resolve(parsed);
      } catch {
        req.bodyPayload = { raw: body };
        resolve({ raw: body });
      }
    });
    req.on('error', () => {
      req.bodyPayload = {};
      resolve({});
    });
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
      status: 'stopped',
      containerId: 'e821903ba11c',
      containerName: 'openclaw-gateway',
      version: 'v1.2.0',
      memoryUsageMb: 94.5,
      cpuUsagePct: 0.8,
      uptimeSeconds: 0,
      logs: [
        '[openclaw-gateway] loading configuration…',
        '[openclaw-gateway] resolving authentication…',
        '[openclaw-gateway] starting...',
        '[state/db] state database schema migration pending; verifying integrity first',
        '[lifecycle] crash-loop breaker state unavailable; fail-open: OpenClawStateDatabaseSchemaMigrationRequiredError: OpenClaw state database schema migration required (audit-events-v2) at /home/openclaw/state/openclaw.sqlite; run openclaw doctor --fix to migrate it.',
        '[gateway] requires workspace setup state migration. Stop the service with openclaw gateway stop, then run openclaw doctor --fix, then start it again.'
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
    payload?: any;
    requestHeaders?: any;
    stackTrace?: string;
  }

  let serverRequestLogs: ServerRequestLog[] = [];

  // Seed initial recorded requests for immediate visualization
  const initialEndpoints = [
    { method: 'GET', path: '/api/health', baseMs: 14 },
    { method: 'GET', path: '/api/agents/all/config', baseMs: 42 },
    { method: 'GET', path: '/api/models', baseMs: 78 },
    { method: 'GET', path: '/api/diagnostics/request-logs', baseMs: 9 },
    { method: 'GET', path: '/api/diagnostics/logs', baseMs: 16 },
    { method: 'GET', path: '/api/docker/status', baseMs: 60 },
    { method: 'POST', path: '/api/test-conn-v2', baseMs: 115 },
    { method: 'GET', path: '/api/app/version', baseMs: 11 },
    { method: 'GET', path: '/api/agents/hermes-agent/status', baseMs: 28 },
    { method: 'GET', path: '/api/agents/zeroclaw/config', baseMs: 34 },
    { method: 'POST', path: '/api/save-config', baseMs: 92 }
  ];

  const seedNow = Date.now();
  for (let i = 0; i < 50; i++) {
    const ep = initialEndpoints[i % initialEndpoints.length];
    const jitter = Math.floor(Math.sin(i * 0.8) * 22) + (i % 7 === 0 ? 45 : 0);
    const durationMs = Math.max(6, ep.baseMs + jitter);
    const status = (i === 17) ? 404 : (i === 39) ? 500 : 200;
    serverRequestLogs.push({
      id: 'req_init_' + (50 - i),
      timestamp: new Date(seedNow - i * 14000).toISOString(),
      method: ep.method,
      url: ep.path,
      pathname: ep.path,
      status,
      durationMs,
      clientIp: '127.0.0.1',
      requestHeaders: {
        'host': '127.0.0.1:3000',
        'accept': 'application/json',
        'user-agent': 'Clawdock-Diagnostic-Probe/1.0'
      },
      payload: ep.method === 'POST' ? { agentId: 'hermes-agent', sync: true } : undefined,
      stackTrace: status === 500 ? `Error: Internal Server Error on ${ep.path}\n    at handleRequest (vite.config.ts:1380:11)` : undefined
    });
  }

  // Seed recent 405 error on /api/persistence/commit to allow immediate visual inspection
  serverRequestLogs.unshift({
    id: 'req_init_405_mismatch',
    timestamp: new Date(seedNow - 25000).toISOString(),
    method: 'DELETE',
    url: '/api/persistence/commit',
    pathname: '/api/persistence/commit',
    status: 405,
    durationMs: 12,
    clientIp: '127.0.0.1',
    requestHeaders: {
      'host': '127.0.0.1:3000',
      'content-type': 'application/json',
      'accept': 'application/json',
      'origin': 'http://127.0.0.1:3000'
    },
    payload: {
      agentId: 'hermes-agent',
      action: 'unauthorized_clear_persistence',
      reason: 'test_method_mismatch'
    },
    stackTrace: `[Router Validation Mismatch Error] HTTP method mismatch on endpoint /api/persistence/commit.
Invoked Method: DELETE.
Registered & Allowed Methods for this pattern: GET, POST, PUT
    at Router.validateMethod (vite.config.ts:1326:27)
    at Router.handle (vite.config.ts:1374:31)
    at apiHandler (vite.config.ts:2553:28)`
  });

  function recordServerLog(entry: ServerRequestLog) {
    serverRequestLogs.unshift(entry);
    if (serverRequestLogs.length > 200) {
      serverRequestLogs.pop();
    }
  }

  const defaultNativeFiles: Record<string, { fileName: string; format: string; content: string }> = {
    'hermes-agent': {
      fileName: 'config.yaml',
      format: 'yaml',
      content: `version: "1.0.0"
agent_id: "hermes-agent"
agent_name: "Hermes Code Assistant"
persona: "Hermes Prime"
system_preset: "engineer"
system_prompt: "You are Hermes Agent, a premier autonomous software engineering and problem-solving AI agent. You have direct access to workspace tools, shell execution, and persistent memory. Always structure complex tasks into clear execution steps, verify your code with tests or linters, and document non-trivial architecture decisions."

model:
  provider: custom
  apiKey: ollama
  temperature: 0.3
  reasoningEffort: high
  maxTokens: 8192
  contextWindow: 200000
  baseUrl: http://192.168.1.49:11434
  topP: 0.95
  default: gemma4-soul:latest
  base_url: http://192.168.1.49:11434/v1

web:
  backend: exa
  provider_tier:
    exa: free

moa:
  enabled: true
  presets:
    default:
      reference_models:
        - provider: custom:ollama
          model: gemma4-soul:latest
          enabled: true
        - provider: custom:ollama
          model: deepseek-coder-v2:16b
          enabled: true
        - provider: custom:ollama
          model: qwen2-5-coder-7b-32k:latest
          enabled: true
      aggregator:
        provider: custom:ollama
        model: gemma4-soul:latest
      degraded_reference_policy: loud
      fanout: user_turn
  reference_models:
    - provider: custom:ollama
      model: gemma4-soul:latest
      enabled: true
    - provider: custom:ollama
      model: deepseek-coder-v2:16b
      enabled: true
    - provider: custom:ollama
      model: qwen2-5-coder-7b-32k:latest
      enabled: true
  aggregator:
    provider: custom:ollama
    model: gemma4-soul:latest
  degraded_reference_policy: loud
  max_tokens: 4096
  fanout: user_turn
  rounds: 2
  temperature_spread: 0.3
  consensus_threshold: 0.85

fallback:
  enabled: true
  strategy: "on_offline"
  target_agent_id: "zeroclaw"
  latency_threshold_ms: 3000
  provider: "openrouter"
  model: "anthropic/claude-3.7-sonnet"
  api_key: ""
  base_url: "https://openrouter.ai/api/v1"
  use_proxy: true

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

env:
  HERMES_LOG_LEVEL: "INFO"
  PYTHONUNBUFFERED: "1"
  WORKSPACE_ROOT: "/workspace"
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
      "enabled": false,
      "bot_token": "env:TELEGRAM_BOT_TOKEN",
      "allowed_users": "@developer"
    },
    "discord": {
      "enabled": true,
      "bot_token": "env:DISCORD_BOT_TOKEN",
      "client_id": "env:DISCORD_CLIENT_ID",
      "guild_ids": "env:DISCORD_GUILD_ID"
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

  function ensureDataDir() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch {}
    try {
      if (!fs.existsSync('/data/clawdock')) {
        fs.mkdirSync('/data/clawdock', { recursive: true });
      }
    } catch {}
  }

  function convertConfigToNativeContent(agentId: string, cfg: any, format: string): string {
    const modelProv = cfg?.model?.provider || 'anthropic';
    const modelName = cfg?.model?.model || cfg?.model?.default || 'claude-3-7-sonnet';
    const temp = cfg?.model?.temperature ?? 0.3;
    const maxTok = cfg?.model?.max_tokens ?? 4096;
    const ctxWin = cfg?.model?.context_window ?? 128000;
    const baseUrl = cfg?.model?.baseUrl || cfg?.model?.base_url || '';
    const apiKey = cfg?.model?.apiKey || cfg?.model?.api_key || '';
    const systemPrompt = cfg?.system?.system_prompt || cfg?.system?.systemPrompt || 'Autonomous agent.';
    const preset = cfg?.system?.preset || 'engineer';

    const fb = cfg?.fallback || {};
    const fbEn = fb.enabled !== undefined ? fb.enabled : true;
    const fbProv = fb.provider || fb.fallbackProvider || 'ollama';
    const fbMod = fb.model || fb.fallbackModel || 'gemma4-soul:latest';
    const fbKey = fb.apiKey || '';
    const fbBase = fb.baseUrl || '';

    if (format === 'json') {
      return JSON.stringify(cfg, null, 2);
    } else if (format === 'toml') {
      return `version = "1.0.0"
agent_id = "${agentId}"
agent_name = "${cfg?.agentName || agentId}"
system_preset = "${preset}"

[model]
provider = "${modelProv}"
model = "${modelName}"
temperature = ${temp}
max_tokens = ${maxTok}
context_window = ${ctxWin}
base_url = "${baseUrl}"
api_key = "${apiKey}"

[system]
system_prompt = "${systemPrompt.replace(/"/g, '\\"')}"

[fallback]
enabled = ${fbEn}
provider = "${fbProv}"
model = "${fbMod}"
base_url = "${fbBase}"
api_key = "${fbKey}"
`;
    } else {
      const moa = cfg?.moa || {};
      const moaEn = moa.enabled !== undefined ? moa.enabled : true;
      let aggMod = moa.aggregatorModel || modelName || 'gemma4-soul:latest';
      if (aggMod === 'latest') aggMod = 'gemma4-soul:latest';
      if (aggMod === '16b') aggMod = 'deepseek-coder-v2:16b';

      const proposers = (moa.proposerModels && moa.proposerModels.length > 0)
        ? moa.proposerModels.map((p: any) => {
            const s = typeof p === 'string' ? p : (p?.model || p?.name);
            return s === 'latest' ? 'gemma4-soul:latest' : s === '16b' ? 'deepseek-coder-v2:16b' : s;
          }).filter(Boolean)
        : ['gemma4-soul:latest', 'deepseek-coder-v2:16b', 'qwen2-5-coder-7b-32k:latest'];

      const localBaseUrl = baseUrl || 'http://192.168.1.49:11434';
      const localBaseUrlV1 = localBaseUrl.endsWith('/v1') ? localBaseUrl : `${localBaseUrl}/v1`;

      const uniqueProvMap = new Map<string, string>();
      if (aggMod) uniqueProvMap.set(aggMod, 'custom');
      proposers.forEach((p: string) => {
        if (p) uniqueProvMap.set(p, 'custom');
      });
      const providerMappingLines = Array.from(uniqueProvMap.entries())
        .map(([k, v]) => `    ${k}: "${v}"`)
        .join('\n');

      const refList = proposers.map((p: string) => `        - provider: custom
          model: ${p}
          base_url: ${localBaseUrlV1}
          api_key: ${apiKey || 'ollama'}
          enabled: true`).join('\n');

      return `version: "1.0.0"
agent_id: "${agentId}"
agent_name: "${cfg?.agentName || agentId}"
persona: "Hermes Prime"
system_preset: "${preset}"

model:
  provider: "${modelProv === 'ollama' ? 'custom' : modelProv}"
  model: "${modelName === 'latest' ? 'gemma4-soul:latest' : modelName}"
  temperature: ${temp}
  max_tokens: ${maxTok}
  context_window: ${ctxWin}
  base_url: "${localBaseUrlV1}"
  baseUrl: "${localBaseUrl}"
  api_key: "${apiKey || 'ollama'}"

system:
  system_prompt: "${systemPrompt.replace(/"/g, '\\"')}"
  language: "en-US"

moa:
  enabled: ${moaEn}
  provider_endpoints:
    custom: "${localBaseUrl}"
    ollama: "${localBaseUrl}"
    custom:ollama: "${localBaseUrl}"
    local-ollama: "${localBaseUrl}"
  provider_mapping:
${providerMappingLines}
  presets:
    default:
      reference_models:
${refList}
      aggregator:
        provider: custom
        model: ${aggMod}
        base_url: ${localBaseUrlV1}
        api_key: ${apiKey || 'ollama'}
      degraded_reference_policy: loud
      fanout: user_turn
  reference_models:
${refList}
  aggregator:
    provider: custom
    model: ${aggMod}
    base_url: ${localBaseUrlV1}
    api_key: ${apiKey || 'ollama'}
  degraded_reference_policy: loud
  max_tokens: 4096
  fanout: user_turn
  rounds: ${moa.rounds ?? 2}
  temperature_spread: ${moa.temperatureSpread ?? 0.3}
  consensus_threshold: ${moa.consensusThreshold ?? 0.85}

fallback:
  enabled: ${fbEn}
  provider: "${fbProv}"
  model: "${fbMod}"
  base_url: "${fbBase}"
  api_key: "${fbKey}"
`;
    }
  }

  function parseConfigSchema(agentId: string, nativeContent: string, format: string) {
    const detectedFormat = format || (nativeContent.trim().startsWith('{') ? 'json' : nativeContent.includes('=') ? 'toml' : 'yaml');
    let parsedAgentName = agentId;
    let parsedModelProvider = 'anthropic';
    let parsedModelName = '';
    let parsedTemperature = 0.3;
    let parsedSystemPrompt = 'Autonomous agent.';
    let parsedPreset = 'engineer';
    let parsedBaseUrl = '';
    let parsedContextLength = 128000;
    let parsedMaxTokens = 4096;
    let parsedApiKey = '';
    let parsedAggregatorModel = '';
    let parsedProposerModels: string[] | null = null;
    let parsedMoaEnabled = agentId === 'hermes-agent';

    let parsedFallback: any = {
      enabled: agentId === 'hermes-agent' || agentId === 'openclaw',
      targetAgentId: agentId === 'zeroclaw' ? 'picoclaw' : agentId === 'openclaw' ? 'hermes-agent' : 'zeroclaw',
      strategy: agentId === 'picoclaw' ? 'on_latency' : agentId === 'openclaw' ? 'on_error' : 'on_offline',
      latencyThresholdMs: 3000,
      fallbackProvider: agentId === 'zeroclaw' ? 'mistral' : agentId === 'openclaw' ? 'deepseek' : 'ollama',
      fallbackModel: agentId === 'zeroclaw' ? 'mistral-7b-instruct' : agentId === 'openclaw' ? 'deepseek-chat' : agentId === 'picoclaw' ? 'picolm-1.1b' : 'hermes-3-llama-3.1-8b',
      provider: agentId === 'zeroclaw' ? 'mistral' : agentId === 'openclaw' ? 'deepseek' : 'ollama',
      model: agentId === 'zeroclaw' ? 'mistral-7b-instruct' : agentId === 'openclaw' ? 'deepseek-chat' : agentId === 'picoclaw' ? 'picolm-1.1b' : 'hermes-3-llama-3.1-8b',
      apiKey: '',
      baseUrl: '',
      useProxy: true
    };

    try {
      const pFile = path.join(dataDir, 'persistence.json');
      if (fs.existsSync(pFile)) {
        const pObj = JSON.parse(fs.readFileSync(pFile, 'utf8'));
        const stored = pObj?.configs?.[agentId];
        if (stored?.fallback) {
          parsedFallback = {
            ...parsedFallback,
            ...stored.fallback
          };
        }
      }
    } catch {}

    try {
      if (format === 'json') {
        const json = JSON.parse(nativeContent);
        if (json.agent_name || json.agentName) parsedAgentName = json.agent_name || json.agentName;
        if (json.model) {
          const m = json.model;
          if (m.provider) parsedModelProvider = m.provider;
          const candidateModel = m.default || m.model || m.model_name || m.checkpoint;
          if (candidateModel && candidateModel !== 'provider:') parsedModelName = candidateModel;
          if (m.base_url || m.baseUrl || m.api_base) parsedBaseUrl = m.base_url || m.baseUrl || m.api_base;
          if (m.context_length !== undefined) parsedContextLength = Number(m.context_length);
          else if (m.num_ctx !== undefined) parsedContextLength = Number(m.num_ctx);
          else if (m.context_window !== undefined) parsedContextLength = Number(m.context_window);
          if (m.max_tokens !== undefined) parsedMaxTokens = Number(m.max_tokens);
          else if (m.num_predict !== undefined) parsedMaxTokens = Number(m.num_predict);
          if (m.temperature !== undefined) parsedTemperature = Number(m.temperature);
          if (m.api_key || m.apiKey) parsedApiKey = m.api_key || m.apiKey;
        }
        if (json.system) {
          if (json.system.system_prompt || json.system.systemPrompt) parsedSystemPrompt = json.system.system_prompt || json.system.systemPrompt;
          if (json.system.preset) parsedPreset = json.system.preset;
        }
        if (json.moa) {
          if (json.moa.aggregator_model || json.moa.aggregatorModel) parsedAggregatorModel = json.moa.aggregator_model || json.moa.aggregatorModel;
          if (json.moa.proposer_models || json.moa.proposerModels) parsedProposerModels = json.moa.proposer_models || json.moa.proposerModels;
          if (typeof json.moa.enabled === 'boolean') parsedMoaEnabled = json.moa.enabled;
        }
        if (json.fallback && typeof json.fallback === 'object') {
          const fb = json.fallback;
          parsedFallback = {
            ...parsedFallback,
            ...fb,
            enabled: fb.enabled !== undefined ? Boolean(fb.enabled) : parsedFallback.enabled,
            apiKey: fb.apiKey || fb.api_key || parsedFallback.apiKey || '',
            baseUrl: fb.baseUrl || fb.base_url || parsedFallback.baseUrl || '',
            provider: fb.provider || fb.fallbackProvider || fb.fallback_provider || parsedFallback.provider,
            model: fb.model || fb.fallbackModel || fb.fallback_model || parsedFallback.model
          };
        }
      } else if (format === 'toml') {
        const matchName = nativeContent.match(/agent_name\s*=\s*["']([^"']+)["']/);
        if (matchName) parsedAgentName = matchName[1];
        const matchProv = nativeContent.match(/provider\s*=\s*["']([^"']+)["']/);
        if (matchProv) parsedModelProvider = matchProv[1];
        const matchModel = nativeContent.match(/(?:default|model|model_name)\s*=\s*["']([^"']+)["']/);
        if (matchModel && matchModel[1] !== 'provider:') parsedModelName = matchModel[1];
        const matchBase = nativeContent.match(/(?:base_url|baseUrl|api_base)\s*=\s*["']([^"']+)["']/);
        if (matchBase) parsedBaseUrl = matchBase[1];
        const matchCtx = nativeContent.match(/(?:context_length|num_ctx|context_window)\s*=\s*([0-9]+)/);
        if (matchCtx) parsedContextLength = Number(matchCtx[1]);
        const matchMax = nativeContent.match(/(?:max_tokens|num_predict)\s*=\s*([0-9]+)/);
        if (matchMax) parsedMaxTokens = Number(matchMax[1]);
        const matchTemp = nativeContent.match(/temperature\s*=\s*([0-9.]+)/);
        if (matchTemp) parsedTemperature = Number(matchTemp[1]);
        const matchPrompt = nativeContent.match(/system_prompt\s*=\s*["']([^"']+)["']/);
        if (matchPrompt) parsedSystemPrompt = matchPrompt[1];
        const matchPreset = nativeContent.match(/preset\s*=\s*["']([^"']+)["']/);
        if (matchPreset) parsedPreset = matchPreset[1];

        const fbMatch = nativeContent.match(/\[fallback\]([\s\S]*?)(?=\n\[|$)/i);
        if (fbMatch) {
          const fbText = fbMatch[1];
          const en = fbText.match(/enabled\s*=\s*(true|false)/i);
          const prov = fbText.match(/(?:provider|fallback_provider)\s*=\s*["']([^"']+)["']/i);
          const mod = fbText.match(/(?:model|fallback_model)\s*=\s*["']([^"']+)["']/i);
          const key = fbText.match(/(?:api_key|apiKey)\s*=\s*["']([^"']+)["']/i);
          const base = fbText.match(/(?:base_url|baseUrl)\s*=\s*["']([^"']+)["']/i);
          const strat = fbText.match(/strategy\s*=\s*["']([^"']+)["']/i);
          const target = fbText.match(/(?:target_agent_id|targetAgentId)\s*=\s*["']([^"']+)["']/i);
          const lat = fbText.match(/(?:latency_threshold_ms|latencyThresholdMs)\s*=\s*([0-9]+)/i);
          const proxy = fbText.match(/(?:use_proxy|useProxy)\s*=\s*(true|false)/i);
          if (en) parsedFallback.enabled = en[1].toLowerCase() === 'true';
          if (prov) { parsedFallback.provider = prov[1]; parsedFallback.fallbackProvider = prov[1]; }
          if (mod) { parsedFallback.model = mod[1]; parsedFallback.fallbackModel = mod[1]; }
          if (key && key[1]) parsedFallback.apiKey = key[1];
          if (base && base[1]) parsedFallback.baseUrl = base[1];
          if (strat) parsedFallback.strategy = strat[1];
          if (target) parsedFallback.targetAgentId = target[1];
          if (lat) parsedFallback.latencyThresholdMs = Number(lat[1]);
          if (proxy) parsedFallback.useProxy = proxy[1].toLowerCase() === 'true';
        }
      } else {
        // YAML
        const matchName = nativeContent.match(/agent_name:\s*"([^"]+)"|agent_name:\s*([^\n]+)/);
        if (matchName) parsedAgentName = (matchName[1] || matchName[2]).trim();

        const modelBlockMatch = nativeContent.match(/model:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
        const searchTarget = modelBlockMatch ? modelBlockMatch[1] : nativeContent;

        const pMatch = searchTarget.match(/provider:\s*["']?([^"'\s\n#]+)["']?/);
        if (pMatch && pMatch[1]) parsedModelProvider = pMatch[1].trim();

        // Model name: match default:, model:, model_name:, checkpoint:
        const defMatch = searchTarget.match(/default:\s*["']?([^"'\s\n#]+)["']?/);
        const mMatch = searchTarget.match(/(?:model|model_name|checkpoint):\s*["']?([^"'\s\n#]+)["']?/);
        if (defMatch && defMatch[1]) {
          parsedModelName = defMatch[1].trim();
        } else if (mMatch && mMatch[1] && mMatch[1] !== 'provider:') {
          parsedModelName = mMatch[1].trim();
        }

        const bMatch = searchTarget.match(/(?:base_url|baseUrl|api_base):\s*["']?([^"'\s\n#]+)["']?/);
        if (bMatch && bMatch[1]) parsedBaseUrl = bMatch[1].trim();

        const cMatch = searchTarget.match(/(?:context_length|num_ctx|context_window):\s*([0-9]+)/);
        if (cMatch && cMatch[1]) parsedContextLength = Number(cMatch[1]);

        const maxMatch = searchTarget.match(/(?:max_tokens|num_predict):\s*([0-9]+)/);
        if (maxMatch && maxMatch[1]) parsedMaxTokens = Number(maxMatch[1]);

        const tMatch = searchTarget.match(/temperature:\s*([0-9.]+)/);
        if (tMatch) parsedTemperature = Number(tMatch[1]);

        const keyMatch = searchTarget.match(/(?:api_key|apiKey):\s*["']?([^"'\s\n#]+)["']?/);
        if (keyMatch && keyMatch[1]) parsedApiKey = keyMatch[1].trim();

        const matchPrompt = nativeContent.match(/system_prompt:\s*"([^"]+)"|system_prompt:\s*([^\n]+)/);
        if (matchPrompt) parsedSystemPrompt = (matchPrompt[1] || matchPrompt[2]).trim();
        const matchPreset = nativeContent.match(/system_preset:\s*"([^"]+)"|system_preset:\s*([^\n]+)/);
        if (matchPreset) parsedPreset = (matchPreset[1] || matchPreset[2]).trim();

        const moaBlockMatch = nativeContent.match(/moa:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
        if (moaBlockMatch) {
          const moaBlock = moaBlockMatch[1];
          const aggMatch = moaBlock.match(/(?:aggregator_model|aggregatorModel):\s*["']?([^"'\s\n#]+)["']?/);
          if (aggMatch && aggMatch[1]) parsedAggregatorModel = aggMatch[1].trim();
          const enMatch = moaBlock.match(/enabled:\s*(true|false)/i);
          if (enMatch) parsedMoaEnabled = enMatch[1].toLowerCase() === 'true';
        }

        const fbMatch = nativeContent.match(/fallback:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
        if (fbMatch) {
          const fbText = fbMatch[1];
          const en = fbText.match(/enabled:\s*(true|false)/i);
          const prov = fbText.match(/(?:provider|fallback_provider):\s*["']?([^"'\n\r]+)["']?/i);
          const mod = fbText.match(/(?:model|fallback_model):\s*["']?([^"'\n\r]+)["']?/i);
          const key = fbText.match(/(?:api_key|apiKey):\s*["']?([^"'\n\r]+)["']?/i);
          const base = fbText.match(/(?:base_url|baseUrl):\s*["']?([^"'\n\r]+)["']?/i);
          const strat = fbText.match(/strategy:\s*["']?([^"'\n\r]+)["']?/i);
          const target = fbText.match(/(?:target_agent_id|targetAgentId):\s*["']?([^"'\n\r]+)["']?/i);
          const lat = fbText.match(/(?:latency_threshold_ms|latencyThresholdMs):\s*([0-9]+)/i);
          const proxy = fbText.match(/(?:use_proxy|useProxy):\s*(true|false)/i);
          if (en) parsedFallback.enabled = en[1].toLowerCase() === 'true';
          if (prov) { parsedFallback.provider = prov[1].trim(); parsedFallback.fallbackProvider = prov[1].trim(); }
          if (mod) { parsedFallback.model = mod[1].trim(); parsedFallback.fallbackModel = mod[1].trim(); }
          if (key && key[1].trim()) parsedFallback.apiKey = key[1].trim();
          if (base && base[1].trim()) parsedFallback.baseUrl = base[1].trim();
          if (strat) parsedFallback.strategy = strat[1].trim();
          if (target) parsedFallback.targetAgentId = target[1].trim();
          if (lat) parsedFallback.latencyThresholdMs = Number(lat[1]);
          if (proxy) parsedFallback.useProxy = proxy[1].toLowerCase() === 'true';
        }
      }

      if (!parsedModelName || parsedModelName === 'provider:') {
        parsedModelName = agentId === 'zeroclaw' ? 'deepseek-r1' : agentId === 'openclaw' ? 'gpt-4o' : agentId === 'picoclaw' ? 'qwen2.5-coder:7b' : 'claude-3-7-sonnet';
      }
    } catch {}

    const isLocal = (
      parsedModelProvider === 'ollama' ||
      parsedModelProvider === 'custom' ||
      (parsedBaseUrl && (
        parsedBaseUrl.includes('11434') ||
        parsedBaseUrl.includes('192.168.') ||
        parsedBaseUrl.includes('10.') ||
        parsedBaseUrl.includes('localhost') ||
        parsedBaseUrl.includes('127.0.0.1')
      )) ||
      parsedModelName.includes('coder') ||
      parsedModelName.includes('soul') ||
      parsedModelName.includes('latest')
    );

    const defaultAggregator = isLocal ? parsedModelName : 'claude-3-7-sonnet';
    const finalAggregator = parsedAggregatorModel || defaultAggregator;
    const defaultProposers = isLocal 
      ? [parsedModelName, 'qwen2.5-coder:7b', 'deepseek-r1:8b']
      : ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'];
    const finalProposers = parsedProposerModels || defaultProposers;

    let isDiscordEnabled = agentId === 'picoclaw';
    let isTelegramEnabled = agentId !== 'picoclaw';

    const parseBoolVal = (val: any, fallback: boolean): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      return fallback;
    };

    try {
      if (detectedFormat === 'json') {
        const json = JSON.parse(nativeContent);
        const ch = json.channels || json.channel || {};
        const disc = ch.discord || json.discord;
        const tel = ch.telegram || json.telegram;
        if (disc && disc.enabled !== undefined) {
          isDiscordEnabled = parseBoolVal(disc.enabled, isDiscordEnabled);
        }
        if (tel && tel.enabled !== undefined) {
          isTelegramEnabled = parseBoolVal(tel.enabled, isTelegramEnabled);
        }
      } else {
        // YAML / TOML regex fallback
        if (nativeContent.includes('discord')) {
          const discMatch = nativeContent.match(/discord[\s\S]*?enabled[:=]\s*["']?(true|false|1|0|yes|no)["']?/i);
          if (discMatch) {
            isDiscordEnabled = parseBoolVal(discMatch[1], isDiscordEnabled);
          }
        }
        if (nativeContent.includes('telegram')) {
          const telMatch = nativeContent.match(/telegram[\s\S]*?enabled[:=]\s*["']?(true|false|1|0|yes|no)["']?/i);
          if (telMatch) {
            isTelegramEnabled = parseBoolVal(telMatch[1], isTelegramEnabled);
          }
        }
      }
    } catch (e: any) {
      console.warn(`[vite.config parseConfigSchema] Channel flag parse error for "${agentId}":`, e);
    }

    console.log(`[ConfigParser Debug] Raw source content & channel evaluation for "${agentId}":`, {
      agentId,
      detectedFormat,
      isDiscordEnabled,
      isTelegramEnabled,
      rawContent: nativeContent
    });

    return {
      agentId,
      version: '1.0.0',
      model: {
        provider: parsedModelProvider as any,
        model: parsedModelName,
        apiKey: parsedApiKey,
        baseUrl: parsedBaseUrl,
        temperature: parsedTemperature,
        reasoningEffort: 'high',
        maxTokens: parsedMaxTokens,
        contextWindow: parsedContextLength,
        topP: 0.95
      },
      channels: {
        telegram: {
          enabled: isTelegramEnabled,
          botToken: 'env:TELEGRAM_BOT_TOKEN',
          allowedUsers: '@developer',
          mode: 'polling'
        },
        discord: {
          enabled: isDiscordEnabled,
          botToken: 'env:DISCORD_BOT_TOKEN',
          clientId: 'env:DISCORD_CLIENT_ID',
          guildIds: 'env:DISCORD_GUILD_ID'
        },
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
        enabled: parsedMoaEnabled,
        proposerModels: finalProposers,
        aggregatorModel: finalAggregator,
        rounds: 2,
        temperatureSpread: 0.3,
        consensusThreshold: 0.85
      },
      customEnv: {
        CONTAINER_MOUNT_DIR: `/workspace/${agentId}`,
        LOG_LEVEL: 'info'
      },
      fallback: parsedFallback
    };
  }

  function getAgentConfig(agentId: string) {
    ensureDataDir();
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

    // Merge persistent overrides from persistence.json if available
    try {
      const pFile = path.join(dataDir, 'persistence.json');
      if (fs.existsSync(pFile)) {
        const pObj = JSON.parse(fs.readFileSync(pFile, 'utf8'));
        const stored = pObj?.configs?.[agentId];
        if (stored) {
          if (stored.model) {
            configSchema.model = {
              ...(configSchema.model || {}),
              ...stored.model
            };
          }
          if (stored.fallback) {
            configSchema.fallback = {
              ...(configSchema.fallback || {}),
              ...stored.fallback,
              apiKey: stored.fallback.apiKey || configSchema.fallback?.apiKey || '',
              baseUrl: stored.fallback.baseUrl || configSchema.fallback?.baseUrl || '',
              useProxy: stored.fallback.useProxy !== undefined ? stored.fallback.useProxy : (configSchema.fallback?.useProxy !== false)
            };
          }
        }
      }
    } catch {}

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

  // =========================================================================
  // OpenClaw VPS Synchronous Catalog Store
  // =========================================================================
  const OPENCLAW_VPS_SKILLS_URL = 'https://openclawvps.io/skills';
  const OPENCLAW_VPS_MCP_URL = 'https://openclawvps.io/skills/mcp';

  const OPENCLAW_SYNCHRONOUS_CATALOG = {
    skills: [
      {
        id: 'openclaw-vps-gateway',
        name: 'OpenClaw VPS Multi-Channel Gateway',
        category: 'web',
        description: 'Fetched from https://openclawvps.io/skills. Handles multi-channel routing across Discord, Telegram, and Slack via openclawvps.io.',
        version: '2.4.0',
        author: 'OpenClaw VPS Registry',
        sourceUrl: OPENCLAW_VPS_SKILLS_URL,
        installed: true,
        builtIn: true,
        requiresDocker: false,
        parameters: [
          { name: 'channel', type: 'string', description: 'telegram, discord, or slack', required: true },
          { name: 'payload', type: 'string', description: 'Message or event payload', required: true }
        ],
        skillMdContent: `---\nname: OpenClaw VPS Multi-Channel Gateway\ndescription: Multi-channel agent routing engine configured via https://openclawvps.io/skills.\nversion: 2.4.0\n---\n\n# OpenClaw VPS Instructions\nBridge multi-bot tasks across VPS channels.\n`
      },
      {
        id: 'openclaw-vps-mrag',
        name: 'OpenClaw VPS Vector Memory Sync',
        category: 'memory',
        description: 'Fetched from https://openclawvps.io/skills. Syncs vector embeddings and episodic memory nodes with openclawvps.io VPS storage.',
        version: '2.1.0',
        author: 'OpenClaw VPS Registry',
        sourceUrl: OPENCLAW_VPS_SKILLS_URL,
        installed: true,
        builtIn: false,
        requiresDocker: false,
        parameters: [
          { name: 'query', type: 'string', description: 'Memory search query', required: true }
        ],
        skillMdContent: `---\nname: OpenClaw VPS Vector Memory Sync\ndescription: Vector memory retrieval from https://openclawvps.io/skills.\nversion: 2.1.0\n---\n\n# Instructions\nPerform semantic search across OpenClaw VPS memory pools.\n`
      },
      {
        id: 'openclaw-vps-webhook-automation',
        name: 'OpenClaw VPS Webhook Automation Engine',
        category: 'system',
        description: 'Fetched from https://openclawvps.io/skills. Triggers REST webhook handlers and handles serverless event callbacks.',
        version: '1.9.0',
        author: 'OpenClaw VPS Registry',
        sourceUrl: OPENCLAW_VPS_SKILLS_URL,
        installed: true,
        builtIn: false,
        requiresDocker: true,
        parameters: [
          { name: 'webhook_url', type: 'string', description: 'Destination HTTP endpoint', required: true },
          { name: 'event_type', type: 'string', description: 'Name of the payload event', required: true }
        ],
        skillMdContent: `---\nname: OpenClaw VPS Webhook Automation Engine\ndescription: Event callback and webhook routing from https://openclawvps.io/skills.\nversion: 1.9.0\n---\n\n# Instructions\nDispatch webhook alerts securely to configured endpoints.\n`
      },
      {
        id: 'openclaw-vps-code-runner',
        name: 'OpenClaw VPS Code Sandbox Runner',
        category: 'system',
        description: 'Safely execute arbitrary Python, TypeScript, and Bash code snippets in an isolated VPS container sandbox.',
        version: '1.4.2',
        author: 'OpenClaw VPS Registry',
        sourceUrl: OPENCLAW_VPS_SKILLS_URL,
        installed: true,
        builtIn: false,
        requiresDocker: true,
        parameters: [
          { name: 'code', type: 'string', description: 'Source code snippet to execute', required: true },
          { name: 'language', type: 'string', description: 'python, typescript, or bash', required: true }
        ],
        skillMdContent: `---\nname: OpenClaw VPS Code Sandbox Runner\ndescription: Isolated code execution container on OpenClaw VPS.\nversion: 1.4.2\n---\n\n# Instructions\nExecute validated scripts inside ephemeral container sandboxes.\n`
      },
      {
        id: 'openclaw-vps-browser-automator',
        name: 'OpenClaw VPS Headless Browser Automator',
        category: 'web',
        description: 'Interact with dynamic websites, take screenshots, and extract unstructured web page contents using remote VPS browser.',
        version: '2.0.1',
        author: 'OpenClaw VPS Registry',
        sourceUrl: OPENCLAW_VPS_SKILLS_URL,
        installed: true,
        builtIn: false,
        requiresDocker: true,
        parameters: [
          { name: 'url', type: 'string', description: 'Target URL to navigate and extract', required: true }
        ],
        skillMdContent: `---\nname: OpenClaw VPS Headless Browser Automator\ndescription: Headless browser automation on OpenClaw VPS.\nversion: 2.0.1\n---\n\n# Instructions\nAutomate navigation and extraction tasks via remote Chromium instances.\n`
      }
    ],
    mcpServers: [
      {
        id: 'mcp-openclaw-vps-hub',
        name: 'OpenClaw VPS Remote MCP Hub',
        description: 'Remote MCP registry server connected to https://openclawvps.io/skills/mcp. Exposes VPS tool plugins and remote execution hooks for OpenClaw.',
        transport: 'sse',
        command: 'openclaw-mcp-client',
        args: ['--registry', 'https://openclawvps.io/skills/mcp', '--agent', 'openclaw'],
        env: {
          OPENCLAW_VPS_SKILLS_URL: OPENCLAW_VPS_SKILLS_URL,
          OPENCLAW_VPS_MCP_URL: OPENCLAW_VPS_MCP_URL
        },
        url: 'https://openclawvps.io/skills/mcp/sse',
        enabled: true,
        category: 'OpenClaw VPS',
        status: 'connected',
        toolsProvided: [
          'openclaw_vps_fetch_skills',
          'openclaw_vps_deploy_webhook',
          'openclaw_vps_gateway_route',
          'openclaw_vps_sync_mcp',
          'openclaw_vps_code_eval',
          'openclaw_vps_browser_session'
        ]
      }
    ]
  };

  // Shared in-memory cache for discovered models to prevent repetitive slow probes
  const modelDiscoveryCache = new Map<string, { timestamp: number; payload: string }>();

  /**
   * Extracts agentId, provider, and baseUrl parameters from query strings (and optional body)
   * regardless of parameter order, casing, or naming variations (e.g. snake_case, camelCase, kebab-case).
   */
  function extractModelQueryParams(
    parsedUrl: URL,
    body: any = {},
    pathname: string = ''
  ): { agentId: string; provider: string; baseUrl: string } {
    // Normalize query search parameters into a case-insensitive, punctuation-stripped map
    const normalizedParams = new Map<string, string>();

    parsedUrl.searchParams.forEach((value, key) => {
      const cleanKey = key.toLowerCase().replace(/[-_]/g, '');
      if (!normalizedParams.has(cleanKey) || normalizedParams.get(cleanKey) === '') {
        try {
          normalizedParams.set(cleanKey, decodeURIComponent(value).trim());
        } catch {
          normalizedParams.set(cleanKey, value.trim());
        }
      }
    });

    // Also ingest body attributes if request is POST or PUT
    if (body && typeof body === 'object') {
      Object.entries(body).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          const cleanKey = key.toLowerCase().replace(/[-_]/g, '');
          if (!normalizedParams.has(cleanKey) || normalizedParams.get(cleanKey) === '') {
            normalizedParams.set(cleanKey, String(value).trim());
          }
        }
      });
    }

    // Check if agentId is in pathname, e.g. /api/agents/:id/models
    const pathMatch = pathname.match(/^\/api\/agents\/([^/]+)\/models\/?$/i);
    const pathAgentId = pathMatch ? decodeURIComponent(pathMatch[1]).trim() : '';

    const resolveFirst = (...candidateKeys: string[]): string | undefined => {
      for (const cand of candidateKeys) {
        const normalizedCand = cand.toLowerCase().replace(/[-_]/g, '');
        const found = normalizedParams.get(normalizedCand);
        if (found !== undefined && found !== '') {
          return found;
        }
      }
      return undefined;
    };

    // 1. Resolve agentId (supports agentId, agent_id, agent-id, agent, id, agentName, botId, etc.)
    const rawAgentId = resolveFirst(
      'agentid',
      'agent_id',
      'agent-id',
      'agent',
      'id',
      'agentname',
      'agent_name',
      'agent-name',
      'botid',
      'bot_id'
    );
    const agentId = (rawAgentId || pathAgentId || 'hermes-agent').trim();

    // 2. Resolve provider (supports provider, modelProvider, model_provider, prov, type, vendor, etc.)
    const rawProvider = resolveFirst(
      'provider',
      'modelprovider',
      'model_provider',
      'model-provider',
      'providertype',
      'provider_type',
      'prov',
      'type',
      'vendor'
    );
    const provider = (rawProvider || 'ollama').toLowerCase().trim();

    // 3. Resolve baseUrl (supports baseUrl, base_url, base-url, url, endpoint, apiBase, api_base, host, server, etc.)
    const rawBaseUrl = resolveFirst(
      'baseurl',
      'base_url',
      'base-url',
      'url',
      'endpoint',
      'apibase',
      'api_base',
      'api-base',
      'host',
      'server'
    );
    const baseUrl = (rawBaseUrl || '').trim();

    return { agentId, provider, baseUrl };
  }

  /**
   * Builds consistent agent stats payload matching DashboardTab expectations
   */
  function buildAgentStatsPayload(targetAgentId: string = 'hermes-agent') {
    const rawId = (targetAgentId || '').trim().toLowerCase();
    const agentId = (rawId && rawId !== 'all' && rawId !== 'undefined' && rawId !== 'null' && rawId !== 'stats' && rawId !== 'resources' && rawId !== 'metrics')
      ? rawId
      : 'hermes-agent';

    const current = agentStates[agentId] || {
      status: agentId === 'zeroclaw' ? 'stopped' : 'running',
      containerId: 'c_' + agentId,
      containerName: `${agentId}-core`,
      version: 'v1.0.0'
    };
    const status = current.status || (agentId === 'zeroclaw' ? 'stopped' : 'running');
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const baseCpu = agentId === 'zeroclaw' ? 5.2 : agentId === 'picoclaw' ? 2.1 : agentId === 'openclaw' ? 18.5 : 14.0;
    const baseMem = agentId === 'zeroclaw' ? 14.8 : agentId === 'picoclaw' ? 42.0 : agentId === 'openclaw' ? 235.0 : 182.5;
    const maxMem = agentId === 'zeroclaw' ? 100 : agentId === 'picoclaw' ? 150 : 512;

    const points = [];
    for (let i = 14; i >= 0; i--) {
      const t = new Date(now - i * 3000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cpu = status === 'running' ? Math.max(0.2, +((baseCpu + (Math.sin((now / 1000) - i) * 3) + (Math.random() - 0.5) * 2).toFixed(1))) : 0;
      const memoryMb = status === 'running' ? Math.max(1.0, +((baseMem + (Math.cos((now / 1000) - i) * 5) + (Math.random() - 0.5) * 3).toFixed(1))) : 0;
      const memoryPct = status === 'running' ? +(((memoryMb / maxMem) * 100).toFixed(1)) : 0;
      points.push({ time: t, cpu, memoryMb, memoryPct });
    }

    const latest = points[points.length - 1];

    if (agentStates[agentId]) {
      agentStates[agentId].cpuUsagePct = latest.cpu;
      agentStates[agentId].memoryUsageMb = latest.memoryMb;
    }

    const allResources: Record<string, { cpuUsagePct: number; memoryUsageMb: number; memoryPct: number; memoryUsagePct: number }> = {};
    const knownAgentIds = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
    for (const id of knownAgentIds) {
      const idStatus = agentStates[id]?.status || (id === 'zeroclaw' ? 'stopped' : 'running');
      const bCpu = id === 'zeroclaw' ? 5.2 : id === 'picoclaw' ? 2.1 : id === 'openclaw' ? 18.5 : 14.0;
      const bMem = id === 'zeroclaw' ? 14.8 : id === 'picoclaw' ? 42.0 : id === 'openclaw' ? 235.0 : 182.5;
      const mMem = id === 'zeroclaw' ? 100 : id === 'picoclaw' ? 150 : 512;
      const c = idStatus === 'running' ? Math.max(0.2, +((bCpu + (Math.random() - 0.5) * 3).toFixed(1))) : 0;
      const m = idStatus === 'running' ? Math.max(1.0, +((bMem + (Math.random() - 0.5) * 4).toFixed(1))) : 0;
      allResources[id] = {
        cpuUsagePct: id === agentId ? latest.cpu : c,
        memoryUsageMb: id === agentId ? latest.memoryMb : m,
        memoryPct: id === agentId ? latest.memoryPct : +(((m / mMem) * 100).toFixed(1)),
        memoryUsagePct: id === agentId ? latest.memoryPct : +(((m / mMem) * 100).toFixed(1))
      };
    }

    return {
      success: true,
      agentId,
      agentName: current.containerName || agentId,
      status,
      containerId: current.containerId || 'c_' + agentId,
      containerName: current.containerName || `${agentId}-core`,
      version: current.version || 'v1.0.0',
      cpuUsagePct: latest.cpu,
      memoryUsageMb: latest.memoryMb,
      memoryUsagePct: latest.memoryPct,
      maxMemoryMb: maxMem,
      uptimeSeconds: current.uptimeSeconds || (status === 'running' ? 14200 : 0),
      timestamp: timeStr,
      history: points,
      resources: allResources
    };
  }

  type RouteHandlerFn = (context: { req: any; res: any; pathname: string; method: string; parsedUrl: URL; timestamp: string }) => Promise<any>;

  interface RegisteredRoute {
    pattern: RegExp;
    allowedMethods: string[];
    methods: string[];
    methodMap: Map<string, RouteHandlerFn>;
  }

  class Router {
    private routes: RegisteredRoute[] = [];
    private routeMap = new Map<string, RegisteredRoute>();
    // Centralized Map-based method-to-handler validation structure
    private methodValidationMap = new Map<string, Map<string, RouteHandlerFn>>();

    // Strictly enforced Map-based validation whitelist of supported HTTP methods for API centralization
    private static readonly ALLOWED_METHOD_WHITELIST = new Map<string, boolean>([
      ['GET', true],
      ['POST', true],
      ['PUT', true],
      ['DELETE', true],
      ['PATCH', true],
      ['OPTIONS', true],
      ['HEAD', true]
    ]);

    /**
     * Centralized route registration requiring explicit definition of allowedMethods
     * Enforces Map-based method-to-handler validation structure for all routes
     */
    public register(
      patternOrRoute: RegExp | { pattern: RegExp; allowedMethods: string[]; handlers?: Record<string, RouteHandlerFn>; handler?: RouteHandlerFn },
      methodsOrHandlers?: string[] | Record<string, RouteHandlerFn>,
      handlerOrMap?: RouteHandlerFn | Record<string, RouteHandlerFn>
    ) {
      let pattern: RegExp;
      let allowedMethods: string[] = [];
      const methodMap = new Map<string, RouteHandlerFn>();

      if (patternOrRoute instanceof RegExp) {
        pattern = patternOrRoute;
        if (Array.isArray(methodsOrHandlers)) {
          allowedMethods = methodsOrHandlers.map(m => m.toUpperCase());
          if (typeof handlerOrMap === 'function') {
            for (const m of allowedMethods) {
              methodMap.set(m, handlerOrMap);
            }
          } else if (handlerOrMap && typeof handlerOrMap === 'object') {
            for (const [m, h] of Object.entries(handlerOrMap)) {
              const upperM = m.toUpperCase();
              if (typeof h === 'function') {
                methodMap.set(upperM, h);
              }
            }
          }
        } else if (methodsOrHandlers && typeof methodsOrHandlers === 'object') {
          allowedMethods = Object.keys(methodsOrHandlers).map(m => m.toUpperCase());
          for (const [m, h] of Object.entries(methodsOrHandlers)) {
            const upperM = m.toUpperCase();
            if (typeof h === 'function') {
              methodMap.set(upperM, h);
            }
          }
        }
      } else {
        pattern = patternOrRoute.pattern;
        const rawMethods = patternOrRoute.allowedMethods;
        if (!rawMethods || !Array.isArray(rawMethods) || rawMethods.length === 0) {
          throw new Error(`[Router Schema Error] Explicit definition of 'allowedMethods' is required for pattern ${pattern}`);
        }
        allowedMethods = rawMethods.map(m => m.toUpperCase());
        if (patternOrRoute.handlers) {
          for (const [m, h] of Object.entries(patternOrRoute.handlers)) {
            const upperM = m.toUpperCase();
            if (typeof h === 'function') {
              methodMap.set(upperM, h);
            }
          }
        }
        if (patternOrRoute.handler) {
          for (const m of allowedMethods) {
            if (!methodMap.has(m)) {
              methodMap.set(m, patternOrRoute.handler);
            }
          }
        }
      }

      if (!allowedMethods || !Array.isArray(allowedMethods) || allowedMethods.length === 0) {
        throw new Error(`[Router Schema Error] Explicit definition of 'allowedMethods' is required for pattern ${pattern}`);
      }

      // Strictly verify every method in the array against the map-based allowed whitelist
      for (const m of allowedMethods) {
        if (!Router.ALLOWED_METHOD_WHITELIST.has(m)) {
          throw new Error(`[Router Schema Error] Unsupported HTTP method "${m}" for pattern ${pattern}`);
        }
      }

      const registeredRoute: RegisteredRoute = { pattern, allowedMethods, methods: allowedMethods, methodMap };
      this.routes.push(registeredRoute);
      this.routeMap.set(pattern.source, registeredRoute);
      this.methodValidationMap.set(pattern.source, methodMap);
    }

    /**
     * Refactor and load dynamicRouteMappings directly into the centralized Router class
     */
    public loadDynamicRouteMappings(mappings: Array<{ pattern: RegExp; allowedMethods: string[]; handlers?: Record<string, RouteHandlerFn>; handler?: RouteHandlerFn }>) {
      for (const route of mappings) {
        this.register(route);
      }
      return this;
    }

    private async validateMethod(upperMethod: string, route: RegisteredRoute, context: { req: any; res: any; pathname: string }): Promise<boolean> {
      const { req, res, pathname } = context;
      const { methodMap, allowedMethods, methods } = route;

      const incomingMethod = ((req && req.method) || upperMethod || 'GET').toUpperCase();

      // Strictly performs methods.includes(req.method) check against the allowedMethods whitelist before invoking handler
      if ((!methods.includes(req.method) && !methods.includes(incomingMethod)) || !methodMap.has(incomingMethod)) {
        const mismatchErrorMsg = `[Router Validation Mismatch Error] HTTP method mismatch on endpoint ${pathname}. Invoked Method: ${incomingMethod}. Registered & Allowed Methods for this pattern: ${allowedMethods.join(', ')}`;
        console.error(mismatchErrorMsg);

        // Asynchronously capture request body payload for diagnostics
        try {
          req.bodyPayload = await readRequestBody(req);
        } catch (pErr) {
          console.warn('[Vite API Server] Failed to read body for 405 logging:', pErr);
        }

        // Generate full stack trace for request interceptor
        const stackTrace = new Error(mismatchErrorMsg).stack || mismatchErrorMsg;
        req.stackTrace = stackTrace;

        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Allow', allowedMethods.join(', '));
        res.end(JSON.stringify({
          error: 'Method Not Allowed',
          method: incomingMethod,
          pathname,
          allowedMethods,
          stackTrace,
          summary: `Endpoint mismatch: method '${incomingMethod}' is not allowed on route '${pathname}'. Allowed methods: ${allowedMethods.join(', ')}`,
          timestamp: new Date().toISOString()
        }));
        return false;
      }
      return true;
    }

    public async handle(context: { req: any; res: any; pathname: string; method: string; parsedUrl: URL; timestamp: string }): Promise<boolean> {
      const { pathname, method, res } = context;
      const upperMethod = (method || 'GET').toUpperCase();

      for (const route of this.routes) {
        if (route.pattern.test(pathname)) {
          const { methodMap, allowedMethods } = route;

          // Handle preflight OPTIONS automatically
          if (upperMethod === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Allow', allowedMethods.join(', '));
            res.end(JSON.stringify({ success: true, allowedMethods }));
            return true;
          }

          // Perform explicit validateMethod check against whitelist & registered handlers
          const isValid = await this.validateMethod(upperMethod, route, context);
          if (!isValid) {
            return true;
          }

          const targetHandler = methodMap.get(upperMethod)!;
          await targetHandler(context);
          return true;
        }
      }
      return false;
    }
  }

  function createApiHandler() {
    return async (req: any, res: any, next: any) => {
      if (!req.url || !req.url.startsWith('/api/')) {
        return next();
      }

      const timestamp = new Date().toISOString();
      const method = (req.method || 'GET').toUpperCase();
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
            clientIp: req.socket?.remoteAddress || '127.0.0.1',
            payload: req.bodyPayload || null,
            requestHeaders: req.headers || null,
            stackTrace: req.stackTrace || (res.statusCode === 405 ? `HTTP 405 Method Not Allowed on ${pathname}` : res.statusCode >= 500 ? `HTTP ${res.statusCode} Internal Server Error on ${pathname}` : undefined)
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

      // Dynamic Route Mapping Object mapping regex patterns to supported methods and handlers
      const dynamicRouteMappings = [
        {
          pattern: /^\/api\/persistence\/commit(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            ensureDataDir();
            const persistenceFile = path.join(dataDir, 'persistence.json');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            if (method === 'OPTIONS') {
              res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
              return res.end(JSON.stringify({ success: true, allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'] }));
            }

            if (method === 'GET') {
              let current: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}
              return res.end(JSON.stringify({
                success: true,
                data: current,
                lastCommitted: current.lastCommitted || null,
                commitHistory: current.commitHistory || []
              }));
            }

            const body = await readRequestBody(req);
            const { agentId, config, meta, timestamp } = body || {};
            let current: any = {};
            try {
              if (fs.existsSync(persistenceFile)) {
                current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
              }
            } catch {}

            if (!current.configs) current.configs = {};
            if (agentId && config) {
              current.configs[agentId] = config;
            }

            if (!current.commitHistory) current.commitHistory = [];
            current.commitHistory.unshift({
              id: `commit-${agentId || 'global'}-${Date.now()}`,
              agentId,
              timestamp: timestamp || new Date().toISOString(),
              meta: meta || {}
            });
            if (current.commitHistory.length > 50) {
              current.commitHistory = current.commitHistory.slice(0, 50);
            }

            current.lastCommitted = {
              agentId,
              timestamp: timestamp || new Date().toISOString(),
              meta: meta || {}
            };

            try {
              fs.writeFileSync(persistenceFile, JSON.stringify(current, null, 2), 'utf8');
            } catch {}

            return res.end(JSON.stringify({
              success: true,
              committed: true,
              agentId,
              timestamp: timestamp || new Date().toISOString(),
              data: current
            }));
          },
          handlers: {
            OPTIONS: async () => {
              res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
              return res.end(JSON.stringify({ success: true, allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'] }));
            },
            GET: async () => {
              res.setHeader('Content-Type', 'application/json');
              const persistenceFile = path.join(dataDir, 'persistence.json');
              let current: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}
              return res.end(JSON.stringify({
                success: true,
                data: current,
                lastCommitted: current.lastCommitted || null,
                commitHistory: current.commitHistory || []
              }));
            },
            POST: async () => {
              ensureDataDir();
              const persistenceFile = path.join(dataDir, 'persistence.json');
              const body = await readRequestBody(req);
              const { agentId, config, meta, timestamp } = body || {};
              let current: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}

              if (!current.configs) current.configs = {};
              if (agentId && config) {
                current.configs[agentId] = config;
              }

              if (!current.commitHistory) current.commitHistory = [];
              current.commitHistory.unshift({
                id: `commit-${agentId || 'global'}-${Date.now()}`,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              });
              if (current.commitHistory.length > 50) {
                current.commitHistory = current.commitHistory.slice(0, 50);
              }

              current.lastCommitted = {
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              };

              try {
                fs.writeFileSync(persistenceFile, JSON.stringify(current, null, 2), 'utf8');
              } catch {}

              return res.end(JSON.stringify({
                success: true,
                committed: true,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                data: current
              }));
            },
            PUT: async () => {
              ensureDataDir();
              const persistenceFile = path.join(dataDir, 'persistence.json');
              const body = await readRequestBody(req);
              const { agentId, config, meta, timestamp } = body || {};
              let current: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}

              if (!current.configs) current.configs = {};
              if (agentId && config) {
                current.configs[agentId] = config;
              }

              if (!current.commitHistory) current.commitHistory = [];
              current.commitHistory.unshift({
                id: `commit-${agentId || 'global'}-${Date.now()}`,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              });
              if (current.commitHistory.length > 50) {
                current.commitHistory = current.commitHistory.slice(0, 50);
              }

              current.lastCommitted = {
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              };

              try {
                fs.writeFileSync(persistenceFile, JSON.stringify(current, null, 2), 'utf8');
              } catch {}

              return res.end(JSON.stringify({
                success: true,
                committed: true,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                data: current
              }));
            },
            PATCH: async () => {
              ensureDataDir();
              const persistenceFile = path.join(dataDir, 'persistence.json');
              const body = await readRequestBody(req);
              const { agentId, config, meta, timestamp } = body || {};
              let current: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  current = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}

              if (!current.configs) current.configs = {};
              if (agentId && config) {
                current.configs[agentId] = config;
              }

              if (!current.commitHistory) current.commitHistory = [];
              current.commitHistory.unshift({
                id: `commit-${agentId || 'global'}-${Date.now()}`,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              });
              if (current.commitHistory.length > 50) {
                current.commitHistory = current.commitHistory.slice(0, 50);
              }

              current.lastCommitted = {
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                meta: meta || {}
              };

              try {
                fs.writeFileSync(persistenceFile, JSON.stringify(current, null, 2), 'utf8');
              } catch {}

              return res.end(JSON.stringify({
                success: true,
                committed: true,
                agentId,
                timestamp: timestamp || new Date().toISOString(),
                data: current
              }));
            }
          }
        },
        {
          pattern: /^\/api\/proxy\/search(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (method === 'OPTIONS') return res.end(JSON.stringify({ success: true }));

            let body: any = {};
            if (method === 'POST' || method === 'PUT' || method === 'GET') {
              try { body = (await readRequestBody(req)) || {}; } catch {}
            }

            const query = (
              parsedUrl.searchParams.get('modelQuery') ||
              parsedUrl.searchParams.get('query') ||
              parsedUrl.searchParams.get('q') ||
              body.modelQuery ||
              body.query ||
              body.q ||
              ''
            ).toLowerCase().trim();

            const allProxyModels = [
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Local Edge)', tag: 'Active', provider: 'ollama' },
              { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b (Edge Coding)', tag: 'Sipeed', provider: 'ollama' },
              { value: 'deepseek-r1:8b', label: 'deepseek-r1:8b (Local Reasoning)', tag: 'Reasoning', provider: 'ollama' },
              { value: 'llama3.2:3b', label: 'llama3.2:3b (Ultra-light)', tag: 'Edge', provider: 'ollama' },
              { value: 'hermes-3-llama-3.1-8b', label: 'Hermes 3 Llama 3.1 8B', tag: 'Agent', provider: 'ollama' },
              { value: 'anthropic/claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', tag: 'Frontier', provider: 'anthropic' },
              { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', tag: 'Flagship', provider: 'anthropic' },
              { value: 'openai/gpt-4o', label: 'GPT-4o', tag: 'Flagship', provider: 'openai' },
              { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tag: 'Fast', provider: 'openai' },
              { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', tag: 'Coding', provider: 'deepseek' },
              { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek R1', tag: 'Reasoning', provider: 'deepseek' },
              { value: 'mistralai/mistral-large-latest', label: 'Mistral Large', tag: 'Enterprise', provider: 'mistral' }
            ];

            const filtered = query 
              ? allProxyModels.filter(m => m.value.toLowerCase().includes(query) || m.label.toLowerCase().includes(query) || m.tag.toLowerCase().includes(query))
              : allProxyModels;

            return res.end(JSON.stringify({
              success: true,
              modelQuery: query,
              count: filtered.length,
              models: filtered,
              timestamp: new Date().toISOString()
            }));
          }
        },
        {
          pattern: /^\/api\/proxy(\/.*)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            let body: any = {};
            if (method === 'POST' || method === 'PUT' || method === 'GET') {
              try {
                body = (await readRequestBody(req)) || {};
              } catch {}
            }

            const queryBaseUrl = parsedUrl.searchParams.get('baseUrl') ||
                                parsedUrl.searchParams.get('base_url') ||
                                parsedUrl.searchParams.get('url') ||
                                body.baseUrl ||
                                body.base_url ||
                                body.url ||
                                '';
            const queryProvider = (
              parsedUrl.searchParams.get('provider') ||
              body.provider ||
              'ollama'
            ).toLowerCase().trim();
            const queryApiKey = (
              parsedUrl.searchParams.get('apiKey') ||
              parsedUrl.searchParams.get('api_key') ||
              body.apiKey ||
              body.api_key ||
              ''
            ).trim();

            const targetBaseUrl = (queryBaseUrl || 'http://192.168.1.49:11434').trim();

            // Check in-memory cache for fast, non-blocking response
            const proxyCacheKey = `proxy:${queryProvider}:${targetBaseUrl}:${queryApiKey}`;
            const cachedProxy = modelDiscoveryCache.get(proxyCacheKey);
            if (cachedProxy && (Date.now() - cachedProxy.timestamp < 30000)) {
              return res.end(cachedProxy.payload);
            }

            // Sanitize: Fix concatenation bugs like '11434host:11434'
            let sanitizedBase = targetBaseUrl
              .replace(/11434host:11434/g, '11434')
              .replace(/:11434host:\d+/g, ':11434')
              .replace(/host:11434/g, '11434');
            if (!sanitizedBase.startsWith('http')) sanitizedBase = 'http://' + sanitizedBase;

            const cleanBase = sanitizedBase.replace(/\/+$/, '').replace(/\/v1\/?$/, '');
            const isPrivateIp = /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\.|127\.0\.0\.1|localhost/.test(cleanBase);
            const probeTimeout = isPrivateIp ? 800 : 1500;

            const probeEndpoints: string[] = [];
            if (queryProvider === 'openrouter' || cleanBase.includes('openrouter')) {
              probeEndpoints.push('https://openrouter.ai/api/v1/models');
            } else if (queryProvider === 'ollama' || cleanBase.includes('11434')) {
              probeEndpoints.push(`${cleanBase}/api/tags`);
            } else {
              probeEndpoints.push(`${cleanBase}/v1/models`);
            }

            let fetchedModels: Array<{ value: string; label: string; tag: string }> = [];
            let rawNames: string[] = [];
            let fetchSuccessful = false;
            let fetchError: string | null = null;

            for (const endpoint of probeEndpoints) {
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), probeTimeout);
                const probeHeaders: Record<string, string> = {
                  'Accept': 'application/json',
                  'User-Agent': 'Clawdock-Backend-Proxy/1.0'
                };
                if (queryApiKey) {
                  probeHeaders['Authorization'] = `Bearer ${queryApiKey}`;
                } else if (req.headers['authorization']) {
                  probeHeaders['Authorization'] = req.headers['authorization'] as string;
                }

                const resp = await fetch(endpoint, {
                  method: 'GET',
                  signal: controller.signal,
                  headers: probeHeaders
                });
                clearTimeout(timer);

                if (resp.ok) {
                  const data: any = await resp.json();
                  if (data && Array.isArray(data.models)) {
                    rawNames = data.models.map((m: any) => m.name || m.model).filter(Boolean);
                    fetchedModels = rawNames.map((name: string) => ({
                      value: name,
                      label: `${name} (Local Backend Proxy)`,
                      tag: 'Proxy'
                    }));
                    fetchSuccessful = true;
                    break;
                  } else if (data && Array.isArray(data.data)) {
                    rawNames = data.data.map((m: any) => m.id || m.name).filter(Boolean);
                    fetchedModels = rawNames.map((name: string) => ({
                      value: name,
                      label: `${name} (Backend Proxy)`,
                      tag: 'Proxy'
                    }));
                    fetchSuccessful = true;
                    break;
                  }
                }
              } catch (err: any) {
                fetchError = err?.message || String(err);
              }
            }

            if (fetchSuccessful && fetchedModels.length > 0) {
              const payload = JSON.stringify({
                success: true,
                source: 'backend_proxy',
                baseUrl: targetBaseUrl,
                provider: queryProvider,
                modelsCount: fetchedModels.length,
                rawModelNames: rawNames,
                models: fetchedModels,
                timestamp
              });
              modelDiscoveryCache.set(proxyCacheKey, { timestamp: Date.now(), payload });
              return res.end(payload);
            }

            const fallbackModels = queryProvider === 'openrouter' ? [
              { value: 'anthropic/claude-3.7-sonnet', label: 'OpenRouter: Claude 3.7 Sonnet', tag: 'Proxy' },
              { value: 'deepseek/deepseek-r1', label: 'OpenRouter: DeepSeek R1', tag: 'Proxy' },
              { value: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter: Llama 3.3 70B', tag: 'Proxy' },
              { value: 'openai/gpt-4o', label: 'OpenRouter: GPT-4o', tag: 'Proxy' }
            ] : queryProvider === 'custom' ? [
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Active Checkpoint)', tag: 'Active' },
              { value: 'custom-model', label: 'Custom Model (Specify below or probe endpoint)', tag: 'Custom' }
            ] : [
              { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b (Local Proxy Fallback)', tag: 'Proxy Fallback' },
              { value: 'qwen2.5-coder:14b', label: 'qwen2.5-coder:14b (Local Proxy Fallback)', tag: 'Proxy Fallback' },
              { value: 'deepseek-r1:8b', label: 'deepseek-r1:8b (Local Proxy Fallback)', tag: 'Proxy Fallback' },
              { value: 'llama3.3:70b', label: 'llama3.3:70b (Local Proxy Fallback)', tag: 'Proxy Fallback' },
              { value: 'mistral-nemo:12b', label: 'mistral-nemo:12b (Local Proxy Fallback)', tag: 'Proxy Fallback' },
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Active Checkpoint)', tag: 'Active' }
            ];

            const fallbackPayload = JSON.stringify({
              success: true,
              source: 'backend_proxy_fallback',
              baseUrl: targetBaseUrl,
              provider: queryProvider,
              error: fetchError || 'Connection to baseUrl timed out or was refused',
              modelsCount: fallbackModels.length,
              rawModelNames: fallbackModels.map(m => m.value),
              models: fallbackModels,
              timestamp
            });
            modelDiscoveryCache.set(proxyCacheKey, { timestamp: Date.now(), payload: fallbackPayload });
            return res.end(fallbackPayload);
          }
        },
        {
          pattern: /^\/api\/test-connection(\/)?$|^\/api\/test-conn-v2(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            let body: any = {};
            try {
              body = (await readRequestBody(req)) || {};
            } catch {}

            const provider = body.provider || parsedUrl.searchParams.get('provider') || 'ollama';
            const apiKey = body.apiKey || parsedUrl.searchParams.get('apiKey') || '';
            const baseUrl = body.baseUrl || parsedUrl.searchParams.get('baseUrl') || body.base_url || parsedUrl.searchParams.get('base_url') || '';
            const cleanProvider = provider.toLowerCase();

            console.log(`[Vite API Server] ${method} ${pathname} (Provider: ${cleanProvider})`);

            if (cleanProvider !== 'ollama' && (!apiKey || !apiKey.trim())) {
              return res.end(JSON.stringify({
                success: false,
                errorType: 'MISSING_API_KEY',
                message: `API Key is required to authenticate with ${provider.toUpperCase()}.`
              }));
            }

            let url = '';
            let headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (cleanProvider === 'ollama') {
              const roots = baseUrl && baseUrl.trim() 
                ? [baseUrl.trim()]
                : ['http://host.docker.internal:11434', 'http://localhost:11434', 'http://127.0.0.1:11434'];
              
              let ollamaSuccess = false;
              let errorMsg = 'Could not establish connection to local Ollama. Ensure Ollama is running and accessible.';

              for (const root of roots) {
                try {
                  const controller = new AbortController();
                  const timer = setTimeout(() => controller.abort(), 2000);
                  const response = await fetch(`${root.replace(/\/+$/, '')}/api/tags`, { signal: controller.signal });
                  clearTimeout(timer);
                  if (response.ok) {
                    ollamaSuccess = true;
                    break;
                  }
                } catch (err: any) {
                  const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
                  errorMsg = isAbort ? `Connection to ${root} timed out.` : (err.message || errorMsg);
                }
              }

              if (ollamaSuccess) {
                return res.end(JSON.stringify({ success: true, message: 'Successfully connected to Ollama instance.' }));
              } else {
                return res.end(JSON.stringify({ success: false, errorType: 'CONNECTION_FAILURE', message: errorMsg }));
              }
            }

            if (cleanProvider === 'openai') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://api.openai.com/v1/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            } else if (cleanProvider === 'anthropic') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://api.anthropic.com/v1/models';
              headers['x-api-key'] = apiKey.trim();
              headers['anthropic-version'] = '2023-06-01';
            } else if (cleanProvider === 'gemini') {
              url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
            } else if (cleanProvider === 'deepseek') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/models` : 'https://api.deepseek.com/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            } else if (cleanProvider === 'groq') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://api.groq.com/openai/v1/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            } else if (cleanProvider === 'mistral') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://api.mistral.ai/v1/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            } else if (cleanProvider === 'openrouter') {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://openrouter.ai/api/v1/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            } else if (cleanProvider === 'custom') {
              if (!baseUrl || !baseUrl.trim()) {
                return res.end(JSON.stringify({
                  success: false,
                  errorType: 'MISSING_BASE_URL',
                  message: 'Base URL is required for Custom provider connections.'
                }));
              }
              const cleanB = baseUrl.trim().replace(/\/+$/, '');
              url = cleanB.endsWith('/v1') ? `${cleanB}/models` : `${cleanB}/v1/models`;
              if (apiKey && apiKey.trim() && apiKey.trim() !== 'ollama') {
                headers['Authorization'] = `Bearer ${apiKey.trim()}`;
              }
            } else {
              url = baseUrl && baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, '')}/v1/models` : 'https://api.openai.com/v1/models';
              headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            }

            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 3500);
              const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal
              });
              clearTimeout(timer);

              if (response.ok) {
                return res.end(JSON.stringify({
                  success: true,
                  message: `Successfully connected & authenticated with ${provider.toUpperCase()}.`
                }));
              } else {
                const text = await response.text();
                let parsedErr = 'Authentication or connection rejected by server.';
                try {
                  const js = JSON.parse(text);
                  parsedErr = js.error?.message || js.message || parsedErr;
                } catch {
                  if (text) parsedErr = text.slice(0, 150);
                }

                if (response.status === 405) {
                  return res.end(JSON.stringify({
                    success: true,
                    message: `Successfully reached the provider endpoint. (Server responded with 405 Method Not Allowed, confirming the host is online, reachable, and active).`
                  }));
                }

                if (response.status === 401 || response.status === 403) {
                  return res.end(JSON.stringify({
                    success: false,
                    errorType: 'INVALID_CREDENTIALS',
                    message: `Invalid API Key or unauthorized access. (${response.status}: ${parsedErr})`
                  }));
                }

                return res.end(JSON.stringify({
                  success: false,
                  errorType: 'PROVIDER_REJECTED',
                  message: `Server returned status ${response.status}: ${parsedErr}`
                }));
              }
            } catch (fetchErr: any) {
              const isTimeout = fetchErr.name === 'AbortError' || fetchErr.message?.includes('aborted') || fetchErr.message?.includes('timeout');
              if (isTimeout) {
                return res.end(JSON.stringify({
                  success: false,
                  errorType: 'TIMEOUT',
                  message: `Connection timed out while reaching ${provider.toUpperCase()} (${baseUrl || url}). Please verify host and port are active.`
                }));
              }
              return res.end(JSON.stringify({
                success: false,
                errorType: 'NETWORK_ERROR',
                message: `Network Error: Could not reach provider endpoint at ${baseUrl || url}. (${fetchErr.message || 'DNS resolution or route failed'})`
              }));
            }
          }
        },
        {
          pattern: /^\/api\/health(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp }));
          }
        },
        {
          pattern: /^\/api\/docker\/status(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            const runningCount = Object.values(agentStates).filter((s: any) => s.status === 'running').length;
            const totalCount = Math.max(4, Object.keys(agentStates).length);
            return res.end(JSON.stringify({
              dockerAvailable: true,
              daemonVersion: '26.1.4-ce',
              operatingSystem: 'Linux Container (Cloud/Host)',
              totalContainers: totalCount,
              runningContainers: runningCount,
              socketPath: '/var/run/docker.sock',
              environment: 'linux_native',
              timestamp
            }));
          }
        },
        {
          pattern: /^\/api\/docker\/containers(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              containers: Object.entries(agentStates).map(([id, st]: [string, any]) => ({
                id: st.containerId || 'c_' + id,
                name: st.containerName || id,
                status: st.status,
                image: st.dockerImage || `clawdock-${id}:latest`,
                state: st.status === 'running' ? 'running' : 'stopped'
              })),
              timestamp
            }));
          }
        },
        {
          pattern: /^\/api\/state(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            if (method === 'GET') {
              return res.end(JSON.stringify({ success: true, agentStates: { ...agentStates }, timestamp }));
            }
            if (method === 'POST' || method === 'PUT') {
              const body = await readRequestBody(req);
              if (body && body.agentStates) {
                agentStates = { ...agentStates, ...body.agentStates };
              }
              return res.end(JSON.stringify({ success: true, agentStates: { ...agentStates }, timestamp }));
            }
            return res.end(JSON.stringify({ success: true, agentStates: { ...agentStates }, timestamp }));
          }
        },
        {
          pattern: /^\/api\/diagnostics\/request-logs(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, logs: serverRequestLogs, total: serverRequestLogs.length, timestamp }));
          }
        },
        {
          pattern: /^\/api\/diagnostics\/clear(\/)?$/i,
          allowedMethods: ['POST', 'OPTIONS'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            serverRequestLogs = [];
            return res.end(JSON.stringify({ success: true, message: 'Logs cleared' }));
          }
        },
        {
          pattern: /^\/api\/agents\/all\/config(s)?(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            const agentIds = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
            const configs: Record<string, any> = {};
            for (const id of agentIds) {
              configs[id] = getAgentConfig(id);
            }
            return res.end(JSON.stringify({ success: true, configs }));
          }
        },
        {
          pattern: /^\/api\/agents\/([^/]+)\/version(\/)?$/i,
          allowedMethods: ['GET', 'OPTIONS'],
          handler: async ({ pathname, res, timestamp }) => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            const match = pathname.match(/^\/api\/agents\/([^/]+)\/version(\/)?$/i);
            const agentId = match ? match[1] : 'hermes-agent';
            const st = agentStates[agentId] || { status: 'running', version: 'v1.0.0', dockerImage: `clawdock-${agentId}:latest` };
            return res.end(JSON.stringify({
              success: true,
              agentId,
              version: st.version || 'v1.0.0',
              dockerImage: st.dockerImage || `clawdock-${agentId}:latest`,
              status: st.status || 'running',
              timestamp: timestamp || new Date().toISOString()
            }));
          }
        },
        {
          pattern: /^\/api\/agents\/([^/]+)\/logs(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            const match = pathname.match(/^\/api\/agents\/([^/]+)\/logs(\/)?$/i);
            const agentId = match ? match[1] : 'hermes-agent';
            const st = agentStates[agentId] || { logs: [] };
            return res.end(JSON.stringify({
              success: true,
              agentId,
              logs: st.logs || [],
              timestamp
            }));
          }
        },
        {
          pattern: /^\/api\/persistence(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            const persistenceFile = path.join(dataDir, 'persistence.json');
            if (method === 'GET') {
              let data: any = {};
              try {
                if (fs.existsSync(persistenceFile)) {
                  data = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                }
              } catch {}
              return res.end(JSON.stringify({ success: true, data }));
            }
            const body = await readRequestBody(req);
            let existing: any = {};
            try {
              if (fs.existsSync(persistenceFile)) {
                existing = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
              }
            } catch {}
            if (body && body.key && body.value !== undefined) {
              existing[body.key] = body.value;
            } else if (body && body.data && typeof body.data === 'object') {
              existing = { ...existing, ...body.data };
            } else if (body && typeof body === 'object') {
              existing = { ...existing, ...body };
            }
            try {
              fs.writeFileSync(persistenceFile, JSON.stringify(existing, null, 2), 'utf8');
            } catch {}
            return res.end(JSON.stringify({ success: true, data: existing }));
          }
        },
        {
          pattern: /^\/api\/diagnostics\/logs(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              logs: [
                `[${timestamp}] [SYSTEM] Clawdock container daemon v2.4 initialized.`,
                `[${timestamp}] [DOCKER] Bridge network clawdock-net active at 172.28.0.0/16.`
              ]
            }));
          }
        },
        {
          pattern: /^\/api\/chat(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            const body = await readRequestBody(req);
            return res.end(JSON.stringify({
              success: true,
              response: `[Clawdock Simulator] Received message "${body?.message || ''}". Agent active.`
            }));
          }
        },
        {
          pattern: /^\/api\/models(\/)?$|^\/api\/model\/list(\/)?$|^\/api\/agents\/models(\/)?$|^\/api\/proxy\/models(\/)?$|^\/api\/proxy\/model-list(\/)?$|^\/api\/proxy(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            if (method === 'OPTIONS') {
              return res.end(JSON.stringify({ success: true }));
            }

            let body: any = {};
            if (method === 'POST' || method === 'PUT') {
              try {
                body = (await readRequestBody(req)) || {};
              } catch {}
            }
            const { agentId, provider, baseUrl } = extractModelQueryParams(parsedUrl, body, pathname);
            const apiKey = parsedUrl.searchParams.get('apiKey') ||
                           parsedUrl.searchParams.get('api_key') ||
                           parsedUrl.searchParams.get('key') ||
                           body.apiKey ||
                           body.api_key ||
                           body.key ||
                           '';

            // Check cache for fast immediate response
            const modelsCacheKey = `models:${provider}:${baseUrl}:${apiKey}`;
            const cachedModels = modelDiscoveryCache.get(modelsCacheKey);
            if (cachedModels && (Date.now() - cachedModels.timestamp < 30000)) {
              return res.end(cachedModels.payload);
            }

            if (provider === 'openrouter') {
              let openrouterModels: Array<{ value: string; label: string; tag: string }> = [];
              const b = (baseUrl || 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '');
              const targetUrl = b.endsWith('/models')
                ? b
                : b.endsWith('/v1')
                ? `${b}/models`
                : `${b}/v1/models`;

              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 1500);
                const headers: Record<string, string> = {
                  'Accept': 'application/json',
                  'User-Agent': 'ClawDock/1.0'
                };
                if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
                const resp = await fetch(targetUrl, { signal: controller.signal, headers });
                clearTimeout(timer);
                if (resp.ok) {
                  const json: any = await resp.json();
                  const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.models) ? json.models : []);
                  if (list.length > 0) {
                    openrouterModels = list.slice(0, 60).map((m: any) => {
                      const mid = m.id || m.name;
                      const mname = m.name || mid;
                      return {
                        value: String(mid),
                        label: mname && mname !== mid ? `${mname} (${mid})` : String(mid),
                        tag: 'OpenRouter'
                      };
                    });
                  }
                }
              } catch {}

              const catalog = openrouterModels.length > 0 ? openrouterModels : [
                { value: 'anthropic/claude-3.7-sonnet', label: 'OpenRouter: Claude 3.7 Sonnet', tag: 'Proxy' },
                { value: 'deepseek/deepseek-r1', label: 'OpenRouter: DeepSeek R1', tag: 'Proxy' },
                { value: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter: Llama 3.3 70B', tag: 'Proxy' },
                { value: 'openai/gpt-4o', label: 'OpenRouter: GPT-4o', tag: 'Proxy' }
              ];

              const payload = JSON.stringify({
                success: true,
                provider: 'openrouter',
                baseUrl,
                agentId,
                modelsCount: catalog.length,
                isLiveProbed: openrouterModels.length > 0,
                models: catalog
              });
              modelDiscoveryCache.set(modelsCacheKey, { timestamp: Date.now(), payload });
              return res.end(payload);
            }

            let liveOllamaModels: string[] = [];
            if (baseUrl && (provider === 'ollama' || provider === 'custom' || baseUrl.includes('11434'))) {
              try {
                const isPrivateIp = /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\.|127\.0\.0\.1|localhost/.test(baseUrl);
                const probeTimeout = isPrivateIp ? 800 : 1500;
                const cleanBase = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), probeTimeout);
                const resp = await fetch(`${cleanBase}/api/tags`, { signal: controller.signal });
                clearTimeout(timer);
                if (resp.ok) {
                  const json: any = await resp.json();
                  if (Array.isArray(json.models)) {
                    liveOllamaModels = json.models.map((m: any) => m.name || m.model).filter(Boolean);
                  }
                }
              } catch {}
            }

            const models = provider === 'custom' ? [
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Active Checkpoint)', tag: 'Active' },
              { value: 'custom-model', label: 'Custom Model (Specify below or probe endpoint)', tag: 'Custom' }
            ] : [
              { value: 'claude-3-7-sonnet', label: 'claude-3-7-sonnet (Container Active Checkpoint)', tag: 'Active' },
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Local Edge / Active)', tag: 'Active' },
              { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b', tag: 'Local' },
              { value: 'deepseek-r1', label: 'DeepSeek-R1', tag: 'Reasoning' }
            ];

            for (const m of liveOllamaModels) {
              if (!models.some(x => x.value === m)) {
                models.unshift({ value: m, label: `${m} (Live Ollama)`, tag: 'Live' });
              }
            }
            const lastSuccessTimestamp = new Date().toISOString();
            const enrichedModels = models.map((m: any) => {
              const val = typeof m === 'string' ? m : (m.value || '');
              const mem = val.includes('70b') ? '38.4 GB' :
                          val.includes('32b') ? '18.2 GB' :
                          val.includes('14b') ? '8.9 GB' :
                          val.includes('7b') || val.includes('8b') ? '4.8 GB' :
                          val.includes('3b') ? '2.1 GB' :
                          val.includes('1b') ? '850 MB' :
                          provider === 'ollama' || provider === 'custom' ? '4.8 GB' : 'Serverless Cloud Memory';
              const ctx = val.includes('200k') || val.includes('claude') ? 200000 :
                          val.includes('128k') || val.includes('gpt-4o') || val.includes('o1') || val.includes('coder') ? 128000 :
                          val.includes('65k') || val.includes('soul') || val.includes('gemma') ? 65536 :
                          val.includes('32k') || val.includes('deepseek') ? 32768 : 16384;
              return {
                ...(typeof m === 'object' ? m : { value: m, label: m }),
                memoryUsage: mem,
                contextWindow: ctx,
                lastSuccessTimestamp
              };
            });

            const finalPayload = JSON.stringify({
              success: true,
              provider,
              baseUrl,
              agentId,
              modelsCount: enrichedModels.length,
              lastSuccessTimestamp,
              models: enrichedModels
            });
            modelDiscoveryCache.set(modelsCacheKey, { timestamp: Date.now(), payload: finalPayload });
            return res.end(finalPayload);
          }
        },
        {
          pattern: /^\/api\/openclaw\/(skills-sync|skills|sync|mcp)(\/)?$|^\/api\/agents\/openclaw\/(skills|skills-sync|mcp)(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            if (pathname.includes('/mcp')) {
              return res.end(JSON.stringify({
                success: true,
                agentId: 'openclaw',
                mcpServers: [{ id: 'mcp-openclaw-vps-hub', name: 'OpenClaw VPS Remote MCP Hub', status: 'connected' }]
              }));
            }
            return res.end(JSON.stringify({
              success: true,
              agentId: 'openclaw',
              skills: OPENCLAW_SYNCHRONOUS_CATALOG.skills,
              mcpServers: OPENCLAW_SYNCHRONOUS_CATALOG.mcpServers
            }));
          }
        },
        {
          pattern: /^\/api\/mcp\/(official-catalog|catalog|official|servers)(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'OPTIONS'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              source: 'https://mcpservers.org/official',
              officialRegistryUrl: 'https://mcpservers.org/official',
              totalServers: OFFICIAL_MCP_REGISTRY.length,
              categories: OFFICIAL_MCP_CATEGORIES,
              servers: OFFICIAL_MCP_REGISTRY,
              fetchedAt: new Date().toISOString()
            }));
          }
        },
        {
          pattern: /^\/api\/agents\/([^/]+)\/config(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            const match = pathname.match(/^\/api\/agents\/([^/]+)\/config(\/)?$/i);
            const agentId = match ? match[1] : 'hermes-agent';
            res.setHeader('Content-Type', 'application/json');
            if (agentId === 'all') {
              const configs: Record<string, any> = {};
              ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'].forEach(id => { configs[id] = getAgentConfig(id); });
              return res.end(JSON.stringify({ success: true, configs }));
            }
            if (method === 'GET') {
              return res.end(JSON.stringify(getAgentConfig(agentId)));
            }
            const body = await readRequestBody(req);
            const nativeContent = body.nativeContent;
            const fallback = defaultNativeFiles[agentId] || defaultNativeFiles['hermes-agent'];
            const filePath = path.join(dataDir, fallback.fileName);
            if (typeof nativeContent === 'string') {
              try { fs.writeFileSync(filePath, nativeContent, 'utf8'); } catch {}
            }
            return res.end(JSON.stringify({ success: true, agentId, nativeContent }));
          }
        },
        {
          pattern: /^\/api\/export\/code(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, message: 'Code export archive generated successfully' }));
          }
        },
        {
          pattern: /^\/api\/containers\/restart-all(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, message: 'All agent containers restart sequence initiated.' }));
          }
        },
        {
          pattern: /^\/api\/agents\/([^/]+)\/exec(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
          handler: async () => {
            let body: any = {};
            if (method === 'POST' || method === 'PUT') {
              try {
                body = await readRequestBody(req);
              } catch (e) {
                console.error('[Vite API Server Debug] Error reading body:', e);
              }
            }

            console.log(`[Vite API Server Debug] exec route hit. Method: ${method}, URL: ${pathname}`);
            console.log(`[Vite API Server Debug] Headers:`, JSON.stringify(req.headers, null, 2));
            console.log(`[Vite API Server Debug] Body:`, JSON.stringify(body, null, 2));

            if (method === 'OPTIONS') {
              res.statusCode = 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
              return res.end();
            }

            if (!['POST', 'PUT', 'GET'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Method Not Allowed', allowed: ['POST', 'PUT', 'GET'] }));
            }

            const match = pathname.match(/^\/api\/agents\/([^/]+)\/exec(\/)?$/i);
            const agentId = match ? match[1] : 'hermes-agent';
            const command = body.command || parsedUrl.searchParams.get('command');

            if (!command) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, agentId, error: 'Command is required in request body or as query parameter.' }));
            }

            try {
              const { execSync } = await import('child_process');
              console.log(`[API Bridge] [${agentId}] Executing command: ${command}`);
              const output = execSync(`docker exec ${agentId} ${command}`, { encoding: 'utf8', timeout: 10000 });
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, agentId, command, output }));
            } catch (err: any) {
              console.error(`[API Bridge] [${agentId}] Exec failed:`, err.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ 
                success: false, 
                agentId, 
                command, 
                error: err.message,
                output: err.stdout || err.stderr 
              }));
            }
          }
        },
        // Resource monitoring stats endpoint for agents: /api/agents/:id/stats, /api/agents/stats, /api/stats (and aliases resources/metrics)
        {
          pattern: /^\/api\/(?:agents?|agent)(?:\/([^/]+))?\/(stats|resources|metrics)(\/)?$|^\/api\/(stats|resources|metrics)(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'OPTIONS', 'HEAD'],
          handler: async ({ pathname, res, parsedUrl, method }) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, HEAD');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            if (method === 'OPTIONS') {
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true }));
            }

            res.statusCode = 200;
            // Explicitly capture optional agent ID from /api/agents/:id/stats or fallback query param
            const specificMatch = pathname.match(/^\/api\/(?:agents?|agent)\/([^/]+)\/(?:stats|resources|metrics)(?:\/)?$/i);
            let rawId = specificMatch && specificMatch[1] ? specificMatch[1].trim() : '';
            if (rawId && ['stats', 'resources', 'metrics', 'all', 'undefined', 'null'].includes(rawId.toLowerCase())) {
              rawId = '';
            }

            const agentId = rawId
              ? rawId
              : (parsedUrl.searchParams.get('agentId') || parsedUrl.searchParams.get('agent') || 'hermes-agent');

            const payload = buildAgentStatsPayload(agentId);
            console.log(`[Vite API Server] Debug: stats payload generated for agent "${agentId}" from path "${pathname}"`);
            return res.end(JSON.stringify(payload, null, 2));
          }
        },
        // Agent lifecycle actions in dynamicRouteMappings
        {
          pattern: /^\/api\/agents\/([^/]+)\/(start|stop|restart|install|detect|logs|docker-exec-config|doctor-fix)(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            const match = pathname.match(/^\/api\/agents\/([^/]+)\/(start|stop|restart|install|detect|logs|docker-exec-config|doctor-fix)(\/)?$/i);
            
            if (!match) {
              res.statusCode = 404;
              return res.end('Not Found');
            }

            const agentId = match[1];
            const action = match[2];

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (action === 'logs') {
              return res.end(JSON.stringify({ success: true, logs: agentStates[agentId]?.logs || [] }));
            }

            if (action === 'start') {
              if (agentStates[agentId]) {
                agentStates[agentId].status = 'running';
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Container started.`);
              }
              return res.end(JSON.stringify({ success: true, status: 'running', action: 'started' }));
            }

            if (action === 'stop') {
              if (agentStates[agentId]) {
                agentStates[agentId].status = 'stopped';
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Container stopped.`);
              }
              return res.end(JSON.stringify({ success: true, status: 'stopped' }));
            }

            if (action === 'restart') {
              let wasStopped = false;
              if (agentStates[agentId]) {
                wasStopped = agentStates[agentId].status === 'stopped';
                agentStates[agentId].status = 'restarting';
                agentStates[agentId].logs.push(
                  wasStopped
                    ? `[${new Date().toLocaleTimeString()}] [Docker Engine] Starting container ${agentId}...`
                    : `[${new Date().toLocaleTimeString()}] [Docker Engine] Executing docker restart for container ${agentId}...`
                );
                setTimeout(() => {
                  if (agentStates[agentId]) {
                    agentStates[agentId].status = 'running';
                    agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] [Docker Engine] Container restarted and healthy.`);
                  }
                }, 600);
              }
              return res.end(JSON.stringify({ 
                success: true, 
                status: 'running', 
                action: wasStopped ? 'started' : 'restarted',
                message: wasStopped ? `Started container for ${agentId}` : `Restarted container for ${agentId}` 
              }));
            }

            if (action === 'install') {
              return res.end(JSON.stringify({ success: true, status: 'installed' }));
            }

            if (action === 'detect') {
              return res.end(JSON.stringify({ success: true, detected: true, agentId, status: agentStates[agentId]?.status || 'running' }));
            }

            if (action === 'doctor-fix') {
              if (agentStates[agentId]) {
                agentStates[agentId].status = 'running';
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] [${agentId}-gateway] Executing openclaw doctor --fix...`);
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] [state/db] State database schema migrated successfully (audit-events-v2) at /home/openclaw/state/openclaw.sqlite`);
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] [lifecycle] Workspace setup state migration completed for /home/openclaw/workspace`);
                agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] [gateway] Gateway started successfully. Status: RUNNING on port 8082.`);
              }
              return res.end(JSON.stringify({
                success: true,
                status: 'running',
                action: 'doctor-fix',
                message: `OpenClaw doctor --fix completed successfully for ${agentId}. Database migrated to audit-events-v2 and gateway restarted.`
              }));
            }

            if (action === 'docker-exec-config') {
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

            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'Not Found', action, agentId }));
          }
        },
        {
          pattern: /^\/api\/agents\/([^/]+)\/models(\/)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            const match = pathname.match(/^\/api\/agents\/([^/]+)\/models(\/)?$/i);
            const agentId = match ? match[1] : 'hermes-agent';
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              agentId,
              models: [{ value: 'gemma4-soul:latest', label: 'gemma4-soul:latest', tag: 'Active' }]
            }));
          }
        },
        {
          pattern: /^\/api\/resources(\/)?$/i,
          allowedMethods: ['GET', 'OPTIONS'],
          handler: async () => {
            try {
              console.log(`[Mock Server] [${new Date().toISOString()}] Incoming request: ${method} ${req.url} to /api/resources`);
              res.setHeader('Content-Type', 'application/json');
              if (method === 'OPTIONS') {
                res.statusCode = 200;
                return res.end();
              }
              const resources: Record<string, any> = {};
              ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'].forEach(id => {
                resources[id] = {
                  cpuUsagePct: Math.random() * 20 + 5,
                  memoryUsageMb: 100 + Math.random() * 200
                };
              });

              const payload = { success: true, resources, timestamp: new Date().toISOString() };

              // Pre-stringify serialization that explicitly prevents circular references and undefined values before JSON.stringify
              const sanitizeObject = (obj: any, seen = new Set<any>()): any => {
                if (obj === null || obj === undefined) {
                  return null;
                }
                if (typeof obj !== 'object') {
                  return obj;
                }
                if (seen.has(obj)) {
                  return '[Circular]';
                }
                seen.add(obj);

                if (Array.isArray(obj)) {
                  const result = obj.map(item => sanitizeObject(item, seen));
                  seen.delete(obj);
                  return result;
                }

                const result: Record<string, any> = {};
                for (const key of Object.keys(obj)) {
                  const val = obj[key];
                  if (val === undefined) {
                    result[key] = null;
                  } else {
                    result[key] = sanitizeObject(val, seen);
                  }
                }
                seen.delete(obj);
                return result;
              };

              const sanitizedPayload = sanitizeObject(payload);
              const serializedPayload = JSON.stringify(sanitizedPayload, null, 2);

              console.log(`[Mock Server] [${new Date().toISOString()}] Outputting generated resources JSON payload for verification:\n`, serializedPayload);
              return res.end(serializedPayload);
            } catch (err: any) {
              console.error(`[Mock Server] [${new Date().toISOString()}] Exception handling GET /api/resources:`, err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              return res.end(JSON.stringify({
                success: false,
                error: err?.message || 'Internal Server Error',
                timestamp: new Date().toISOString()
              }));
            }
          }
        },
        {
          pattern: /^\/api\/everos(\/.*)?$/i,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          handler: async () => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ status: 'online', totalMemories: 1420 }));
          }
        },
      ];

      const router = new Router().loadDynamicRouteMappings(dynamicRouteMappings);
      const handled = await router.handle({ req, res, pathname, method, parsedUrl, timestamp });
      if (handled) {
        return;
      }

      // Centralized modern fallback for unhandled API routes (nested switch bypassed)
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Not Found', 
        pathname, 
        method, 
        timestamp: new Date().toISOString() 
      }));
      return;
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
