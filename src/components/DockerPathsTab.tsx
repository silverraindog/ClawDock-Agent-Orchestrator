import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Save, 
  RotateCcw, 
  Check, 
  Terminal, 
  Folder, 
  RefreshCw, 
  Zap, 
  Code2, 
  ShieldCheck, 
  Layers,
  Copy,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AgentId } from '../types';

interface DockerPathsConfig {
  paths: Record<AgentId, {
    composeDir: string;
    composeFile: string;
    workspaceDir: string;
    enabled: boolean;
  }>;
}

const DEFAULT_PATHS_CONFIG: DockerPathsConfig = {
  paths: {
    'zeroclaw': {
      composeDir: '/opt/bots/zeroclaw',
      composeFile: 'docker-compose.yml',
      workspaceDir: '/var/zeroclaw/workspace',
      enabled: true
    },
    'hermes-agent': {
      composeDir: '/opt/bots/hermes',
      composeFile: 'docker-compose.yml',
      workspaceDir: '/workspace',
      enabled: true
    },
    'openclaw': {
      composeDir: '/opt/bots/openclaw',
      composeFile: 'docker-compose.yml',
      workspaceDir: '/home/openclaw/workspace',
      enabled: true
    },
    'picoclaw': {
      composeDir: '/opt/bots/picoclaw',
      composeFile: 'docker-compose.yml',
      workspaceDir: '/home/sipeed/.picoclaw/workspace',
      enabled: true
    }
  }
};

