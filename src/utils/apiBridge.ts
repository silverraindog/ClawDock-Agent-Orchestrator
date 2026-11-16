import { ApiRequestResult, logApiFailure } from './apiBridge';

/**
 * Synchronize skills and MCP server registry from /api/openclaw/skills-sync.
 * Captures non-200/404 diagnostic data and falls back gracefully to prevent UI crash states.
 */
export async function fetchOpenClawSkillsSync(): Promise<{
  success: boolean;
  skills: any[];
  mcpServers: any[];
  isFallback: boolean;
  statusMessage: string;
}> {
  // Multi-route fallback sequence ensuring older or newly routed environments both succeed
  const candidateEndpoints = [
    '/api/openclaw/skills-sync',
    '/api/openclaw/skills',
    '/api/agents/openclaw/skills'
  ];

  for (const endpoint of candidateEndpoints) {
    const result = await apiRequest(endpoint, {
      method: 'GET',
      context: `OpenClaw VPS Skills Sync (${endpoint})`,
      fallbackAction: 'Attempting candidate route or engaging resilient local registry catalog.'
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
  const result = await apiRequest('/api/mcp/official-catalog', {
    context: 'Fetching official MCP catalog',
    fallbackAction: 'Attempting candidate route or engaging resilient local registry catalog.'
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
export async function probeBrowserDirectLiveModels(_baseUrl: string, _provider: string): Promise<ModelOptionItem[] | null> {
  try {
    const res = await fetch(`${prefix}/api/proxy/models?${params.toString()}`);
    
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[API Bridge] LLM health fetch failed:', err);
    return null;
  }
}

/**
 * Benchmarks LLM provider performance.
 */
export async function benchmarkLLMProvider(): Promise<{ success: boolean; latencyMs: number; message: string }> {
  try {
    const response = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, latencyMs: data.latencyMs || 0, message: 'Benchmark completed' };
  } catch (err: any) {
    console.error('[API Bridge] Latency benchmark failed:', err);
    return { success: false, latencyMs: 0, message: err.message || 'Benchmark failed' };
  }
}

/**
 * Fetches models with fallback.
 */
export async function fetchModelsWithFallback(): Promise<{ models: ModelOptionItem[]; isFallback: boolean; isLocalFallback: boolean; source: string; provider: string }> {
  try {
    const res = await fetch(endpointUrl, {
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      models: data.models || [],
      isFallback: false,
      isLocalFallback: false,
      source: 'direct',
      provider: data.provider || 'unknown'
    };
  } catch (err) {
    console.error('[API Bridge] Fetch models with fallback failed:', err);
    return {
      models: [],
      isFallback: true,
      isLocalFallback: false,
      source: 'fallback',
      provider: 'unknown'
    };
  }
}

/**
 * Probes API health.
 */
export async function probeApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: data.uptime || 0,
      version: data.version || 'unknown'
    };
  } catch (err) {
    console.error('[API Bridge] Health check failed:', err);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: 'unknown'
    };
  }
}

/**
 * Checks backend availability.
 */
export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const health = await probeApiHealth();
    return health.status === 'healthy';
  } catch (err) {
    console.error('[API Bridge] Backend availability check failed:', err);
    return false;
  }
}

/**
 * Fetches presets.
 */
export async function fetchPresets(): Promise<ModelPresetSnapshot[]> {
  try {
    const res = await fetch('/api/persistence');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.presets || [];
  } catch (err: any) {
    console.error('[API Bridge] Fetch presets failed:', err);
    return [];
  }
}

/**
 * Persists presets to backend.
 */
