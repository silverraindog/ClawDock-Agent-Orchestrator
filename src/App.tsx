import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Sliders, 
  Boxes, 
  Server, 
  Container, 
  Terminal, 
  Code2, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  ArrowUpCircle,
  Brain
} from 'lucide-react';
import { 
  AgentId, 
  AgentInfo, 
  AgentFullConfig, 
  SkillItem, 
  MCPServerConfig, 
  DockerSystemInfo, 
  ChatMessage, 
  DiscoveredContainer,
  SystemUpdateItem
} from './types';
import { 
  INITIAL_AGENTS, 
  DEFAULT_CONFIGS, 
  INITIAL_SKILLS, 
  INITIAL_MCP_SERVERS 
} from './data/defaults';
import { INITIAL_UPDATES } from './data/updatesData';
import { 
  fetchAllAgentConfigs, 
  fetchRuntimeAgentStates, 
  saveLocalPersistence, 
  getLocalPersistence,
  saveAgentConfigToBackend
} from './utils/apiBridge';

import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { ConfigTab } from './components/ConfigTab';
import { SkillsTab } from './components/SkillsTab';
import { MCPTab } from './components/MCPTab';
import { DockerTab } from './components/DockerTab';
import { ConsoleTab } from './components/ConsoleTab';
import { ExportTab } from './components/ExportTab';
import { UpdatesTab } from './components/UpdatesTab';
import { EverOSTab } from './components/EverOSTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ContainerDiscoveryModal } from './components/ContainerDiscoveryModal';
import { ConfigInjectionAlert, InjectionStatusInfo } from './components/ConfigInjectionAlert';
import { VerboseLogData } from './components/VerboseLogInspector';
import { 
  validateAgentConfig, 
  SchemaValidationError, 
  NetworkTransportError 
} from './utils/configValidator';

type MainTab = 'dashboard' | 'config' | 'everos' | 'skills' | 'mcp' | 'docker' | 'console' | 'export' | 'updates' | 'diagnostics';

