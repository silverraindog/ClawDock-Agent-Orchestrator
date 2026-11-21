import {
  AgentId,
  AgentFullConfig,
  DockerSystemInfo,
  LLMHealthReport,
  ModelPresetSnapshot,
  SystemUpdateItem,
  LastKnownGoodConfigSnapshot
} from '../types';
import { MODEL_OPTIONS } from '../data/defaults';
import { INITIAL_PRESETS } from '../data/presetsData';
import { INITIAL_UPDATES } from '../data/updatesData';
import { sanitizeConfigString } from './configParser';

export { sanitizeConfigString };

const PERSISTENCE_KEY = 'clawdock_persistence_v2';
const AGENT_STATES_KEY = 'clawdock_agent_states_v2';
const UPDATES_KEY = 'clawdock_updates_v2';
const PRESETS_KEY = 'clawdock_presets_v2';

export interface ModelOptionItem {
  value: string;
  label: string;
  tag?: string;
  memoryUsage?: string;
  contextWindow?: number;
}

export const DEFAULT_PROVIDER_MODELS: Record<string, ModelOptionItem[]> = {
  openai: MODEL_OPTIONS.openai || [],
  anthropic: MODEL_OPTIONS.anthropic || [],
  gemini: MODEL_OPTIONS.gemini || [],
  deepseek: MODEL_OPTIONS.deepseek || [],
  groq: MODEL_OPTIONS.groq || [],
  mistral: MODEL_OPTIONS.mistral || [],
  ollama: MODEL_OPTIONS.ollama || [],
  openrouter: MODEL_OPTIONS.openrouter || [],
  custom: [
    ...(MODEL_OPTIONS.ollama || []).slice(0, 6),
    ...(MODEL_OPTIONS.custom || [])
  ]
};

export const DEFAULT_LOCAL_MODELS: ModelOptionItem[] = DEFAULT_PROVIDER_MODELS.ollama;
export const DEFAULT_GENERIC_MODELS: ModelOptionItem[] = [
  ...DEFAULT_PROVIDER_MODELS.openai,
  ...DEFAULT_PROVIDER_MODELS.anthropic,
  ...DEFAULT_PROVIDER_MODELS.deepseek
];

export interface AgentExecResult {
  success: boolean;
  agentId: AgentId | string;
  command: string;
  container?: string;
  output: string;
  error?: string;
  exitCode?: number;
  timestamp: string;
  isSimulated?: boolean;
}

export interface ApiHealthStatus {
  status: 'healthy' | 'unhealthy' | 'checking';
  latencyMs: number | null;
  statusCode: number | null;
  uptime: number | null;
  timestamp?: string;
  errorMessage?: string;
}

let lastKnownHealth: ApiHealthStatus = {
  status: 'checking',
  latencyMs: null,
  statusCode: null,
  uptime: null,
  timestamp: new Date().toISOString()
};

export function getLastKnownApiHealth(): ApiHealthStatus {
  return lastKnownHealth;
}

export async function probeApiHealth(): Promise<ApiHealthStatus> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);

    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(end - start));

    if (!res.ok) {
      lastKnownHealth = {
        status: 'unhealthy',
        latencyMs,
        statusCode: res.status,
        uptime: null,
        timestamp: new Date().toISOString(),
        errorMessage: `HTTP ${res.status} ${res.statusText}`
      };
    } else {
      const data = await res.json().catch(() => ({}));
      lastKnownHealth = {
        status: data?.status === 'ok' || res.ok ? 'healthy' : 'unhealthy',
        latencyMs,
        statusCode: res.status,
        uptime: typeof data?.uptime === 'number' ? data.uptime : null,
        timestamp: data?.timestamp || new Date().toISOString()
      };
    }
  } catch (err: any) {
    lastKnownHealth = {
      status: 'unhealthy',
      latencyMs: null,
      statusCode: 0,
      uptime: null,
      timestamp: new Date().toISOString(),
      errorMessage: err?.message || 'Backend unreachable'
    };
  }

  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clawdock:api-health', { detail: lastKnownHealth }));
  }
  return lastKnownHealth;
}

