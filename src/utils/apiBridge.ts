import { AgentFullConfig, AgentId, AgentInfo } from '../types';
import { DEFAULT_CONFIGS, DEFAULT_NATIVE_FILES, INITIAL_AGENTS } from '../data/defaults';

// Client-Side Resilient Persistence & Config Bridge
// Provides seamless operation in both Full-Stack Node mode and Static / LAN / Offline SPA mode

const LOCAL_PERSISTENCE_KEY = 'clawdock_persistence_v2';
const LOCAL_CONFIGS_KEY = 'clawdock_agent_configs_v2';
const LOCAL_STATES_KEY = 'clawdock_agent_states_v2';

export function mergeWithDefaultConfig(agentId: AgentId, custom?: Partial<AgentFullConfig>): AgentFullConfig {
  const base = DEFAULT_CONFIGS[agentId] || DEFAULT_CONFIGS['hermes-agent'];
  if (!custom) return JSON.parse(JSON.stringify(base));

  return {
    agentId,
    version: custom.version || base.version || '1.0.0',
    model: {
      provider: custom.model?.provider || base.model.provider,
      model: (custom.model?.model && custom.model.model !== 'provider:') ? custom.model.model : base.model.model,
      apiKey: custom.model?.apiKey ?? base.model.apiKey,
      temperature: typeof custom.model?.temperature === 'number' ? custom.model.temperature : base.model.temperature,
      reasoningEffort: custom.model?.reasoningEffort || base.model.reasoningEffort,
      maxTokens: custom.model?.maxTokens || base.model.maxTokens,
      contextWindow: custom.model?.contextWindow || base.model.contextWindow,
      baseUrl: custom.model?.baseUrl ?? base.model.baseUrl,
      topP: typeof custom.model?.topP === 'number' ? custom.model.topP : base.model.topP,
    },
    moa: {
      enabled: custom.moa?.enabled ?? base.moa.enabled,
      proposerModels: custom.moa?.proposerModels || base.moa.proposerModels,
      aggregatorModel: custom.moa?.aggregatorModel || base.moa.aggregatorModel,
      rounds: custom.moa?.rounds || base.moa.rounds,
      temperatureSpread: custom.moa?.temperatureSpread ?? base.moa.temperatureSpread,
      consensusThreshold: custom.moa?.consensusThreshold ?? base.moa.consensusThreshold,
    },
    channels: {
      telegram: { ...base.channels.telegram, ...(custom.channels?.telegram || {}) },
      discord: { ...base.channels.discord, ...(custom.channels?.discord || {}) },
      slack: { ...base.channels.slack, ...(custom.channels?.slack || {}) },
      whatsapp: { ...base.channels.whatsapp, ...(custom.channels?.whatsapp || {}) },
      matrix: { ...base.channels.matrix, ...(custom.channels?.matrix || {}) },
      webhook: { ...base.channels.webhook, ...(custom.channels?.webhook || {}) },
    },
    system: {
      preset: custom.system?.preset || base.system.preset,
      systemPrompt: custom.system?.systemPrompt || base.system.systemPrompt,
      agentName: custom.system?.agentName || base.system.agentName,
      personaName: custom.system?.personaName || base.system.personaName,
      language: custom.system?.language || base.system.language,
      autoFormatCode: custom.system?.autoFormatCode ?? base.system.autoFormatCode,
    },
    security: {
      sandboxMode: custom.security?.sandboxMode || base.security.sandboxMode,
      allowedDirectories: custom.security?.allowedDirectories || base.security.allowedDirectories,
      blockNetworkAccess: custom.security?.blockNetworkAccess ?? base.security.blockNetworkAccess,
      maxExecutionTimeSec: custom.security?.maxExecutionTimeSec || base.security.maxExecutionTimeSec,
      requireApprovalForCommands: custom.security?.requireApprovalForCommands ?? base.security.requireApprovalForCommands,
      securityProfileFile: custom.security?.securityProfileFile || base.security.securityProfileFile,
    },
    storage: {
      memoryBackend: custom.storage?.memoryBackend || base.storage.memoryBackend,
      dbPath: custom.storage?.dbPath || base.storage.dbPath,
      autoSummarizeInterval: custom.storage?.autoSummarizeInterval || base.storage.autoSummarizeInterval,
      maxHistoryTurns: custom.storage?.maxHistoryTurns || base.storage.maxHistoryTurns,
      vectorDbUrl: custom.storage?.vectorDbUrl || base.storage.vectorDbUrl,
    },
    customEnv: {
      ...(base.customEnv || {}),
      ...(custom.customEnv || {})
    }
  };
}