export async function persistPresetsToBackend(presets: ModelPresetSnapshot[]): Promise<boolean> {
  try {
    const res = await fetch('/api/persistence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presets })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.success || true;
  } catch (err: any) {
    console.error('[API Bridge] Persist presets failed:', err);
    return false;
  }
}

/**
 * Fetches last known good configs.
 */
export async function fetchLastKnownGoodConfigs(): Promise<Record<string, LastKnownGoodConfigSnapshot>> {
  try {
    const res = await fetch('/api/persistence');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.lastKnownGoodConfigs || {};
  } catch (err: any) {
    console.error('[API Bridge] Fetch last known good configs failed:', err);
    return {};
  }
}

/**
 * Fetches checkpoint history.
 */
export async function fetchCheckpointHistory(): Promise<Record<string, LastKnownGoodConfigSnapshot[]>> {
  try {
    const res = await fetch('/api/persistence');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.checkpointHistory || {};
  } catch (err: any) {
    console.error('[API Bridge] Fetch checkpoint history failed:', err);
    return {};
  }
}

/**
 * Fetches system updates.
 */
export async function fetchSystemUpdates(): Promise<SystemUpdateItem[] | null> {
  try {
    const res = await fetch('/api/updates');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.updates || [];
  } catch (err: any) {
    console.error('[API Bridge] Fetch system updates failed:', err);
    return null;
  }
}

/**
 * Fetches all agent configs.
 */
export async function fetchAllAgentConfigs(): Promise<Record<AgentId, AgentFullConfig>> {
  try {
    const res = await fetch('/api/persistence');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.agentConfigs || {};
  } catch (err: any) {
    console.error('[API Bridge] Fetch all agent configs failed:', err);
    return {};
  }
}

/**
 * Fetches agent live config.
 */
export async function fetchAgentLiveConfig(agentId: AgentId, requestedFormatVersion?: 'v1' | 'v2'): Promise<LiveConfigFetchResult> {
  try {
    const res = await fetch(`/api/agents/${agentId}/config`, {
      method: 'GET',
      headers: { 'Accept': `application/json; version=${requestedFormatVersion || 'v2'}` }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      success: true,
      config: data.config || {},
      version: requestedFormatVersion || 'v2'
    };
  } catch (err: any) {
    console.error('[API Bridge] Fetch agent live config failed:', err);
    return {
      success: false,
      config: {},
      version: requestedFormatVersion || 'v2'
    };
  }
}

/**
 * Saves agent config to backend.
 */
export async function saveAgentConfigToBackend(config: AgentFullConfig): Promise<boolean> {
  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.success || true;
  } catch (err: any) {
    console.error('[API Bridge] Save agent config failed:', err);
    return false;
  }
}

/**
 * Fetches runtime agent states.
 */
export async function fetchRuntimeAgentStates(): Promise<Record<string, { status: string; lastSeen: number }>> {
  try {
    const res = await fetch('/api/agents/runtime');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.states || {};
  } catch (err: any) {
    console.error('[API Bridge] Fetch runtime agent states failed:', err);
    return {};
  }
}

/**
 * Restarts an agent container.
 */
export async function restartAgentContainer(agentId: AgentId): Promise<{ success: boolean; status: string; action: string; message: string; containerId?: string }> {
  try {
    const res = await fetch(`/api/agents/${agentId}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      success: true,
      status: data.status || 'unknown',
      action: data.action || 'restart',
      message: data.message || 'Container restarted successfully',
      containerId: data.containerId
    };
  } catch (err: any) {
    console.error('[API Bridge] Restart agent container failed:', err);
    return {
      success: false,
      status: 'unknown',
      action: 'restart',
      message: err.message || 'Failed to restart container'
    };
  }
}

/**
 * Restarts all agent containers.
 */
export async function restartAllAgentContainers(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const res = await fetch('/api/containers/restart-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      success: true,
      count: data.count || 0,
      message: data.message || 'All containers restarted successfully'
    };
  } catch (err: any) {
    console.error('[API Bridge] Restart all agent containers failed:', err);
    return {
      success: false,
      count: 0,
      message: err.message || 'Failed to restart all containers'
    };
  }
}

/**
 * Starts an agent container.
 */
export async function startAgentContainer(agentId: AgentId): Promise<boolean> {
  try {
    const res = await fetch(`/api/agents/${agentId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return true;
  } catch (err: any) {
    console.error('[API Bridge] Start agent container failed:', err);
    return false;
  }
}

/**
 * Stops an agent container.
 */
export async function stopAgentContainer(agentId: AgentId): Promise<boolean> {
  try {
    const res = await fetch(`/api/agents/${agentId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return true;
  } catch (err: any) {
    console.error('[API Bridge] Stop agent container failed:', err);
    return false;
  }
}

/**
 * Fetches Docker system status.
 */
export async function fetchDockerSystemStatus(): Promise<DockerSystemInfo | null> {
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
export async function executeAgentCommand(agentId: AgentId, command: string): Promise<{ success: boolean; output: string; error?: string }> {
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
        console.warn(`[withRetry] Attempt ${i + 1} failed with status ${res.status}. Retrying in ${delay}ms...`);
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
    console.error('[commitState] Failed to commit state for agent "${agentId}": HTTP ${res.status} ${res.statusText}. Allowed methods: ${res.headers.get('Allow') || 'Unknown'}');
    return { success: false, message: err.message || 'Failed to commit state' };
  }
}