export function logApiFailure(details: {
  endpoint: string;
  status?: number;
  context?: string;
  fallbackAction?: string;
  error?: any;
}): void {
  console.warn(
    `[ClawDock API] ${details.endpoint} (${details.status || 'network'}) in ${details.context || 'unknown'}: ${details.fallbackAction || ''}`,
    details.error?.message || details.error || ''
  );
}

// ==========================================
// Local Storage Persistence Helpers
// ==========================================

function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key: string, value: any): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getLocalPersistence(): Record<string, any> {
  return safeStorageGet<Record<string, any>>(PERSISTENCE_KEY, {});
}

export function saveLocalPersistence(key: string, value: any): void {
  const current = getLocalPersistence();
  current[key] = value;
  safeStorageSet(PERSISTENCE_KEY, current);
}

export function getLocalAgentStates(): Record<string, any> {
  return safeStorageGet<Record<string, any>>(AGENT_STATES_KEY, {});
}

export function saveLocalAgentStates(states: Record<string, any>): void {
  safeStorageSet(AGENT_STATES_KEY, states);
}

export function getLocalUpdates(): SystemUpdateItem[] {
  const saved = safeStorageGet<SystemUpdateItem[] | null>(UPDATES_KEY, null);
  return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_UPDATES;
}

export function saveLocalUpdates(updates: SystemUpdateItem[]): void {
  safeStorageSet(UPDATES_KEY, updates);
}

export function getLocalPresets(): ModelPresetSnapshot[] {
  const saved = safeStorageGet<ModelPresetSnapshot[] | null>(PRESETS_KEY, null);
  if (Array.isArray(saved) && saved.length > 0) return saved;
  const p = getLocalPersistence();
  if (Array.isArray(p.presets) && p.presets.length > 0) return p.presets;
  return INITIAL_PRESETS;
}

export function saveLocalPresets(presets: ModelPresetSnapshot[]): void {
  safeStorageSet(PRESETS_KEY, presets);
  saveLocalPersistence('presets', presets);
}

export function getLocalLastKnownGoodConfigs(): Record<AgentId, LastKnownGoodConfigSnapshot> {
  const p = getLocalPersistence();
  return (p.lastKnownGoodConfigs || {}) as Record<AgentId, LastKnownGoodConfigSnapshot>;
}

export function saveLocalLastKnownGoodConfig(snapshot: LastKnownGoodConfigSnapshot): void {
  const p = getLocalPersistence();
  const lkgc = p.lastKnownGoodConfigs || {};
  lkgc[snapshot.agentId] = snapshot;
  p.lastKnownGoodConfigs = lkgc;
  safeStorageSet(PERSISTENCE_KEY, p);
}

export function getLocalCheckpointHistory(): Record<string, LastKnownGoodConfigSnapshot[]> {
  const p = getLocalPersistence();
  return (p.checkpointHistory || {}) as Record<string, LastKnownGoodConfigSnapshot[]>;
}

export function deleteLocalCheckpointSnapshot(agentId: AgentId, checkpointId: string): void {
  const p = getLocalPersistence();
  const history = p.checkpointHistory || {};
  const list: LastKnownGoodConfigSnapshot[] = Array.isArray(history[agentId]) ? history[agentId] : [];
  history[agentId] = list.filter(s => s.id !== checkpointId);
  p.checkpointHistory = history;
  if (p.lastKnownGoodConfigs?.[agentId]?.id === checkpointId) {
    if (history[agentId][0]) {
      p.lastKnownGoodConfigs[agentId] = history[agentId][0];
    } else {
      delete p.lastKnownGoodConfigs[agentId];
    }
  }
  safeStorageSet(PERSISTENCE_KEY, p);
}

// ==========================================
// Backend API Operations
// ==========================================