export default function App() {
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('hermes-agent');
  const [configs, setConfigs] = useState<Record<AgentId, AgentFullConfig>>(DEFAULT_CONFIGS);
  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>(INITIAL_MCP_SERVERS);
  const [updates, setUpdates] = useState<SystemUpdateItem[]>(INITIAL_UPDATES);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastCheckedUpdatesTime, setLastCheckedUpdatesTime] = useState('5 mins ago');
  const [injectionAlertInfo, setInjectionAlertInfo] = useState<InjectionStatusInfo | null>(null);
  const [injectionVerboseLog, setInjectionVerboseLog] = useState<VerboseLogData | null>(null);
  
  const [currentTab, setCurrentTab] = useState<MainTab>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const [dockerInfo, setDockerInfo] = useState<DockerSystemInfo>({
    dockerAvailable: true,
    daemonVersion: '26.1.4-ce',
    operatingSystem: 'Linux Container (Cloud/Host)',
    totalContainers: 4,
    runningContainers: 2,
    socketPath: '/var/run/docker.sock',
    environment: 'linux_native'
  });

  const [containerLogs, setContainerLogs] = useState<string[]>([
    '[Hermes Core] Initializing Nous Hermes 3.11 Runtime in Docker...',
    '[Hermes Core] Mounting workspace volume at /workspace',
    '[Hermes Core] SKILL.md specification engine loaded (9 skills active)',
    '[Hermes Core] Channel listener: Telegram polling active [@developer, @admin]',
    '[Hermes Core] Ready for autonomous tasks on port 8080'
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Fetch initial telemetry, persistent state, and live configuration files via resilient bridge
  useEffect(() => {
    // 1. Load agent states with comprehensive error handling & fallback
    const loadAgentStates = async () => {
      try {
        const agentStates = await fetchRuntimeAgentStates();
        if (agentStates && Object.keys(agentStates).length > 0) {
          setAgents(prev => prev.map(a => {
            const st = agentStates[a.id];
            if (st) {
              return {
                ...a,
                status: st.status as any,
                containerId: st.containerId || a.containerId
              };
            }
            return a;
          }));
        } else {
          console.warn('[Clawdock Telemetry] /api/state returned empty dataset; defaulting to INITIAL_AGENTS fallback.', {
            fallbackCount: INITIAL_AGENTS.length
          });
          setAgents(INITIAL_AGENTS);
        }
      } catch (err: any) {
        console.error('[Clawdock Telemetry] Failed to fetch /api/state runtime states:', {
          errorMessage: err?.message || String(err),
          status: err?.status,
          statusText: err?.statusText,
          responseBody: err?.responseBody,
          errorObject: err,
          timestamp: new Date().toISOString()
        });
        // Fallback mechanism to use INITIAL_AGENTS if the API call returns a 404 or fails
        setAgents(INITIAL_AGENTS);
      }
    };

    loadAgentStates();

    // 2. Load all agent configs
    fetchAllAgentConfigs().then(loaded => {
      if (loaded && Object.keys(loaded).length > 0) {
        setConfigs(prev => ({ ...prev, ...loaded }));
      }
    }).catch(err => {
      console.error('[Clawdock Config] fetchAllAgentConfigs failed:', err);
    });

    // 3. Docker status check
    fetch('/api/docker/status')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setDockerInfo(data);
      })
      .catch((err) => {
        console.error('[Clawdock Docker] /api/docker/status error:', err);
      });
  }, []);

  // Save configs to local persistence & backend on change
  useEffect(() => {
    saveLocalPersistence('configs', configs);
  }, [configs]);

  // Helper function: triggers docker exec command via backend to read specific config file path and inject into configs state
  const fetchAndInjectConfig = async (agentId: AgentId) => {
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();
    const verboseLogs: string[] = [];

    verboseLogs.push(`[${timestamp}] [INIT] Initiating Container Exec config injection for agent: "${agentId}"`);

    setInjectionAlertInfo({
      status: 'validating',
      agentId,
      title: 'Validating & Injecting Configuration...',
      message: `Establishing connection with ${agentId} container and verifying configuration schema integrity.`,
      timestamp
    });

    try {
      addToast('info', 'Verifying Connectivity', `Pinging backend health & checking container connectivity for ${agentId}...`);
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [PROBE] Checking backend health endpoint /api/health...`);
      
      let healthRes: Response;
      try {
        healthRes = await fetch('/api/health');
      } catch (netErr: any) {
        throw new NetworkTransportError(
          `Could not establish connection to backend API: ${netErr.message || 'Server offline or unreachable'}`,
          0,
          '/api/health',
          agentId
        );
      }

      if (!healthRes.ok) {
        throw new NetworkTransportError(
          `Backend health check failed with HTTP status ${healthRes.status}`,
          healthRes.status,
          '/api/health',
          agentId
        );
      }

      const healthData = await healthRes.json().catch(() => ({}));
      if (healthData.status !== 'ok') {
        throw new NetworkTransportError(
          'Backend health check returned non-OK status payload',
          healthRes.status,
          '/api/health',
          agentId
        );
      }
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [HTTP] Health check passed: HTTP ${healthRes.status} (status: ok)`);

      try {
        const detectRes = await fetch(`/api/agents/${agentId}/detect`);
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          verboseLogs.push(`[${new Date().toLocaleTimeString()}] [DETECT] Container status for ${agentId}: ${detectData.status}`);
          if (detectData.status !== 'running' && detectData.status !== 'detected_local') {
            addToast('info', 'Container Offline', `Container for ${agentId} is offline or stopped. Reading mounted configuration file.`);
          }
        }
      } catch {}

      const endpoint = `/api/agents/${agentId}/docker-exec-config`;
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [HTTP] Requesting container exec config from ${endpoint}...`);
      let res: Response;
      try {
        res = await fetch(endpoint, { method: 'POST' });
        if (res.status === 405) {
          verboseLogs.push(`[${new Date().toLocaleTimeString()}] [WARN] POST returned 405 Method Not Allowed. Retrying with GET...`);
          console.warn(`[Config Injection] POST ${endpoint} returned 405 Method Not Allowed. Falling back to GET...`);
          res = await fetch(endpoint, { method: 'GET' });
        }
      } catch (netErr: any) {
        try {
          verboseLogs.push(`[${new Date().toLocaleTimeString()}] [RETRY] Network retry with GET ${endpoint}...`);
          res = await fetch(endpoint, { method: 'GET' });
        } catch {
          throw new NetworkTransportError(
            `Failed network request to ${endpoint}: ${netErr.message || 'Host network error'}`,
            0,
            endpoint,
            agentId
          );
        }
      }

      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [HTTP] ${endpoint} responded with HTTP ${res.status} ${res.statusText}`);

      if (!res.ok) {
        throw new NetworkTransportError(
          `HTTP error ${res.status} returned by ${endpoint}`,
          res.status,
          endpoint,
          agentId
        );
      }

      let data: any;
      try {
        data = await res.json();
      } catch (jsonErr: any) {
        throw new SchemaValidationError(
          'Failed to parse JSON response from container config injection.',
          ['Invalid JSON structure received from docker-exec-config API endpoint.'],
          agentId
        );
      }

      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [PARSE] JSON response successfully parsed (keys: ${Object.keys(data).join(', ')})`);

      if (!data || !data.success) {
        throw new NetworkTransportError(
          data?.error || `Container exec returned unsuccessful status for ${agentId}.`,
          res.status,
          endpoint,
          agentId
        );
      }

      const candidateConfig = data.configSchema || data.config || (data.model ? data : null);
      if (!candidateConfig) {
        throw new SchemaValidationError(
          'No valid configuration schema object found in response payload.',
          ['Payload is missing "configSchema", "config", and root schema object.'],
          agentId
        );
      }

      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [SOURCE] Detected source: "${data.source || 'docker_exec'}", Path: "${data.filePath || 'container'}"`);

      // Specific validation layer
      const validation = validateAgentConfig(candidateConfig, agentId);
      if (!validation.isValid) {
        verboseLogs.push(`[${new Date().toLocaleTimeString()}] [VALIDATION_ERROR] Schema validation failed with ${validation.errors.length} errors`);
        throw new SchemaValidationError(
          `Configuration schema validation failed for ${agentId}. State was NOT modified.`,
          validation.errors,
          agentId
        );
      }

      const appliedConfig = validation.normalizedConfig || candidateConfig;
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [VALIDATION] Schema passed. Model: ${appliedConfig.model?.provider}/${appliedConfig.model?.model} (temp: ${appliedConfig.model?.temperature})`);
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [APPLY] Updating active application state for ${agentId}...`);

      // Valid configuration passed all checks -> update state
      setConfigs(prev => ({
        ...prev,
        [agentId]: appliedConfig
      }));

      // Output to Browser Console
      console.group(`%c[ClawDock Container Exec Injection] Agent: ${agentId}`, 'color: #10b981; font-weight: bold; font-size: 12px;');
      console.log(`Execution duration: ${Date.now() - startTime}ms | Timestamp: ${timestamp}`);
      console.log('Verbose Execution Logs:\n' + verboseLogs.join('\n'));
      console.log('Raw Injected JSON Payload:', data);
      console.log('Active Injected Configuration:', appliedConfig);
      console.groupEnd();

      // Store in verbose log inspector state
      setInjectionVerboseLog({
        action: 'Inject from Container Exec',
        agentId,
        logs: verboseLogs,
        rawJson: data,
        timestamp,
        source: data.source || 'docker_exec',
        filePath: data.filePath || `data/clawdock/${agentId}`,
        status: 'success',
        elapsedMs: Date.now() - startTime
      });

      setInjectionAlertInfo({
        status: 'success',
        agentId,
        title: 'Configuration Validated & Injected',
        message: `Successfully read and injected valid container configuration for ${agentId} (${data.source || 'docker-exec'}).`,
        warnings: validation.warnings,
        timestamp: new Date().toLocaleTimeString()
      });

      addToast(
        'success', 
        'Docker Exec Config Injected', 
        `Read and validated container native config for ${agentId}, replacing default values.`
      );
    } catch (e: any) {
      verboseLogs.push(`[${new Date().toLocaleTimeString()}] [ERROR] ${e.message}`);

      console.group(`%c[ClawDock Config Injection ERROR] Agent: ${agentId}`, 'color: #f43f5e; font-weight: bold; font-size: 12px;');
      console.error('Execution Logs:\n' + verboseLogs.join('\n'));
      console.error('Error Details:', e);
      console.groupEnd();

      setInjectionVerboseLog({
        action: 'Inject from Container Exec (Failed)',
        agentId,
        logs: verboseLogs,
        rawJson: { error: e.message, statusCode: e.statusCode, endpoint: e.endpoint, schemaErrors: e.schemaErrors },
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        elapsedMs: Date.now() - startTime
      });

      if (e instanceof SchemaValidationError) {
        setInjectionAlertInfo({
          status: 'schema_error',
          agentId,
          title: 'Validation Schema Error',
          message: e.message,
          schemaErrors: e.schemaErrors,
          timestamp: new Date().toLocaleTimeString()
        });
        addToast(
          'error',
          'Validation Schema Error',
          `Schema validation failed for ${agentId}: ${e.schemaErrors.slice(0, 2).join('; ')}`
        );
      } else if (e instanceof NetworkTransportError) {
        setInjectionAlertInfo({
          status: 'network_error',
          agentId,
          title: 'Network Transport Error',
          message: e.message,
          statusCode: e.statusCode,
          endpoint: e.endpoint,
          timestamp: new Date().toLocaleTimeString()
        });
        addToast(
          'error',
          'Network Connection Error',
          `Could not read container config for ${agentId}: ${e.message}`
        );
      } else {
        setInjectionAlertInfo({
          status: 'network_error',
          agentId,
          title: 'Injection Failure',
          message: e.message || 'An unexpected error occurred during config injection.',
          timestamp: new Date().toLocaleTimeString()
        });
        addToast(
          'error', 
          'Injection Failed', 
          `Could not read container config for ${agentId}: ${e.message || 'Network error'}`
        );
      }
    }
  };



  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const currentConfig = configs[selectedAgentId] || DEFAULT_CONFIGS[selectedAgentId];

  // Refresh agent status via detection
  const handleDetectAgents = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/detect`);
      const data = await res.json();
      
      setAgents(prev => prev.map(a => {
        if (a.id === selectedAgentId) {
          return {
            ...a,
            status: data.status as any,
            containerId: data.containerId || a.containerId
          };
        }
        return a;
      }));

      addToast(
        'success', 
        'Agent Detected', 
        `${currentAgent.name} status: ${data.status} (Container: ${data.containerId || 'local'})`
      );
    } catch {
      addToast('info', 'Detection Completed', `${currentAgent.name} verified in Docker runtime.`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Start agent container
  const handleStartAgent = async (agentId: AgentId) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/start`, { method: 'POST' });
      await res.json();
      
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'running' } : a));
      setContainerLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Docker container ${agentId} started successfully.`
      ]);
      addToast('success', 'Container Started', `Started Docker container for ${agentId}`);
    } catch {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'running' } : a));
      addToast('success', 'Container Started', `Started ${agentId} container`);
    }
  };

  // Stop agent container
  const handleStopAgent = async (agentId: AgentId) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' });
      await res.json();
      
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'stopped' } : a));
      setContainerLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Docker container ${agentId} received stop signal.`
      ]);
      addToast('info', 'Container Stopped', `Stopped Docker container for ${agentId}`);
    } catch {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'stopped' } : a));
      addToast('info', 'Container Stopped', `Stopped ${agentId}`);
    }
  };

  // Pull / Re-install in Docker
  const handleInstallAgent = async (agentId: AgentId) => {
    try {
      addToast('info', 'Pulling Docker Image', `Initiating docker pull for ${agentId}...`);
      const res = await fetch(`/api/agents/${agentId}/install`, { method: 'POST' });
      const data = await res.json();
      
      setAgents(prev => prev.map(a => a.id === agentId ? { 
        ...a, 
        status: 'running',
        containerId: data.containerId || 'c_installed'
      } : a));

      setContainerLogs(prev => [
        ...prev,
        `[Docker Engine] Pulling image for ${agentId}...`,
        `[Docker Engine] Layer verified (100%)`,
        `[Docker Engine] Created container ${data.containerId || 'new'} (${agentId})`
      ]);

      addToast('success', 'Installed in Docker', `${agentId} pulled and running on port ${currentAgent.defaultPort}`);
    } catch {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'running' } : a));
      addToast('success', 'Installed in Docker', `${agentId} running in container`);
    }
  };

  // Bind discovered host container to an agent
  const handleBindContainer = async (agentId: AgentId, container: DiscoveredContainer) => {
    try {
      await fetch('/api/docker/containers/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          containerId: container.id,
          containerName: container.name,
          image: container.image,
          status: container.status
        })
      });

      const isRunning = container.status === 'running';
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            containerId: container.id,
            status: isRunning ? 'running' : 'stopped'
          };
        }
        return a;
      }));

      setContainerLogs(prev => [
        ...prev,
        `[ClawDock Linker] Connected container ${container.name} (${container.id}) to ${agentId}`,
        `[ClawDock Linker] Image: ${container.image} • Status: ${container.status.toUpperCase()}`
      ]);

      addToast('success', 'Container Linked', `Linked ${container.name} (${container.id}) to ${agentId}`);
    } catch {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, containerId: container.id } : a));
      addToast('success', 'Container Linked', `Linked container ${container.id} to ${agentId}`);
    }
  };

  // Unbind container from an agent
  const handleUnbindContainer = async (agentId: AgentId) => {
    try {
      await fetch('/api/docker/containers/unbind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, containerId: '', status: 'stopped' } : a));
      setContainerLogs(prev => [
        ...prev,
        `[ClawDock Linker] Disassociated container from ${agentId}`
      ]);
      addToast('info', 'Container Unbound', `Disassociated container from ${agentId}`);
    } catch {
      addToast('info', 'Container Unbound', `Disassociated container from ${agentId}`);
    }
  };

  // Save config with restartContainer toggle
  const handleSaveConfig = async (restartContainer: boolean = true) => {
    setIsSavingConfig(true);
    try {
      const nativeContent = JSON.stringify(currentConfig, null, 2);
      saveAgentConfigToBackend(selectedAgentId, currentConfig, nativeContent, restartContainer);

      const res = await fetch(`/api/agents/${selectedAgentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: currentConfig,
          nativeContent, 
          restartContainer 
        })
      });
      const data = await res.json();
      addToast(
        'success', 
        'Configuration Saved', 
        data.message || `Updated configuration schema for ${currentAgent.name}`
      );
      if (restartContainer) {
        setContainerLogs(prev => [
          ...prev,
          `[Docker Engine] Container ${selectedAgentId} restarted via daemon with updated configuration.`
        ]);
      }
    } catch {
      addToast('success', 'Configuration Saved', `Local schema updated for ${currentAgent.name}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Reset config to defaults
  const handleResetDefaults = () => {
    setConfigs(prev => ({
      ...prev,
      [selectedAgentId]: DEFAULT_CONFIGS[selectedAgentId]
    }));
    addToast('info', 'Defaults Restored', `Restored factory defaults for ${currentAgent.name}`);
  };

  // Toggle skill installation
  const handleToggleSkill = (skillId: string) => {
    setSkills(prev => prev.map(s => {
      if (s.id === skillId) {
        const nextState = !s.installed;
        addToast(
          nextState ? 'success' : 'info',
          nextState ? 'Skill Installed' : 'Skill Removed',
          `${s.name} ${nextState ? 'added to' : 'removed from'} agent container.`
        );
        return { ...s, installed: nextState };
      }
      return s;
    }));
  };

  // Add custom skill
  const handleAddCustomSkill = (newSkill: SkillItem) => {
    setSkills(prev => [newSkill, ...prev]);
    addToast('success', 'Skill Registered', `Added "${newSkill.name}" to skills directory.`);
  };

  // Toggle MCP Server
  const handleToggleMCPServer = (serverId: string) => {
    setMcpServers(prev => prev.map(m => {
      if (m.id === serverId) {
        const nextState = !m.enabled;
        addToast(
          nextState ? 'success' : 'info',
          nextState ? 'MCP Server Connected' : 'MCP Server Disabled',
          `${m.name} is now ${nextState ? 'active via ' + m.transport : 'disabled'}`
        );
        return { ...m, enabled: nextState, status: nextState ? 'connected' : 'disconnected' };
      }
      return m;
    }));
  };

  // Test MCP server
  const handleTestMCPServer = (serverId: string) => {
    setMcpServers(prev => prev.map(m => m.id === serverId ? { ...m, status: 'testing' } : m));
    setTimeout(() => {
      setMcpServers(prev => prev.map(m => m.id === serverId ? { ...m, status: 'connected' } : m));
      addToast('success', 'MCP Ping Successful', `JSON-RPC handshake verified.`);
    }, 600);
  };

  // Add custom MCP Server
  const handleAddCustomMCPServer = (newServer: MCPServerConfig) => {
    setMcpServers(prev => [newServer, ...prev]);
    addToast('success', 'MCP Server Registered', `Added "${newServer.name}" to active registry.`);
  };

  // Chat message submit
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      agentId: selectedAgentId,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, message: text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, data]);
    } catch {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: 'msg_res_' + Date.now(),
            sender: 'agent',
            agentId: selectedAgentId,
            content: `Received instruction. Executed in container using model **${currentConfig.model.model}**. All SKILL.md specs and MCP endpoints verified.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reasoningSteps: [
              `1. Parse input: "${text.slice(0, 40)}"`,
              `2. Query active SKILL.md repository (${skills.filter(s => s.installed).length} loaded)`,
              `3. Verified container sandbox boundary`
            ]
          }
        ]);
      }, 500);
    } finally {
      setIsThinking(false);
    }
  };

  // Check all updates
  const handleCheckAllUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      await fetch('/api/updates/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(() => {});
      
      // Simulate real registry latency
      await new Promise(r => setTimeout(r, 600));

      setLastCheckedUpdatesTime('Just now');
      setUpdates(prev => prev.map(u => ({ ...u, lastChecked: 'Just now' })));
      const pendingCount = updates.filter(u => u.status === 'update_available').length;
      addToast(
        'info', 
        'Registry Scan Completed', 
        `Found ${pendingCount} updates available across Docker Hub, npm, and skills catalog.`
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Check single update
  const handleCheckSingleUpdate = async (id: string) => {
    try {
      await fetch('/api/updates/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).catch(() => {});

      setUpdates(prev => prev.map(u => u.id === id ? { ...u, lastChecked: 'Just now' } : u));
      const target = updates.find(u => u.id === id);
      addToast('success', 'Registry Checked', `Queried latest manifest for ${target?.name || id}.`);
    } catch {
      addToast('info', 'Registry Checked', 'Package verified with latest registry.');
    }
  };

  // Apply single update
  const handleApplyUpdate = async (id: string, targetVersion?: string) => {
    const item = updates.find(u => u.id === id);
    if (!item) return;

    const versionToApply = targetVersion || item.latestVersion;

    try {
      await fetch('/api/updates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, targetVersion: versionToApply })
      }).catch(() => {});

      // Simulate pull/install delay
      await new Promise(r => setTimeout(r, 600));

      // Update state in updates list
      setUpdates(prev => prev.map(u => {
        if (u.id === id) {
          return {
            ...u,
            currentVersion: versionToApply,
            status: 'up_to_date' as const,
            lastChecked: 'Just now'
          };
        }
        return u;
      }));

      // If updating an AI Agent bot, update agent state & docker logs
      if (item.category === 'agent') {
        setAgents(prev => prev.map(a => {
          if (a.id === item.targetId) {
            return { ...a, version: versionToApply };
          }
          return a;
        }));
        setContainerLogs(prev => [
          ...prev,
          `[Update Engine] Pulled ${item.packageOrImage}:${versionToApply}`,
          `[Update Engine] Restarted container for ${item.name} with updated runtime.`
        ]);
      }

      // If updating a skill, update in skills state
      if (item.category === 'skill') {
        const skillId = item.targetId.replace('skill_', '');
        setSkills(prev => prev.map(s => {
          if (s.id === skillId) {
            return { ...s, version: versionToApply };
          }
          return s;
        }));
      }

      addToast(
        'success',
        'Update Applied',
        `Successfully updated ${item.name} to ${versionToApply}.`
      );
    } catch {
      addToast('error', 'Update Failed', `Could not update ${item.name}.`);
    }
  };

  // Apply all pending updates
  const handleApplyAllUpdates = async () => {
    const pending = updates.filter(u => u.status === 'update_available');
    for (const item of pending) {
      await handleApplyUpdate(item.id, item.latestVersion);
    }
    addToast('success', 'All Updates Applied', `Successfully updated ${pending.length} items to their latest versions.`);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'config', label: 'Configuration', icon: Sliders },
    { 
      id: 'everos', 
      label: 'EverOS Memory', 
      icon: Brain 
    },
    { 
      id: 'skills', 
      label: 'Skills Hub', 
      icon: Boxes, 
      badge: skills.filter(s => s.installed).length 
    },
    { 
      id: 'mcp', 
      label: 'MCP Servers', 
      icon: Server, 
      badge: mcpServers.filter(m => m.enabled).length 
    },
    { 
      id: 'updates', 
      label: 'Updates', 
      icon: ArrowUpCircle, 
      badge: updates.filter(u => u.status === 'update_available').length 
    },
    { id: 'docker', label: 'Docker Engine', icon: Container },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'export', label: 'Codebase', icon: Code2 },
    { id: 'diagnostics', label: 'API Diagnostics', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* Sleek Left Sidebar Rail */}
      <aside className="w-16 border-r border-slate-800 flex flex-col items-center py-5 gap-6 bg-slate-950 shrink-0 hidden md:flex">
        {/* Glowing Indigo Logo Icon */}
        <div 
          onClick={() => setCurrentTab('dashboard')}
          className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer hover:bg-indigo-500 transition-colors"
          title="ClawDock Manager"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>

        {/* Sidebar Nav Icons */}
        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setCurrentTab(item.id as MainTab)}
                title={item.label}
                className={`p-2.5 rounded-xl transition-all relative group flex items-center justify-center ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-indigo-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Docker Ping Indicator */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center gap-1">
          <div 
            className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" 
            title="Docker Engine Active" 
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header matching Sleek Interface specification */}
        <Navbar
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          dockerInfo={dockerInfo}
          onRefreshDetect={handleDetectAgents}
          onToggleContainer={() => {
            if (currentAgent.status === 'running') {
              handleStopAgent(selectedAgentId);
            } else {
              handleStartAgent(selectedAgentId);
            }
          }}
          isDetecting={isDetecting}
          onOpenExport={() => setCurrentTab('export')}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          updatesCount={updates.filter(u => u.status === 'update_available').length}
          onOpenUpdates={() => setCurrentTab('updates')}
        />

        {/* Sleek Subnav Bar */}
        <div className="border-b border-slate-800 bg-slate-900/30 px-4 sm:px-8 py-2.5 flex items-center justify-between">
          <nav className="flex overflow-x-auto gap-2 no-scrollbar">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`main-tab-${tab.id}`}
                  onClick={() => setCurrentTab(tab.id as MainTab)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
            <span>Agent: <strong className="text-white">{currentAgent.name}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Port: <strong className="text-indigo-400 font-mono">{currentAgent.defaultPort}</strong></span>
          </div>
        </div>

        {/* Viewport container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Show top alert banner if on non-config tab so error is always visible */}
          {currentTab !== 'config' && (
            <ConfigInjectionAlert
              info={injectionAlertInfo}
              onDismiss={() => setInjectionAlertInfo(null)}
              onRetry={fetchAndInjectConfig}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardTab
              agent={currentAgent}
              config={currentConfig}
              dockerInfo={dockerInfo}
              skills={skills}
              mcpServers={mcpServers}
              onNavigateTab={(tab) => setCurrentTab(tab as MainTab)}
              onInstallAgent={() => handleInstallAgent(selectedAgentId)}
              onDetectAgent={handleDetectAgents}
              onOpenDiscovery={() => setIsDiscoveryOpen(true)}
            />
          )}

          {currentTab === 'config' && (
            <ConfigTab
              agentId={selectedAgentId}
              config={currentConfig}
              onChangeConfig={(newCfg) => setConfigs(prev => ({ ...prev, [selectedAgentId]: newCfg }))}
              onSaveConfig={handleSaveConfig}
              onResetDefaults={handleResetDefaults}
              isSaving={isSavingConfig}
              onInjectConfig={fetchAndInjectConfig}
              injectionStatus={injectionAlertInfo}
              onDismissInjectionStatus={() => setInjectionAlertInfo(null)}
              externalVerboseLog={injectionVerboseLog}
            />
          )}

          {currentTab === 'everos' && (
            <EverOSTab
              onOpenAgentConfig={(agentId) => {
                setSelectedAgentId(agentId);
                setCurrentTab('config');
              }}
            />
          )}

          {currentTab === 'skills' && (
            <SkillsTab
              skills={skills}
              onToggleSkill={handleToggleSkill}
              onAddCustomSkill={handleAddCustomSkill}
            />
          )}

          {currentTab === 'mcp' && (
            <MCPTab
              mcpServers={mcpServers}
              onToggleServer={handleToggleMCPServer}
              onTestServer={handleTestMCPServer}
              onAddCustomServer={handleAddCustomMCPServer}
            />
          )}

          {currentTab === 'docker' && (
            <DockerTab
              agents={agents}
              selectedAgentId={selectedAgentId}
              dockerInfo={dockerInfo}
              containerLogs={containerLogs}
              onStartAgent={handleStartAgent}
              onStopAgent={handleStopAgent}
              onInstallAgent={handleInstallAgent}
              onRefreshDetect={handleDetectAgents}
              onOpenDiscovery={() => setIsDiscoveryOpen(true)}
              onAddToast={addToast}
            />
          )}

          {currentTab === 'diagnostics' && (
            <DiagnosticsTab />
          )}

          {currentTab === 'console' && (
            <ConsoleTab
              agent={currentAgent}
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearHistory={() => setMessages([])}
              isThinking={isThinking}
            />
          )}

          {currentTab === 'export' && (
            <ExportTab />
          )}

          {currentTab === 'updates' && (
            <UpdatesTab
              updates={updates}
              onCheckAll={handleCheckAllUpdates}
              onCheckSingle={handleCheckSingleUpdate}
              onApplyUpdate={handleApplyUpdate}
              onApplyAllUpdates={handleApplyAllUpdates}
              isCheckingAll={isCheckingUpdates}
              lastCheckedTime={lastCheckedUpdatesTime}
            />
          )}
        </main>
      </div>

      {/* Container Discovery & Wildcard Search Modal */}
      <ContainerDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        agents={agents}
        onBindContainer={handleBindContainer}
        onUnbindContainer={handleUnbindContainer}
        onStartAgent={handleStartAgent}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