export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export function getLocalPersistence(): Record<string, any> {
  try {
    const saved = localStorage.getItem(LOCAL_PERSISTENCE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return { configs: DEFAULT_CONFIGS };
}

export function saveLocalPersistence(key: string, value: any): void {
  try {
    const current = getLocalPersistence();
    current[key] = value;
    localStorage.setItem(LOCAL_PERSISTENCE_KEY, JSON.stringify(current));
  } catch {}
}

export async function fetchAllAgentConfigs(): Promise<Record<AgentId, AgentFullConfig>> {
  // 1. Start with hardcoded defaults
  const merged: Record<AgentId, AgentFullConfig> = {
    'hermes-agent': mergeWithDefaultConfig('hermes-agent'),
    'zeroclaw': mergeWithDefaultConfig('zeroclaw'),
    'openclaw': mergeWithDefaultConfig('openclaw'),
    'picoclaw': mergeWithDefaultConfig('picoclaw'),
  };

  // 2. Overlay with local persistence if present
  try {
    const local = getLocalPersistence();
    if (local && local.configs) {
      for (const [id, cfg] of Object.entries(local.configs as Record<string, any>)) {
        if (cfg && typeof cfg === 'object') {
          merged[id as AgentId] = mergeWithDefaultConfig(id as AgentId, cfg);
        }
      }
    }
  } catch {}

  // 3. Fetch each agent's config individually in parallel using valid agent IDs
  // (Prevents passing 'all' to FastAPI's /api/agents/{agent_id}/config which expects a Literal['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'])
  const AGENT_IDS: AgentId[] = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];
  
  await Promise.allSettled(
    AGENT_IDS.map(async (id) => {
      try {
        const res = await fetch(`/api/agents/${id}/config`);
        if (res.ok) {
          const data = await res.json();
          const schema = data?.configSchema || data?.config || (data?.model ? data : null);
          if (schema) {
            merged[id] = mergeWithDefaultConfig(id, schema);
          }
        }
      } catch (e) {
        // Fallback to merged defaults
      }
    })
  );

  return merged;
}

export interface LiveConfigFetchResult {
  fileName: string;
  format: string;
  content: string;
  configSchema: AgentFullConfig;
  rawJson: any;
  verboseLogs: string[];
  source: string;
  filePath: string;
  timestamp: string;
  isLive: boolean;
}

export async function fetchAgentLiveConfig(agentId: AgentId): Promise<LiveConfigFetchResult> {
  const fallback = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
  const fallbackConfig = mergeWithDefaultConfig(agentId);
  const verboseLogs: string[] = [];
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString();

  verboseLogs.push(`[${timestamp}] [INIT] Initiating live container config fetch for agent: "${agentId}"`);

  let fetchedData: any = null;
  let source = 'unknown';
  let filePath = `data/clawdock/${fallback.fileName}`;
  let isLive = false;

  // Primary live endpoint: /api/agents/${agentId}/docker-exec-config
  const endpointsToTry = [
    { url: `/api/agents/${agentId}/docker-exec-config`, method: 'GET', desc: 'Docker Exec Live Config (GET)' },
    { url: `/api/agents/${agentId}/docker-exec-config`, method: 'POST', desc: 'Docker Exec Live Config (POST)' },
    { url: `/api/agents/${agentId}/config`, method: 'GET', desc: 'Agent Config API (GET)' }
  ];

  for (const ep of endpointsToTry) {
    try {
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [HTTP] Trying ${ep.desc} -> ${ep.url}`);
      const t0 = Date.now();
      const res = await fetch(ep.url, { method: ep.method });
      const elapsed = Date.now() - t0;
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [HTTP] ${ep.url} responded with HTTP ${res.status} ${res.statusText} (${elapsed}ms)`);

      if (res.ok) {
        const data = await res.json();
        fetchedData = data;
        source = data.source || (ep.url.includes('docker-exec') ? 'docker_exec' : 'api_config');
        filePath = data.filePath || filePath;
        isLive = true;
        verboseLogs.push(`[${new Date().toLocaleTimeString()}] [SUCCESS] Successfully received payload from ${ep.url}`);
        verboseLogs.push(`[${new Date().toLocaleTimeString()}] [PARSE] Detected source: "${source}", file: "${filePath}"`);
        break;
      } else {
        verboseLogs.push(`[${new Date().toLocaleTimeString()}] [WARN] Endpoint ${ep.url} returned non-200 status: ${res.status}`);
      }
    } catch (err: any) {
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [ERROR] Request to ${ep.url} failed: ${err?.message || err}`);
    }
  }

  // Console output
  console.group(`%c[ClawDock Live Container Config] Agent: ${agentId}`, 'color: #818cf8; font-weight: bold; font-size: 12px;');
  console.log(`Fetch duration: ${Date.now() - startTime}ms | Timestamp: ${timestamp}`);
  console.log('Verbose Execution Logs:\n' + verboseLogs.join('\n'));
  if (fetchedData) {
    console.log('Raw Received JSON:', fetchedData);
  } else {
    console.warn('No remote live payload received, falling back to local store/defaults.');
  }
  console.groupEnd();

  if (fetchedData) {
    const rawSchema = fetchedData.configSchema || fetchedData.config || (fetchedData.model ? fetchedData : null);
    const schema = rawSchema ? mergeWithDefaultConfig(agentId, rawSchema) : fallbackConfig;
    const content = fetchedData.nativeContent || fallback.content;
    const fileName = fetchedData.nativeFileName || fallback.fileName;
    const format = fetchedData.nativeFormat || fallback.format;

    verboseLogs.push(`[${new Date().toLocaleTimeString()}] [SCHEMA] Model: ${schema.model.provider}/${schema.model.model} (temp: ${schema.model.temperature})`);
    verboseLogs.push(`[${new Date().toLocaleTimeString()}] [SCHEMA] Channels: Telegram=${schema.channels.telegram.enabled}, Discord=${schema.channels.discord.enabled}, Webhook=${schema.channels.webhook.enabled}`);

    return {
      fileName,
      format,
      content,
      configSchema: schema,
      rawJson: fetchedData,
      verboseLogs,
      source,
      filePath,
      timestamp,
      isLive: true
    };
  }

  // Load from local storage if previously modified
  let content = fallback.content;
  try {
    const local = getLocalPersistence();
    if (local && local.nativeFiles && local.nativeFiles[agentId]) {
      content = local.nativeFiles[agentId];
    }
    if (local && local.configs && local.configs[agentId]) {
      const localSchema = mergeWithDefaultConfig(agentId, local.configs[agentId]);
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [FALLBACK] Loaded configuration from client local storage.`);
      return {
        fileName: fallback.fileName,
        format: fallback.format,
        content,
        configSchema: localSchema,
        rawJson: { fallback: true, source: 'local_storage', config: localSchema },
        verboseLogs,
        source: 'local_storage',
        filePath: `localStorage:configs.${agentId}`,
        timestamp,
        isLive: false
      };
    }
  } catch {}

  verboseLogs.push(`[${new Date().toLocaleTimeString()}] [FALLBACK] Using factory defaults for ${agentId}.`);
  return {
    fileName: fallback.fileName,
    format: fallback.format,
    content,
    configSchema: fallbackConfig,
    rawJson: { fallback: true, source: 'factory_defaults', config: fallbackConfig },
    verboseLogs,
    source: 'factory_defaults',
    filePath: `defaults:${fallback.fileName}`,
    timestamp,
    isLive: false
  };
}

