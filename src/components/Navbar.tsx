import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  ChevronDown, 
  Container, 
  RefreshCw, 
  RotateCw,
  Play, 
  Square, 
  Check, 
  Code2, 
  Sliders, 
  Layers, 
  Sparkles, 
  Search,
  ArrowUpCircle,
  Activity,
  Menu
} from 'lucide-react';
import { AgentId, AgentInfo, DockerSystemInfo, SystemUpdateItem } from '../types';
import { ApiHealthIndicator } from './ApiHealthIndicator';
import { INITIAL_UPDATES } from '../data/updatesData';

interface ContainerMetadataBadgeProps {
  agentId: string;
}

export const ContainerMetadataBadge: React.FC<ContainerMetadataBadgeProps> = ({ agentId }) => {
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/agents/${agentId}/metadata`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.version) {
            setVersion(data.version);
          }
        }
      } catch (err) {
        console.error('Failed to fetch container metadata:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchMetadata();
    return () => {
      active = false;
    };
  }, [agentId]);

  if (isLoading) {
    return (
      <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700 animate-pulse">
        Metadata Loading...
      </span>
    );
  }

  if (!version) return null;

  return (
    <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20" title="Live Container Metadata Version tag fetched from backend">
      <div className="flex flex-col items-end leading-none gap-0.5">
        <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Container Tag</span>
        <span className="text-[10px] font-mono font-bold text-indigo-400">
          {version.startsWith('v') ? version : `v${version}`}
        </span>
      </div>
    </div>
  );
};

interface NavbarProps {
  agents: AgentInfo[];
  selectedAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  dockerInfo: DockerSystemInfo;
  onRefreshDetect: () => void;
  onToggleContainer: () => void;
  onRestartContainer?: () => void;
  isDetecting: boolean;
  onOpenExport: () => void;
  onOpenDiscovery: () => void;
  updatesCount?: number;
  onOpenUpdates?: () => void;
  updates?: SystemUpdateItem[];
  onOpenMobileMenu?: () => void;
  versionErrors?: Record<string, boolean>;
  onResyncVersion?: (agentId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  dockerInfo,
  onRefreshDetect,
  onToggleContainer,
  onRestartContainer,
  isDetecting,
  onOpenExport,
  onOpenDiscovery,
  updatesCount,
  onOpenUpdates,
  updates,
  onOpenMobileMenu,
  versionErrors,
  onResyncVersion
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAgent = agents?.find(a => a.id === selectedAgentId) || agents?.[0] || {
    id: selectedAgentId || 'zeroclaw',
    name: selectedAgentId || 'Agent',
    status: 'stopped',
    framework: 'Agent Framework',
    defaultPort: 8080
  };

  const currentUpdate = React.useMemo(() => {
    const list = updates && updates.length > 0 ? updates : INITIAL_UPDATES;
    return list.find(u => u.targetId === selectedAgentId);
  }, [selectedAgentId, updates]);

  const latestVersion = currentUpdate?.latestVersion;
  const currentVersion = currentAgent?.version;

  const isNewerVersionAvailable = React.useMemo(() => {
    if (!latestVersion || !currentVersion) return false;
    const cleanCur = currentVersion.replace(/^v/, '').split('-')[0];
    const cleanLat = latestVersion.replace(/^v/, '').split('-')[0];
    return cleanCur !== cleanLat;
  }, [latestVersion, currentVersion]);

  const [appVersion, setAppVersion] = useState<string>('V.0.1.0');
  const [appMetadata, setAppMetadata] = useState<{buildHash?: string, buildTimestamp?: string}>({});

  useEffect(() => {
    let active = true;
    const fetchAppVersion = async () => {
      try {
        const res = await fetch('/api/app/version');
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.version) {
            let v = data.version;
            // standardise to V.x.y.z
            if (v.toLowerCase().startsWith('v.')) {
              v = 'V.' + v.slice(2);
            } else if (v.toLowerCase().startsWith('v')) {
              v = 'V.' + v.slice(1);
            } else if (!v.toUpperCase().startsWith('V.')) {
              v = 'V.' + v;
            }
            setAppVersion(v);
            setAppMetadata({
              buildHash: data.buildHash,
              buildTimestamp: data.buildTimestamp
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch app version:', err);
      }
    };
    fetchAppVersion();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        );
      case 'restarting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin" />
            Restarting
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Error
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Stopped
          </span>
        );
      case 'detected_local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Local Host
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Not Installed
          </span>
        );
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/30 backdrop-blur-md sticky top-0 z-40">
      {/* Left title & version badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 md:hidden flex items-center justify-center transition-colors"
          title="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5 text-indigo-400" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 md:hidden">
            <Bot className="w-4 h-4" />
          </div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white">
            ClawDock Manager
          </h1>
        </div>
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] uppercase font-bold tracking-widest">
          v0.0.1
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Backend API Health Indicator */}
        <ApiHealthIndicator />

        {/* Docker Engine status indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Docker Engine: Active</span>
          <span className="text-[10px] font-mono text-slate-500">
            ({dockerInfo.daemonVersion.split(' ')[0]})
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Agent Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="agent-selector-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sm rounded-lg px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${
              currentAgent?.status === 'running' ? 'bg-emerald-400 animate-pulse' :
              currentAgent?.status === 'stopped' ? 'bg-slate-500' :
              currentAgent?.status === 'error' || currentAgent?.status === 'restarting' ? 'bg-amber-400 animate-pulse' :
              'bg-cyan-400'
            }`} />
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="font-bold text-xs sm:text-sm">
                {currentAgent?.name || selectedAgentId || 'Agent'}
              </span>
              <span className="text-[9px] font-mono text-indigo-400/70 font-bold uppercase tracking-tighter">
                {currentAgent.version.startsWith('v') ? currentAgent.version : `v${currentAgent.version}`}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Version 404 Indicator & Re-sync Button for Selected Agent */}
          {versionErrors?.[selectedAgentId] && (
            <div className="absolute left-0 top-full mt-1.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shadow-lg whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-[10px] font-bold">Version 404</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResyncVersion?.(selectedAgentId);
                }}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors shadow"
                title="Manually trigger version fetch for this agent ID"
              >
                Re-sync Version
              </button>
            </div>
          )}

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Bot Agent
              </div>
              <div className="divide-y divide-slate-800/60">
                {agents.map((agent) => {
                  const isSelected = agent.id === selectedAgentId;
                  return (
                    <button
                      key={agent.id}
                      id={`select-agent-${agent.id}`}
                      onClick={() => {
                        onSelectAgent(agent.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-slate-800/80 transition-colors ${
                        isSelected ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                      }`}
                    >
                      <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {agent.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {agent.framework}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          {getStatusBadge(agent.status)}
                          {versionErrors?.[agent.id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onResyncVersion?.(agent.id);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-colors"
                              title="Re-sync version for this agent"
                            >
                              Re-sync Version
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Find Existing Containers (Wildcard Search) */}
        <button
          id="find-existing-containers-btn"
          onClick={onOpenDiscovery}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="Search Docker host for existing containers (Wildcard scan)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Find Containers</span>
        </button>

        {/* Re-detect Button */}
        <button
          id="detect-agents-btn"
          onClick={onRefreshDetect}
          disabled={isDetecting}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          title="Detect agents in Docker"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isDetecting ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">Detect</span>
        </button>

        {/* Deploy / Toggle Container Button */}
        <button
          id="toggle-container-btn"
          onClick={onToggleContainer}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            currentAgent.status === 'running'
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
          }`}
        >
          {currentAgent.status === 'running' ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Deploy</span>
            </>
          )}
        </button>

        {/* Dedicated Restart / Start Container Button */}
        {onRestartContainer && (
          <button
            id="navbar-restart-container-btn"
            onClick={onRestartContainer}
            disabled={currentAgent?.status === 'restarting'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title={
              currentAgent?.status === 'running'
                ? `Restart ${currentAgent?.name || 'Agent'} Container`
                : `Start / Restart ${currentAgent?.name || 'Agent'} Container`
            }
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${currentAgent?.status === 'restarting' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {currentAgent?.status === 'restarting'
                ? 'Restarting...'
                : currentAgent?.status === 'running'
                  ? 'Restart'
                  : 'Restart'}
            </span>
          </button>
        )}

        {/* Updates Button if updates are available */}
        {updatesCount !== undefined && updatesCount > 0 && onOpenUpdates && (
          <button
            id="navbar-updates-btn"
            onClick={onOpenUpdates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/30 cursor-pointer shadow-sm"
            title={`${updatesCount} System Updates Available`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Updates ({updatesCount})</span>
          </button>
        )}

        {/* Python & Docker Code Button */}
        <button
          id="export-code-btn"
          onClick={onOpenExport}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
          title="Inspect Python Application and Dockerfile"
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Code &amp; Dockerfile</span>
        </button>

        {/* Selected Agent Version Tag */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
          <div className="flex flex-col items-end leading-none gap-0.5">
            <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Agent Version</span>
            <span className="text-[10px] font-mono font-bold text-indigo-400">
              {currentAgent.version.startsWith('v') ? currentAgent.version : `v${currentAgent.version}`}
            </span>
          </div>
        </div>

        {/* Live Container Metadata Tag (New component requested) */}
        <ContainerMetadataBadge agentId={selectedAgentId} />

        {/* Update Available Warning (Orange warning indicator comparing current and latest) */}
        {isNewerVersionAvailable && (
          <div 
            onClick={onOpenUpdates}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-all font-semibold text-[10px] animate-pulse cursor-pointer shrink-0"
            title={`A newer version (${latestVersion}) is available. Click to view updates.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-0.5" />
            <span>Update Available: {latestVersion}</span>
          </div>
        )}

        {/* Global App Version Tag */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80" 
             title={appMetadata.buildHash ? `Last synced: ${appMetadata.buildTimestamp} | Build: ${appMetadata.buildHash.substring(0, 7)}` : "Application version from Git tag or package.json"}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-semibold text-slate-300 tracking-tight">ClawDock</span>
            <span className="w-1 h-1 rounded-full bg-indigo-500" />
            <span className="text-[10px] font-mono font-bold text-indigo-400">
              {appVersion}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
