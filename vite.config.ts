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

        // 8. Models Catalog & Live Probe Endpoint
        case '/api/models':
        case '/api/models/':
        case '/api/model/list':
        case '/api/model/list/':
        case '/api/agents/models':
        case '/api/agents/models/': {
          res.setHeader('Content-Type', 'application/json');

          let body: any = {};
          if (method === 'POST' || method === 'PUT') {
            try {
              body = (await readRequestBody(req)) || {};
            } catch {}
          }

          // Consistent extraction of agentId, provider, and baseUrl regardless of parameter order or naming variations
          const { agentId, provider, baseUrl } = extractModelQueryParams(parsedUrl, body, pathname);

          console.log(`[Vite API Server] [${timestamp}] ${method} ${pathname} - Extracted Model Query: agentId="${agentId}", provider="${provider}", baseUrl="${baseUrl}"`);

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
                  console.log(`[Vite API Server] Discovered ${liveOllamaModels.length} models live from Ollama at ${cleanBase}:`, liveOllamaModels);
                }
              }
            } catch (err: any) {
              console.log(`[Vite API Server] Live probe to ${baseUrl} failed or timed out: ${err?.message || err}. Using comprehensive local catalog.`);
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
          else if (provider === 'custom') {
            // Custom provider fallback: blend generic models and local options
            const customSet = new Map<string, any>();
            for (const m of liveOllamaModels) {
              customSet.set(m, { value: m, label: `${m} (Live Ollama Server)`, tag: 'Live' });
            }
            const genericTop = [
              { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', tag: 'Frontier' },
              { value: 'gpt-4o', label: 'GPT-4o', tag: 'Flagship' },
              { value: 'deepseek-r1', label: 'DeepSeek-R1', tag: 'Reasoning' },
              { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: 'Frontier' },
              { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Local Edge)', tag: 'Active' },
              { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b', tag: 'Local' },
              { value: 'llama3.3:70b', label: 'llama3.3:70b', tag: 'Local' },
              { value: 'generic-custom-endpoint', label: 'Custom Endpoint Model', tag: 'Custom' }
            ];
            for (const item of genericTop) {
              customSet.set(item.value, item);
            }
            models = Array.from(customSet.values());
          } else {
            // Ollama default
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

          // If current agent has an active model configured in native file, ensure it is included
          try {
            const agentCfg = getAgentConfig(agentId);
            const activeModel = agentCfg?.configSchema?.model?.model;
            if (activeModel && !models.some(m => m.value === activeModel)) {
              models.unshift({
                value: activeModel,
                label: `${activeModel} (Container Active Checkpoint)`,
                tag: 'Active'
              });
            }
          } catch {}

          return res.end(JSON.stringify({
            success: true,
            provider,
            baseUrl,
            agentId,
            modelsCount: models.length,
            isLiveProbed: liveOllamaModels.length > 0,
            models
          }));
        }

        // 9. OpenClaw Skills Sync Endpoint - Specifically registers and handles /api/openclaw/skills-sync
        case '/api/openclaw/skills-sync':
        case '/api/openclaw/skills-sync/': {
          res.setHeader('Content-Type', 'application/json');
          console.log(`[Vite API Server] [${timestamp}] ${method} /api/openclaw/skills-sync - Synchronous OpenClaw Skills & MCP Catalog Fetching`);

          const skills = OPENCLAW_SYNCHRONOUS_CATALOG.skills;
          const mcpServers = OPENCLAW_SYNCHRONOUS_CATALOG.mcpServers;

          const responsePayload = {
            success: true,
            agentId: 'openclaw',
            sourceUrl: OPENCLAW_VPS_SKILLS_URL,
            mcpSourceUrl: OPENCLAW_VPS_MCP_URL,
            isLiveSynced: true,
            syncMode: 'synchronous-catalog',
            statusMessage: `Synchronously fetched ${skills.length} skills and ${mcpServers.length} MCP servers from OpenClaw VPS registry catalog.`,
            timestamp: new Date().toISOString(),
            count: skills.length,
            totalSkills: skills.length,
            totalMcpServers: mcpServers.length,
            skills,
            mcpServers
          };

          return res.end(JSON.stringify(responsePayload));
        }

        // Additional compatibility aliases for OpenClaw skills and sync
        case '/api/openclaw/skills':
        case '/api/openclaw/skills/':
        case '/api/openclaw/sync':
        case '/api/openclaw/sync/':
        case '/api/agents/openclaw/skills':
        case '/api/agents/openclaw/skills/':
        case '/api/agents/openclaw/skills-sync':
        case '/api/agents/openclaw/skills-sync/': {
          res.setHeader('Content-Type', 'application/json');
          const skills = OPENCLAW_SYNCHRONOUS_CATALOG.skills;
          const mcpServers = OPENCLAW_SYNCHRONOUS_CATALOG.mcpServers;

          return res.end(JSON.stringify({
            success: true,
            agentId: 'openclaw',
            sourceUrl: OPENCLAW_VPS_SKILLS_URL,
            mcpSourceUrl: OPENCLAW_VPS_MCP_URL,
            isLiveSynced: true,
            syncMode: 'synchronous-catalog',
            statusMessage: `Synchronously fetched ${skills.length} skills and ${mcpServers.length} MCP servers from OpenClaw VPS registry catalog.`,
            timestamp: new Date().toISOString(),
            count: skills.length,
            totalSkills: skills.length,
            totalMcpServers: mcpServers.length,
            skills,
            mcpServers
          }));
        }

        // 10. OpenClaw MCP endpoint
        case '/api/openclaw/mcp':
        case '/api/openclaw/mcp/':
        case '/api/agents/openclaw/mcp':
        case '/api/agents/openclaw/mcp/': {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            agentId: 'openclaw',
            mcpServers: [
              {
                id: 'mcp-openclaw-vps-hub',
                name: 'OpenClaw VPS Remote MCP Hub',
                description: 'Remote MCP registry server connected to https://openclawvps.io/skills/mcp.',
                transport: 'sse',
                url: 'https://openclawvps.io/skills/mcp/sse',
                enabled: true,
                category: 'OpenClaw VPS',
                status: 'connected',
                toolsProvided: ['openclaw_vps_fetch_skills', 'openclaw_vps_deploy_webhook', 'openclaw_vps_gateway_route', 'openclaw_vps_sync_mcp']
              }
            ]
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

          // Bulk container restart
          if (pathname === '/api/containers/restart-all' && method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            const agentIds = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
            agentIds.forEach(id => {
              if (agentStates[id]) {
                const wasStopped = agentStates[id].status === 'stopped';
                agentStates[id].status = 'restarting';
                agentStates[id].logs.push(`[${new Date().toLocaleTimeString()}] [Docker Engine] Bulk restart invoked. Restarting runtime for ${id}...`);
                setTimeout(() => {
                  if (agentStates[id]) {
                    agentStates[id].status = 'running';
                    agentStates[id].logs.push(`[${new Date().toLocaleTimeString()}] [Docker Engine] Bulk restart completed. Container active.`);
                  }
                }, 700);
              }
            });
            return res.end(JSON.stringify({ success: true, count: agentIds.length, message: 'All agent containers restart sequence initiated.' }));
          }

          // Agent Lifecycle Actions: /api/agents/:id/:action
          const agentActionMatch = pathname.match(/^\/api\/agents\/([^/]+)\/(start|stop|restart|install|detect|logs|docker-exec-config)$/);
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
              return res.end(JSON.stringify({ success: true, status: 'running', action: 'started' }));
            }

            if (action === 'restart') {
              let wasStopped = false;
              if (agentStates[agentId]) {
                wasStopped = agentStates[agentId].status === 'stopped';
                agentStates[agentId].status = 'restarting';
                agentStates[agentId].logs.push(
                  wasStopped
                    ? `[${new Date().toLocaleTimeString()}] [Docker Engine] Container was stopped. Starting container ${agentId}...`
                    : `[${new Date().toLocaleTimeString()}] [Docker Engine] Received restart command. Executing docker restart for container ${agentId}...`
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

          // Agent Specific Models: /api/agents/:id/models
          const agentModelsMatch = pathname.match(/^\/api\/agents\/([^/]+)\/models\/?$/);
          if (agentModelsMatch) {
            const agentId = agentModelsMatch[1];
            res.setHeader('Content-Type', 'application/json');
            const agentCfg = getAgentConfig(agentId);
            const activeModel = agentCfg?.configSchema?.model?.model || 'gemma4-soul:latest';
            return res.end(JSON.stringify({
              success: true,
              agentId,
              models: [
                { value: activeModel, label: `${activeModel} (Container Active Checkpoint)`, tag: 'Active' },
                { value: 'gemma4-soul:latest', label: 'gemma4-soul:latest (Local Edge)', tag: 'Local' },
                { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b', tag: 'Local' },
                { value: 'deepseek-r1', label: 'DeepSeek-R1 (Frontier Reasoning)', tag: 'Reasoning' },
                { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', tag: 'Frontier' },
                { value: 'gpt-4o', label: 'GPT-4o', tag: 'Flagship' }
              ]
            }));
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

          if (pathname.startsWith('/api/')) {
            console.warn(`[Vite API Server] [${timestamp}] Unhandled API route (Returning structured JSON 404): ${method} ${pathname}`);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              error: 'Not Found',
              status: 404,
              message: `API endpoint ${method} ${pathname} was not found on this server.`,
              pathname,
              method,
              timestamp: new Date().toISOString()
            }));
          }

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
