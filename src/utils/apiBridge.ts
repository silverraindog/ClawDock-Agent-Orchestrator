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

  // 3. Try live backend API (standardized /config suffix)
  try {
    const res = await fetch('/api/agents/all/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.configs) {
        for (const [id, cfgObj] of Object.entries(data.configs as Record<string, any>)) {
          if (cfgObj && cfgObj.configSchema) {
            merged[id as AgentId] = mergeWithDefaultConfig(id as AgentId, cfgObj.configSchema);
          }
        }
      }
    }
  } catch (e) {
    // Graceful fallback to merged defaults
  }

  return merged;
}

export async function fetchAgentLiveConfig(agentId: AgentId): Promise<{
  fileName: string;
  format: string;
  content: string;
  configSchema: AgentFullConfig;
}> {
  const fallback = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
  const fallbackConfig = mergeWithDefaultConfig(agentId);

  try {
    const res = await fetch(`/api/agents/${agentId}/config`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        const schema = mergeWithDefaultConfig(agentId, data.configSchema);
        return {
          fileName: data.nativeFileName || fallback.fileName,
          format: data.nativeFormat || fallback.format,
          content: data.nativeContent || fallback.content,
          configSchema: schema
        };
      }
    }
  } catch {}

  // Load from local storage if previously modified
  let content = fallback.content;
  try {
    const local = getLocalPersistence();
    if (local && local.nativeFiles && local.nativeFiles[agentId]) {
      content = local.nativeFiles[agentId];
    }
    if (local && local.configs && local.configs[agentId]) {
      return {
        fileName: fallback.fileName,
        format: fallback.format,
        content,
        configSchema: mergeWithDefaultConfig(agentId, local.configs[agentId])
      };
    }
  } catch {}

  return {
    fileName: fallback.fileName,
    format: fallback.format,
    content,
    configSchema: fallbackConfig
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
      const err: any = new Error(`GET /api/state failed with HTTP ${res.status}: ${errorText || res.statusText}`);
      err.status = res.status;
      err.statusText = res.statusText;
      err.responseBody = errorText;
      console.error(`[API Bridge] GET /api/state returned error:`, err);
      throw err;
    }
    const data = await res.json();
    if (data && data.success && data.agentStates) {
      return data.agentStates;
    }
  } catch (err) {
    console.error('[API Bridge] Exception in fetchRuntimeAgentStates:', err);
    throw err;
  }

  return defaultStates;
}