export async function saveAgentConfigToBackend(
  agentId: AgentId, 
  config: AgentFullConfig, 
  nativeContent?: string,
  restart: boolean = false
): Promise<boolean> {
  // Always save locally first for instantaneous responsiveness
  try {
    const current = getLocalPersistence();
    if (!current.configs) current.configs = {};
    current.configs[agentId] = config;
    if (nativeContent) {
      if (!current.nativeFiles) current.nativeFiles = {};
      current.nativeFiles[agentId] = nativeContent;
    }
    localStorage.setItem(LOCAL_PERSISTENCE_KEY, JSON.stringify(current));
  } catch {}

  // Try saving to backend
  try {
    const res = await fetch(`/api/agents/${agentId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        nativeContent,
        restart,
        restartContainer: restart
      })
    });
    return res.ok;
  } catch {}

  return true;
}

export async function fetchRuntimeAgentStates(): Promise<Record<string, { status: string; containerId: string; logs: string[] }>> {
  const defaultStates: Record<string, { status: string; containerId: string; logs: string[] }> = {
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

  try {
    const res = await fetch('/api/state');
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(`[API Bridge] GET /api/state returned HTTP ${res.status}: ${errorText || res.statusText}; falling back to default states.`);
      return defaultStates;
    }
    const data = await res.json();
    if (data && data.success && data.agentStates) {
      return data.agentStates;
    }
  } catch (err) {
    console.warn('[API Bridge] Exception in fetchRuntimeAgentStates; using default states:', err);
    return defaultStates;
  }

  return defaultStates;
}