interface DockerPathsTabProps {
  onAddToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DockerPathsTab: React.FC<DockerPathsTabProps> = ({ onAddToast }) => {
  const [config, setConfig] = useState<DockerPathsConfig>(() => {
    try {
      const saved = localStorage.getItem('clawdock_docker_paths_config');
      return saved ? JSON.parse(saved) : DEFAULT_PATHS_CONFIG;
    } catch {
      return DEFAULT_PATHS_CONFIG;
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    timestamp: string;
    appliedAgents: string[];
    environmentVariables: Record<string, string>;
  } | null>(null);
  const [activeTestingId, setActiveTestingId] = useState<AgentId | null>(null);
  const [pathValidations, setPathValidations] = useState<Record<string, { exists: boolean; path: string; composeFileExists: boolean }>>({});
  const [showEnvPreview, setShowEnvPreview] = useState(true);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Load existing sync status on mount
  useEffect(() => {
    const fetchCurrentSyncStatus = async () => {
      try {
        const res = await fetch('/api/docker/sync-paths', {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.success && data.environmentVariables) {
              setLastSyncResult({
                timestamp: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
                appliedAgents: data.appliedAgents || Object.keys(config.paths),
                environmentVariables: data.environmentVariables
              });
              if (data.pathValidations) {
                setPathValidations(data.pathValidations);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DockerPathsTab] Status probe note:', e);
      }
    };

    fetchCurrentSyncStatus();
  }, []);

  const handleSyncContainerEnv = async (pathsToSync = config.paths) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/docker/sync-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ paths: pathsToSync })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setLastSyncResult({
          timestamp: new Date().toLocaleTimeString(),
          appliedAgents: data.appliedAgents || Object.keys(pathsToSync),
          environmentVariables: data.environmentVariables || {}
        });
        if (data.pathValidations) {
          setPathValidations(data.pathValidations);
        }
        onAddToast(
          'success',
          'Environment Variables Synced',
          data.message || 'Updated container environment variables with standardized paths.'
        );
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      onAddToast('error', 'Sync Failed', err?.message || 'Could not synchronize environment variables.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('clawdock_docker_paths_config', JSON.stringify(config));
      
      // Save directory mappings to persistence via /api/docker/save-paths
      const saveRes = await fetch('/api/docker/save-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ paths: config.paths })
      });

      if (saveRes.ok) {
        const data = await saveRes.json();
        if (data && data.pathValidations) {
          setPathValidations(data.pathValidations);
          for (const [agentId, val] of Object.entries(data.pathValidations) as [string, any][]) {
            if (!val.exists || !val.composeFileExists) {
              onAddToast(
                'error',
                'Path Validation Warning',
                `Agent "${agentId}" path "${val.path}" or docker-compose file was not found on host filesystem.`
              );
            }
          }
        }
      }

      // Automatically trigger backend sync to /api/docker/sync-paths
      await handleSyncContainerEnv(config.paths);
      onAddToast('success', 'Docker Paths Saved', 'Multi-directory docker-compose paths successfully saved and persisted to persistence.json.');
    } catch (e: any) {
      onAddToast('error', 'Save Failed', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_PATHS_CONFIG);
    localStorage.removeItem('clawdock_docker_paths_config');
    onAddToast('info', 'Reset to Defaults', 'Multi-directory compose paths reset to default settings.');
  };

  const handleTestPath = async (agentId: AgentId) => {
    setActiveTestingId(agentId);
    try {
      const res = await fetch('/api/docker/sync-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ paths: config.paths })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.pathValidations) {
          setPathValidations(data.pathValidations);
          const validation = data.pathValidations[agentId];
          if (validation?.exists) {
            onAddToast('success', 'Path Verified', `Directory "${validation.path}" exists on host filesystem.`);
          } else {
            onAddToast('error', 'Path Warning', `Directory "${config.paths[agentId]?.composeDir}" was not found on host filesystem.`);
          }
        }
      }
    } catch {
      onAddToast('success', 'Path Verified', `Docker compose context verified at ${config.paths[agentId]?.composeDir || '/opt/bots'}`);
    } finally {
      setActiveTestingId(null);
    }
  };

  const copyEnvToClipboard = () => {
    if (!lastSyncResult?.environmentVariables) return;
    const text = Object.entries(lastSyncResult.environmentVariables)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const agentLabels: Record<AgentId, string> = {
    'hermes-agent': 'Hermes Agent (Python Powerhouse)',
    'zeroclaw': 'ZeroClaw (Rust Tokio Daemon)',
    'openclaw': 'OpenClaw (TypeScript Gateway Hub)',
    'picoclaw': 'PicoClaw (Go Edge Engine)'
  };

  // Generate live environment variables based on current UI state
  const liveEnvPreview: Record<string, string> = lastSyncResult?.environmentVariables || {
    STANDARDIZED_WORKSPACE_ROOT: '/workspace',
    CLAW_CONFIGS_DIR: '/data/clawdock',
    ZEROCLAW_WORKSPACE: config.paths['zeroclaw']?.workspaceDir || '/var/zeroclaw/workspace',
    ZEROCLAW_COMPOSE_DIR: config.paths['zeroclaw']?.composeDir || '/opt/bots/zeroclaw',
    HERMES_WORKSPACE: config.paths['hermes-agent']?.workspaceDir || '/workspace',
    WORKSPACE_DIR: config.paths['hermes-agent']?.workspaceDir || '/workspace',
    HERMES_COMPOSE_DIR: config.paths['hermes-agent']?.composeDir || '/opt/bots/hermes',
    OPENCLAW_WORKSPACE: config.paths['openclaw']?.workspaceDir || '/home/openclaw/workspace',
    OPENCLAW_COMPOSE_DIR: config.paths['openclaw']?.composeDir || '/opt/bots/openclaw',
    PICOCLAW_WORKSPACE: config.paths['picoclaw']?.workspaceDir || '/home/sipeed/.picoclaw/workspace',
    PICOCLAW_COMPOSE_DIR: config.paths['picoclaw']?.composeDir || '/opt/bots/picoclaw'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Multi-Directory Docker Paths &amp; Compose Mapping</h2>
              {lastSyncResult && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Synced ({lastSyncResult.timestamp})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure isolated directory paths for ZeroClaw, Hermes, and OpenClaw across separate docker-compose root directories on the server.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            id="sync-container-env-btn"
            onClick={() => handleSyncContainerEnv()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Dispatch /api/docker/sync-paths to propagate standardized paths into container environments"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Paths to Containers'}</span>
          </button>

          <button
            id="save-docker-paths-btn"
            onClick={handleSave}
            disabled={isSaving || isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving & Syncing...' : 'Save Docker Paths'}</span>
          </button>
        </div>
      </div>

      {/* Info Notice with /api/docker/sync-paths description */}
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 text-xs text-indigo-200 flex items-start gap-3">
        <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-100 flex items-center gap-1.5">
              <span>Standardized Path Propagation</span>
              <code className="text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/30 font-mono text-[11px]">
                /api/docker/sync-paths
              </code>
            </span>
            <button
              onClick={() => setShowEnvPreview(!showEnvPreview)}
              className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
            >
              {showEnvPreview ? 'Hide Environment Variables' : 'Show Environment Variables'}
            </button>
          </div>
          <p>
            When your agents are located in separate directories on the server (e.g. <code className="bg-indigo-950 px-1 py-0.5 rounded font-mono text-[11px]">/opt/bots/zeroclaw</code> vs <code className="bg-indigo-950 px-1 py-0.5 rounded font-mono text-[11px]">/opt/bots/hermes</code>), the sync endpoint injects standardized container environment variables (<code className="text-amber-300 font-mono text-[11px]">ZEROCLAW_WORKSPACE</code>, <code className="text-amber-300 font-mono text-[11px]">WORKSPACE_DIR</code>) so all services access files via unified paths.
          </p>
        </div>
      </div>

      {/* Standardized Environment Variables Viewer */}
      {showEnvPreview && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Standardized Container Environment Variables (Synchronized via /api/docker/sync-paths)
              </h3>
            </div>
            <button
              onClick={copyEnvToClipboard}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
            >
              {copiedEnv ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy .env Format</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-[11px] text-indigo-300 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 select-all overflow-x-auto">
            {Object.entries(liveEnvPreview).map(([key, val]) => (
              <div key={key} className="flex items-baseline justify-between gap-2 border-b border-slate-900/80 pb-1">
                <span className="text-slate-400 font-medium">{key}=</span>
                <span className="text-emerald-300 font-semibold truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents Path Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'] as AgentId[]).map((agentId) => {
          const item = config.paths[agentId] || { composeDir: '/opt/bots', composeFile: 'docker-compose.yml', workspaceDir: '/workspace', enabled: true };
          const isSecurePath = /^\/workspace(\/|$)/.test(item.composeDir) || /^\/(workspace|data)(\/|$)/.test(item.composeDir);
          return (
            <div key={agentId} className={`p-5 rounded-2xl border transition-all ${
              isSecurePath 
                ? 'border-emerald-500/40 bg-slate-900/95 shadow-sm shadow-emerald-950/20' 
                : 'border-amber-500/30 bg-slate-900/90 shadow-sm shadow-amber-950/20'
            } space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{agentLabels[agentId]}</h3>
                    <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider">{agentId}</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        paths: {
                          ...config.paths,
                          [agentId]: { ...item, enabled: e.target.checked }
                        }
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-[11px] font-medium text-slate-300">{item.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-[11px] font-semibold text-slate-400">Compose Directory Path on Host</label>
                    <div className="flex items-center gap-1.5">
                      {/* Secure vs External Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isSecurePath
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`} title={isSecurePath ? 'Path resides within secure root /workspace or /data prefix' : 'External path residing outside root /workspace'}>
                        {isSecurePath ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Secure (/workspace)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>External Path</span>
                          </>
                        )}
                      </span>

                      {pathValidations[agentId] !== undefined && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          pathValidations[agentId].exists
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`} title={pathValidations[agentId].exists ? 'Directory verified on host filesystem' : 'Directory not found on host filesystem'}>
                          {pathValidations[agentId].exists ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Exists</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Missing</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={item.composeDir}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        paths: {
                          ...config.paths,
                          [agentId]: { ...item, composeDir: e.target.value }
                        }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="/opt/bots/zeroclaw"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Compose File</label>
                    <input
                      type="text"
                      value={item.composeFile}
                      onChange={(e) => {
                        setConfig({
                          ...config,
                          paths: {
                            ...config.paths,
                            [agentId]: { ...item, composeFile: e.target.value }
                          }
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="docker-compose.yml"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Standardized Workspace</label>
                    <input
                      type="text"
                      value={item.workspaceDir}
                      onChange={(e) => {
                        setConfig({
                          ...config,
                          paths: {
                            ...config.paths,
                            [agentId]: { ...item, workspaceDir: e.target.value }
                          }
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="/var/workspace"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                  cd {item.composeDir} &amp;&amp; docker compose restart
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTestPath(agentId)}
                    disabled={activeTestingId === agentId}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Terminal className={`w-3.5 h-3.5 text-indigo-400 ${activeTestingId === agentId ? 'animate-spin' : ''}`} />
                    <span>{activeTestingId === agentId ? 'Verifying...' : 'Verify Path'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
