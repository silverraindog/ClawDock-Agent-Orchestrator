/**
 * API Bridge utility functions for interacting with the OpenClaw backend.
 */

// Type definitions for the return types used by API bridge functions
export interface ApiRequestResult {
  ok: boolean;
  data?: any;
  status: number;
}

export type ModelOptionItem = {
  name: string;
  description: string;
  id: string;
  provider: string;
};

export type LLMHealthReport = {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  timestamp: string;
  totalProviders: number;
  onlineCount: number;
  missingKeyCount: number;
  unreachableCount: number;
  providers: any[];
  fallbackAgents?: any[];
};

export interface AgentId {
  id: 'hermes-agent' | 'zeroclaw' | 'openclaw' | 'picoclaw';
}

export type DockerSystemInfo = {
  status: string;
  containers: any[];
};

export interface AgentExecResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ApiHealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  uptime: number;
  lastChecked: string;
}

// Default model configurations
export const DEFAULT_LOCAL_MODELS = [
  { name: 'gemma4-soul', id: 'gemma4-soul', provider: 'local' },
  { name: 'qwen2.5-coder', id: 'qwen2.5-coder', provider: 'ollama' }
];

export const DEFAULT_GENERIC_MODELS = [
  { name: 'gpt-4o', id: 'gpt-4o', provider: 'openai' },
  { name: 'llama3', id: 'llama3', provider: 'local' }
];

export const DEFAULT_PROVIDER_MODELS = [
  { name: 'gemini', id: 'gemini', provider: 'gemini' },
  { name: 'deepseek-r1', id: 'deepseek-r1', provider: 'deepseek' }
];

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
    const result = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (result.ok && result.data && result.data.success) {
      return {
        success: true,
        skills: Array.isArray(result.data.skills) ? result.data.skills : [],
        mcpServers: Array.isArray(result.data.mcpServers) ? result.data.mcpServers : [],
        isFallback: false,
        statusMessage: 'Synchronized with OpenClaw VPS registry.'
      };
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
 * Fetches official MCP catalog from the registry.
 */
export async function fetchOfficialMcpCatalog(): Promise<{
  success: boolean;
  models: any[];
  mcpServers: any[];
  isFallback: boolean;
  statusMessage: string;
}> {
  const result = await fetch('/api/mcp/official-catalog', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (result.ok && result.data) {
    return {
      success: true,
      models: Array.isArray(result.data.models) ? result.data.models : [],
      mcpServers: Array.isArray(result.data.mcpServers) ? result.data.mcpServers : [],
      isFallback: false,
      statusMessage: 'Loaded OpenClaw VPS registry catalog (resilient fallback cache).'
    };
  }

  return {
    success: false,
    models: [],
    mcpServers: [],
    isFallback: true,
    statusMessage: 'Failed to fetch official MCP catalog.'
  };
}

/**
 * Probes browser for live model availability.
 */
export async function probeBrowserDirectLiveModels(_baseUrl: string, _provider: string): Promise<any[] | null> {
  try {
    const res = await fetch('/api/proxy/models');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.models;
  } catch (err) {
    console.error('[API Bridge] Failed to probe browser models:', err);
    return null;
  }
}

/**
 * Tests LLM connection.
 */
export async function testLLMConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/test-conn-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return { success: true, message: 'Connection successful' };
  } catch (err: any) {
    console.error('[API Bridge] LLM connection test failed:', err);
    return { success: false, message: err.message || 'Unknown error' };
  }
}

/**
 * Fetches LLM health status.
 */
export async function fetchLLMHealth(forceRefresh = false): Promise<LLMHealthReport | null> {
  try {
    const res = await fetch('/api/llm-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch LLM health:', err);
    return null;
  }
}

/**
 * Fetches agent logs.
 */
export async function fetchAgentLogs(agentId: string, startOffset = 0): Promise<{ success: boolean; logs: string[] }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/logs?offset=${startOffset}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, logs: data.logs || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch agent logs:', err);
    return { success: false, logs: [] };
  }
}

/**
 * Fetches agent container status.
 */
export async function fetchAgentContainerStatus(agentId: string): Promise<{ success: boolean; status: string; logs?: string[] }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, status: data.status || '', logs: data.logs || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch agent container status:', err);
    return { success: false, status: '', logs: [] };
  }
}

/**
 * Fetches Docker system status.
 */
export async function fetchDockerSystemStatus(): Promise<any | null> {
  try {
    const res = await fetch('/api/docker/status');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[API Bridge] Fetch Docker system status failed:', err);
    return null;
  }
}

/**
 * Executes agent command.
 */
export async function executeAgentCommand(agentId: string, command: string): Promise<AgentExecResult> {
  try {
    const res = await fetch(`/api/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      success: true,
      output: data.output || '',
      error: data.error
    };
  } catch (err: any) {
    console.error('[API Bridge] Execute agent command failed:', err);
    return {
      success: false,
      output: '',
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * With retry logic for network operations.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      
      if (i < maxRetries) {
        console.warn(`[withRetry] Attempt ${i + 1} failed. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Commits state to backend.
 */
export async function commitState(state: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/commit-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'State committed successfully' };
  } catch (err: any) {
    console.error('[commitState] Failed to commit state:', err.message);
    return { success: false, message: err.message || 'Failed to commit state' };
  }
}

/**
 * Fetches system updates.
 */
export async function fetchSystemUpdates(): Promise<{ success: boolean; updates: any[] }> {
  try {
    const res = await fetch('/api/system-updates');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, updates: data.updates || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch system updates:', err);
    return { success: false, updates: [] };
  }
}

/**
 * Save system updates.
 */
export async function saveLocalUpdates(updates: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/local-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Updates saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save local updates:', err);
    return { success: false, message: 'Failed to save updates' };
  }
}

