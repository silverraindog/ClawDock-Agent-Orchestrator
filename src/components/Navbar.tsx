import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  ChevronDown, 
  Container, 
  RefreshCw, 
  Play, 
  Square, 
  Check, 
  Code2, 
  Sliders, 
  Layers, 
  Sparkles, 
  Search,
  ArrowUpCircle
} from 'lucide-react';
import { AgentId, AgentInfo, DockerSystemInfo } from '../types';

interface NavbarProps {
  agents: AgentInfo[];
  selectedAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  dockerInfo: DockerSystemInfo;
  onRefreshDetect: () => void;
  onToggleContainer: () => void;
  isDetecting: boolean;
  onOpenExport: () => void;
  onOpenDiscovery: () => void;
  updatesCount?: number;
  onOpenUpdates?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  dockerInfo,
  onRefreshDetect,
  onToggleContainer,
  isDetecting,
  onOpenExport,
  onOpenDiscovery,
  updatesCount,
  onOpenUpdates
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

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
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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
            Not Installed
          </span>
        );
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/30 backdrop-blur-md sticky top-0 z-40">
      {/* Left title & version badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 md:hidden">
            <Bot className="w-4 h-4" />
          </div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white">
            ClawDock Manager
          </h1>
        </div>
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] uppercase font-bold tracking-widest">
          v1.4.2
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Docker Engine status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Docker Engine: Active</span>
          <span className="text-[10px] font-mono text-slate-500">
            ({dockerInfo.daemonVersion.split(' ')[0]})
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-800 mx-1 hidden md:block" />

        {/* Agent Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="agent-selector-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sm rounded-lg px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${
              currentAgent.status === 'running' ? 'bg-emerald-400 animate-pulse' :
              currentAgent.status === 'stopped' ? 'bg-amber-400' : 'bg-cyan-400'
            }`} />
            <span className="font-medium text-xs sm:text-sm">
              {currentAgent.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

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
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {getStatusBadge(agent.status)}
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
              <span>Stop Container</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Deploy Agent</span>
            </>
          )}
        </button>

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
      </div>
    </header>
  );
};
