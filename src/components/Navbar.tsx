import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Search,
  Download,
  ArrowUpCircle,
  Menu,
  AlertTriangle,
  Container,
  Cpu
} from 'lucide-react';
import { AgentId, AgentInfo, DockerSystemInfo, SystemUpdateItem } from '../types';
import { ApiHealthIndicator } from './ApiHealthIndicator';

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
    <div
      className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
      title="Live Container Metadata Version tag fetched from backend"
    >
      <div className="flex flex-col items-end leading-none gap-0.5">
        <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Container Tag</span>
        <span className="text-[10px] font-mono font-bold text-indigo-400">
          {version.startsWith('v') ? version : `v${version}`}
        </span>
      </div>
    </div>
  );
};

export interface NavbarProps {
  agents: AgentInfo[];
  selectedAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  dockerInfo: DockerSystemInfo;
  onRefreshDetect: () => void;
  onToggleContainer: () => void;
  onRestartContainer: () => void;
  isDetecting?: boolean;
  onOpenExport: () => void;
  onOpenDiscovery: () => void;
  onOpenUpdates: () => void;
  updates?: SystemUpdateItem[];
  onOpenMobileMenu?: () => void;
  versionErrors?: Record<string, boolean>;
  onResyncVersion?: (agentId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  dockerInfo,
  onRefreshDetect,
  onToggleContainer,
  onRestartContainer,
  isDetecting = false,
  onOpenExport,
  onOpenDiscovery,
  onOpenUpdates,
  updates = [],
  onOpenMobileMenu,
  versionErrors = {},
  onResyncVersion
}) => {
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const isRunning = currentAgent?.status === 'running';
  const isRestarting = currentAgent?.status === 'restarting';
  const pendingUpdatesCount = updates.filter(u => u.status === 'update_available').length;
  const hasVersionError = Boolean(versionErrors[selectedAgentId]);

  const fallbackAgentOptions: { id: AgentId; name: string }[] = [
    { id: 'hermes-agent', name: 'Hermes Agent' },
    { id: 'zeroclaw', name: 'ZeroClaw' },
    { id: 'openclaw', name: 'OpenClaw' },
    { id: 'picoclaw', name: 'PicoClaw' }
  ];

  const displayAgents = agents.length > 0
    ? agents
    : fallbackAgentOptions.map(o => ({ ...o, status: 'stopped' as const, defaultPort: 8080 }));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
      {/* Left: Mobile Menu + Brand + Agent Selector */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight text-white">ClawDock</span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Docker Hub
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Agent Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {displayAgents.map(ag => {
            const active = ag.id === selectedAgentId;
            const agRunning = ag.status === 'running';
            return (
              <button
                key={ag.id}
                type="button"
                onClick={() => onSelectAgent(ag.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    agRunning
                      ? 'bg-emerald-400'
                      : ag.status === 'restarting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span>{ag.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Container Controls + System Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {currentAgent && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Container className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] text-slate-300">
              :{currentAgent.defaultPort || 8080}
            </span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                isRunning
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : isRestarting
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentAgent.status}
            </span>
          </div>
        )}

        <ContainerMetadataBadge agentId={selectedAgentId} />

        {hasVersionError && onResyncVersion && (
          <button
            type="button"
            onClick={() => onResyncVersion(selectedAgentId)}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
            title="Version poll mismatch - click to resync"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Resync</span>
          </button>
        )}

        {/* Start / Stop Container */}
        <button
          type="button"
          onClick={onToggleContainer}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            isRunning
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
          title={isRunning ? 'Stop Container' : 'Start Container'}
        >
          {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span className="hidden sm:inline">{isRunning ? 'Stop' : 'Start'}</span>
        </button>

        {/* Restart Container */}
        <button
          type="button"
          onClick={onRestartContainer}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          title="Restart Agent Container"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Refresh / Detect */}
        <button
          type="button"
          onClick={onRefreshDetect}
          disabled={isDetecting}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          title="Detect Container State"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Discovery Modal Trigger */}
        <button
          type="button"
          onClick={onOpenDiscovery}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          title="Discover & Bind Docker Containers"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Discover</span>
        </button>

        {/* Updates Button */}
        <button
          type="button"
          onClick={onOpenUpdates}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer relative"
          title={`System Updates (${dockerInfo.runningContainers}/${dockerInfo.totalContainers} containers active)`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Updates</span>
          {pendingUpdatesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
              {pendingUpdatesCount}
            </span>
          )}
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          title="Export Codebase & Docker Compose"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden xl:inline">Export</span>
        </button>

        {/* Live API Health Indicator */}
        <ApiHealthIndicator />
      </div>
    </header>
  );
};

export default Navbar;