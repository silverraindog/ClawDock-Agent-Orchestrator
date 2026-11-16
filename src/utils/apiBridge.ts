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
export async function fetchAgentLogs(agentId: AgentId, startOffset = 0): Promise<{ success: boolean; logs: string[] }> {
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
export async function fetchAgentContainerStatus(agentId: AgentId): Promise<{ success: boolean; status: string; logs?: string[] }> {
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
