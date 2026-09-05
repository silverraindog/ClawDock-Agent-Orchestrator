import { AgentFullConfig, AgentId, AgentInfo } from '../types';
import { DEFAULT_CONFIGS, DEFAULT_NATIVE_FILES, INITIAL_AGENTS } from '../data/defaults';

// Client-Side Resilient Persistence & Config Bridge
// Provides seamless operation in both Full-Stack Node mode and Static / LAN / Offline SPA mode

const LOCAL_PERSISTENCE_KEY = 'clawdock_persistence_v2';
const LOCAL_CONFIGS_KEY = 'clawdock_agent_configs_v2';
const LOCAL_STATES_KEY = 'clawdock_agent_states_v2';

let isBackendLive: boolean | null = null;

export async function checkBackendAvailability(): Promise<boolean> {
  if (isBackendLive !== null) return isBackendLive;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    isBackendLive = res.ok;
    return isBackendLive;
  } catch {
    isBackendLive = false;
    return false;
  }
}

export function getLocalPersistence(): Record<string, any> {
  try {
    const saved = localStorage.getItem(LOCAL_PERSISTENCE_KEY);
    if (saved) return JSON.parse(saved);
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
  const merged: Record<AgentId, AgentFullConfig> = { ...DEFAULT_CONFIGS };

  // 2. Overlay with local persistence if present
  try {
    const local = getLocalPersistence();
    if (local && local.configs) {
      for (const [id, cfg] of Object.entries(local.configs as Record<string, AgentFullConfig>)) {
        if (cfg && cfg.model && cfg.model.model && cfg.model.model !== 'provider:') {
          merged[id as AgentId] = { ...merged[id as AgentId], ...cfg };
        }
      }
    }
  } catch {}

  // 3. Try live backend API if available
  try {
    const isLive = await checkBackendAvailability();
    if (isLive) {
      const res = await fetch('/api/agents/all/configs');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.configs) {
          for (const [id, cfgObj] of Object.entries(data.configs as Record<string, any>)) {
            if (cfgObj && cfgObj.configSchema && cfgObj.configSchema.model?.model !== 'provider:') {
              merged[id as AgentId] = { ...merged[id as AgentId], ...cfgObj.configSchema };
            }
          }
        }
      }
    }
  } catch (e) {
    // Graceful fallback without crashing
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
  const fallbackConfig = DEFAULT_CONFIGS[agentId] || DEFAULT_CONFIGS['hermes-agent'];

  try {
    const isLive = await checkBackendAvailability();
    if (isLive) {
      const res = await fetch(`/api/agents/${agentId}/config`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const schema = data.configSchema || fallbackConfig;
          if (schema.model?.model === 'provider:') {
            schema.model.model = fallbackConfig.model.model;
          }
          return {
            fileName: data.nativeFileName || fallback.fileName,
            format: data.nativeFormat || fallback.format,
            content: data.nativeContent || fallback.content,
            configSchema: schema
          };
        }
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

  // Try saving to backend if live
  try {
    const isLive = await checkBackendAvailability();
    if (isLive) {
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          nativeContent,
          restart
        })
      });
      return res.ok;
    }
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
    const isLive = await checkBackendAvailability();
    if (isLive) {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.agentStates) {
          return data.agentStates;
        }
      }
    }
  } catch {}

  return defaultStates;
}