export async function fetchRuntimeAgentStates(): Promise<Record<string, any>> {
  try {
    const res = await fetch('/api/state', { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    const data = await res.json();
    return data?.agentStates || {};
  } catch {
    return {};
  }
}

export async function fetchAllAgentConfigs(): Promise<Record<string, AgentFullConfig>> {
  try {
    const res = await fetch('/api/agents/all/configs', { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    const data = await res.json();
    const rawConfigs = data?.configs || {};
    const result: Record<string, AgentFullConfig> = {};
    for (const [id, entry] of Object.entries<any>(rawConfigs)) {
      if (entry?.configSchema) {
        result[id] = entry.configSchema as AgentFullConfig;
      } else if (entry?.model) {
        result[id] = entry as AgentFullConfig;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function fetchAgentLiveConfig(
  agentId: AgentId,
  formatVersion?: string
): Promise<{
  success: boolean;
  configSchema?: AgentFullConfig;
  nativeContent?: string;
  nativeFormat?: 'yaml' | 'toml' | 'json';
  nativeFileName?: string;
  source?: string;
  error?: string;
}> {
  try {
    const query = formatVersion ? `?formatVersion=${encodeURIComponent(formatVersion)}` : '';
    const res = await fetch(`/api/agents/${agentId}/config${query}`, {
      headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch live agent config' };
  }
}

export async function saveAgentConfigToBackend(
  agentId: AgentId,
  config: AgentFullConfig,
  nativeContent?: string,
  restartContainer: boolean = false
): Promise<{ success: boolean; message?: string; error?: string; execLogs?: string[] }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, nativeContent, restartContainer })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save configuration' };
  }
}

export async function commitState(
  agentId: AgentId,
  config: AgentFullConfig,
  meta: Record<string, any> = {}
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const res = await fetch('/api/persistence/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        config,
        meta,
        timestamp: new Date().toISOString()
      })
    });
    const data = await res.json();
    return { success: Boolean(res.ok && data?.success !== false), data, error: data?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Commit state network failure' };
  }
}

export async function restartAgentContainer(
  agentId: AgentId
): Promise<{ success: boolean; containerId?: string; action?: string; error?: string }> {
  const res = await fetch(`/api/agents/${agentId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function restartAllAgentContainers(): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/containers/restart-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function fetchSystemUpdates(): Promise<SystemUpdateItem[]> {
  try {
    const res = await fetch('/api/updates', { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.updates)) return data.updates;
    return [];
  } catch {
    return [];
  }
}

export async function fetchDockerSystemStatus(): Promise<DockerSystemInfo | null> {
  try {
    const res = await fetch('/api/docker/status', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data as DockerSystemInfo;
  } catch {
    return null;
  }
}

export async function executeAgentCommand(
  agentId: AgentId,
  command: string
): Promise<AgentExecResult> {
  const res = await fetch(`/api/agents/${agentId}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  const data = await res.json();
  return {
    success: Boolean(data?.success),
    agentId: data?.agentId || agentId,
    command: data?.command || command,
    container: data?.container,
    output: data?.output || '',
    error: data?.error,
    exitCode: data?.exitCode,
    timestamp: data?.timestamp || new Date().toISOString(),
    isSimulated: data?.isSimulated
  };
}

export async function fetchPresets(): Promise<ModelPresetSnapshot[]> {
  try {
    const res = await fetch('/api/presets', { headers: { Accept: 'application/json' } });
    if (!res.ok) return getLocalPresets();
    const data = await res.json();
    if (Array.isArray(data?.presets) && data.presets.length > 0) {
      saveLocalPresets(data.presets);
      return data.presets;
    }
    return getLocalPresets();
  } catch {
    return getLocalPresets();
  }
}

export async function persistPresetsToBackend(presets: ModelPresetSnapshot[]): Promise<boolean> {
  saveLocalPresets(presets);
  try {
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLastKnownGoodConfigs(): Promise<Record<string, LastKnownGoodConfigSnapshot>> {
  try {
    const res = await fetch('/api/persistence', { headers: { Accept: 'application/json' } });
    if (!res.ok) return getLocalLastKnownGoodConfigs();
    const payload = await res.json();
    const lkgc = payload?.data?.lastKnownGoodConfigs;
    if (lkgc && typeof lkgc === 'object') {
      return lkgc;
    }
    return getLocalLastKnownGoodConfigs();
  } catch {
    return getLocalLastKnownGoodConfigs();
  }
}

export async function fetchCheckpointHistory(): Promise<Record<string, LastKnownGoodConfigSnapshot[]>> {
  try {
    const res = await fetch('/api/persistence', { headers: { Accept: 'application/json' } });
    if (!res.ok) return getLocalCheckpointHistory();
    const payload = await res.json();
    const history = payload?.data?.checkpointHistory;
    if (history && typeof history === 'object') {
      return history;
    }
    return getLocalCheckpointHistory();
  } catch {
    return getLocalCheckpointHistory();
  }
}

export async function fetchProxyModels(
  baseUrl?: string,
  provider?: string,
  apiKey?: string,
  agentId?: string
): Promise<{
  success: boolean;
  models: ModelOptionItem[];
  rawModelNames: string[];
  isLiveProbed?: boolean;
  error?: string;
}> {
  const cleanProvider = (provider || 'ollama').toLowerCase();
  const fallback = DEFAULT_PROVIDER_MODELS[cleanProvider] || DEFAULT_LOCAL_MODELS;
  try {
    const res = await fetch('/api/proxy/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, provider: cleanProvider, apiKey, agentId })
    });
    if (!res.ok) {
      return {
        success: false,
        models: fallback,
        rawModelNames: fallback.map(m => m.value),
        isLiveProbed: false,
        error: `HTTP ${res.status}`
      };
    }
    const data = await res.json();
    const modelsList: ModelOptionItem[] = Array.isArray(data?.models) && data.models.length > 0
      ? data.models.map((m: any) =>
          typeof m === 'string'
            ? { value: m, label: m }
            : { value: m.value || m.id || '', label: m.label || m.name || m.value || '', tag: m.tag, memoryUsage: m.memoryUsage, contextWindow: m.contextWindow }
        )
      : fallback;
    return {
      success: Boolean(data?.success ?? true),
      models: modelsList,
      rawModelNames: modelsList.map(m => m.value).filter(Boolean),
      isLiveProbed: Boolean(data?.isLiveProbed)
    };
  } catch (err: any) {
    return {
      success: false,
      models: fallback,
      rawModelNames: fallback.map(m => m.value),
      isLiveProbed: false,
      error: err?.message
    };
  }
}

export async function testLLMConnection(
  provider: string,
  apiKey?: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; errorType?: string }> {
  try {
    const res = await fetch('/api/test-conn-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, baseUrl })
    });
    const data = await res.json();
    return {
      success: Boolean(data?.success),
      message: data?.message,
      error: data?.error || (data?.success ? undefined : data?.message),
      errorType: data?.errorType
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Connection test failed' };
  }
}

/**
 * Synchronize skills and MCP server registry from /api/openclaw/skills-sync.
 */
export async function fetchOpenClawSkillsSync(): Promise<{
  success: boolean;
  skills: any[];
  mcpServers: any[];
  isFallback: boolean;
  statusMessage: string;
}> {
  const candidateEndpoints = [
    '/api/openclaw/skills-sync',
    '/api/openclaw/skills',
    '/api/agents/openclaw/skills'
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const result = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (result.ok) {
        const data = await result.json();
        if (data && data.success) {
          return {
            success: true,
            skills: Array.isArray(data.skills) ? data.skills : [],
            mcpServers: Array.isArray(data.mcpServers) ? data.mcpServers : [],
            isFallback: false,
            statusMessage: 'Synchronized with OpenClaw VPS registry.'
          };
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  return {
    success: false,
    skills: [],
    mcpServers: [],
    isFallback: true,
    statusMessage: 'Failed to synchronize skills registry. Retrying later.'
  };
}

/**
 * Fetch official MCP catalog from the registry.
 */
export async function fetchOfficialMcpCatalog(): Promise<{
  success: boolean;
  models: any[];
  servers: any[];
  mcpServers: any[];
  isFallback: boolean;
  statusMessage: string;
}> {
  try {
    const result = await fetch('/api/mcp/official-catalog', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (result.ok) {
      const data = await result.json();
      const serversList = Array.isArray(data?.servers)
        ? data.servers
        : Array.isArray(data?.mcpServers)
        ? data.mcpServers
        : [];
      return {
        success: true,
        models: Array.isArray(data?.models) ? data.models : [],
        servers: serversList,
        mcpServers: serversList,
        isFallback: false,
        statusMessage: 'Official MCP catalog synchronized.'
      };
    }
  } catch {
    // Fallback below
  }

  return {
    success: false,
    models: [],
    servers: [],
    mcpServers: [],
    isFallback: true,
    statusMessage: 'Failed to fetch official MCP catalog.'
  };
}

/**
 * Validates persistence schema and returns mismatches.
 */
export function validatePersistenceSchema(config: any): {
  isValid: boolean;
  mismatches: string[];
  validatedConfigs?: any;
} {
  const mismatches: string[] = [];

  if (!config || typeof config !== 'object') {
    return { isValid: false, mismatches: ['Invalid configuration object'] };
  }

  if (!config.configs) {
    return { isValid: false, mismatches: ['Missing configs object'] };
  }

  const validatedConfigs = config.configs as any;

  for (const [agentId, agentConfig] of Object.entries<any>(validatedConfigs)) {
    if (!agentConfig || typeof agentConfig !== 'object') {
      mismatches.push(`Agent '${agentId}' has invalid configuration`);
      continue;
    }

    const model = agentConfig.model;
    if (model === null || model === undefined) {
      agentConfig.model = { provider: '', model: '' };
      mismatches.push(`Agent '${agentId}' has missing/invalid model object`);
    } else if (!model.provider || !model.model) {
      mismatches.push(`Agent '${agentId}' is missing provider or model`);
    }
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    validatedConfigs: config
  };
}

/**
 * Fetch LLM health status from backend monitoring endpoints.
 */
export async function fetchLLMHealth(forceRefresh: boolean = false): Promise<LLMHealthReport> {
  const qs = forceRefresh ? '?refresh=true' : '';
  const healthEndpoints = [
    `/api/llm-health${qs}`,
    `/api/llm/health${qs}`,
    `/api/health/llm${qs}`
  ];

  const healthReport: LLMHealthReport = {
    status: 'degraded',
    uptime: 0,
    timestamp: new Date().toISOString(),
    totalProviders: 0,
    onlineCount: 0,
    missingKeyCount: 0,
    unreachableCount: 0,
    providers: [],
    fallbackAgents: []
  };

  for (const endpoint of healthEndpoints) {
    try {
      const result = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (result.ok) {
        const data = await result.json();
        if (data && typeof data === 'object') {
          if (data.status === 'healthy' || data.status === 'degraded' || data.status === 'critical') {
            healthReport.status = data.status;
          }
          healthReport.uptime = typeof data.uptime === 'number' ? data.uptime : 0;
          healthReport.timestamp = data.timestamp || healthReport.timestamp;
          healthReport.totalProviders = typeof data.totalProviders === 'number'
            ? data.totalProviders
            : Array.isArray(data.providers) ? data.providers.length : 0;
          healthReport.onlineCount = data.onlineCount || 0;
          healthReport.missingKeyCount = data.missingKeyCount ?? (data.missingKeys?.length || 0);
          healthReport.unreachableCount = data.unreachableCount || 0;

          if (Array.isArray(data.providers)) {
            healthReport.providers = data.providers;
          }
          if (Array.isArray(data.fallbackAgents)) {
            healthReport.fallbackAgents = data.fallbackAgents;
          }

          return healthReport;
        }
      }
    } catch {
      // Continue to next endpoint on failure
    }
  }

  return healthReport;
}

/**
 * Validate a model against the official catalog asynchronously.
 */
export async function validateModelAgainstCatalog(
  model: any
): Promise<{ valid: boolean; message?: string }> {
  if (!model || typeof model !== 'object') {
    return { valid: false, message: 'Invalid model object' };
  }

  try {
    const res = await fetchOfficialMcpCatalog();
    const catalog = res.models || [];
    if (catalog.length === 0) {
      return { valid: true, message: 'Catalog unavailable; skipped validation.' };
    }
    const modelId = (model.id || model.value || model.model) as string;
    const isValid = catalog.some((cat: any) => (cat.id || cat.value) === modelId);
    return {
      valid: isValid,
      message: isValid ? 'Model is in the official catalog' : 'Model not found in catalog'
    };
  } catch {
    return { valid: true, message: 'Catalog check skipped' };
  }
}