/**
 * Fetch agent live config.
 */
export async function fetchAgentLiveConfig(agentId: string): Promise<{ success: boolean; config: any }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/config/live`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, config: data.config || {} };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch agent live config:', err);
    return { success: false, config: {} };
  }
}

/**
 * Save agent config to backend.
 */
export async function saveAgentConfigToBackend(config: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Config saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save agent config:', err);
    return { success: false, message: 'Failed to save config' };
  }
}

/**
 * Restart agent container.
 */
export async function restartAgentContainer(agentId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Container restarted successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to restart agent container:', err);
    return { success: false, message: 'Failed to restart container' };
  }
}

/**
 * Restart all agent containers.
 */
export async function restartAllAgentContainers(): Promise<{ success: boolean; messages: string[] }> {
  try {
    const res = await fetch('/api/agents/all/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, messages: data.messages || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to restart all agents:', err);
    return { success: false, messages: ['Failed to restart'] };
  }
}

/**
 * Get last known good configs.
 */
export async function fetchLastKnownGoodConfigs(agentId: string): Promise<{ success: boolean; configs: any[] }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/last-known-good`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, configs: data.configs || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch last known good configs:', err);
    return { success: false, configs: [] };
  }
}

/**
 * Save local known good config.
 */
export async function saveLocalLastKnownGoodConfig(agentId: string, snapshot: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/local-known-good', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, snapshot })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save last known good config:', err);
    return { success: false, message: 'Failed to save config' };
  }
}

/**
 * Fetch presets.
 */
export async function fetchPresets(): Promise<{ success: boolean; presets: any[] }> {
  try {
    const res = await fetch('/api/presets', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, presets: data.presets || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch presets:', err);
    return { success: false, presets: [] };
  }
}

/**
 * Save presets to backend.
 */
export async function persistPresetsToBackend(presets: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Presets saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to persist presets:', err);
    return { success: false, message: 'Failed to save presets' };
  }
}

/**
 * Get local preset configurations.
 */
export async function getLocalPresets(): Promise<{ success: boolean; presets: any[] }> {
  try {
    const res = await fetch('/api/local-presets', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, presets: data.presets || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to get local presets:', err);
    return { success: false, presets: [] };
  }
}

/**
 * Save preset configurations locally.
 */
export async function saveLocalPresets(presets: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/local-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Presets saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save local presets:', err);
    return { success: false, message: 'Failed to save presets' };
  }
}

/**
 * Get agent config persistence.
 */
export async function getLocalPersistence(agentId: string): Promise<{ success: boolean; config: any }> {
  try {
    const res = await fetch(`/api/local-persistence/${agentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, config: data.config || {} };
  } catch (err: any) {
    console.error('[API Bridge] Failed to get local persistence:', err);
    return { success: false, config: {} };
  }
}

/**
 * Save agent config persistence locally.
 */
export async function saveLocalPersistence(agentId: string, config: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/local-persistence/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Persistence saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save local persistence:', err);
    return { success: false, message: 'Failed to save persistence' };
  }
}

/**
 * Get agent runtime states.
 */
export async function getRuntimeAgentStates(): Promise<{ success: boolean; states: any[] }> {
  try {
    const res = await fetch('/api/agents/runtime-states', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, states: data.states || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to get runtime agent states:', err);
    return { success: false, states: [] };
  }
}

/**
 * Save agent runtime states.
 */
export async function saveAgentStates(agentId: string, states: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/runtime-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(states)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'States saved successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to save agent states:', err);
    return { success: false, message: 'Failed to save states' };
  }
}

/**
 * Get local updates.
 */
export async function getLocalUpdates(agentId: string): Promise<{ success: boolean; updates: any[] }> {
  try {
    const res = await fetch(`/api/local-updates/${agentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, updates: data.updates || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to get local updates:', err);
    return { success: false, updates: [] };
  }
}

/**
 * Get agent checkpoints history.
 */
export async function fetchCheckpointHistory(agentId: string): Promise<{ success: boolean; checkpoints: any[] }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/checkpoints`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, checkpoints: data.checkpoints || [] };
  } catch (err: any) {
    console.error('[API Bridge] Failed to fetch checkpoint history:', err);
    return { success: false, checkpoints: [] };
  }
}

/**
 * Delete local checkpoint snapshot.
 */
export async function deleteLocalCheckpointSnapshot(agentId: string, checkpointId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/local-checkpoints/${agentId}/${checkpointId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Checkpoint deleted successfully' };
  } catch (err: any) {
    console.error('[API Bridge] Failed to delete checkpoint:', err);
    return { success: false, message: 'Failed to delete checkpoint' };
  }
}
