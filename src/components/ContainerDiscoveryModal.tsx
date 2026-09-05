import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Container, 
  Check, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  HelpCircle, 
  Play, 
  Unlink, 
  Layers,
  Sparkles,
  Filter,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { AgentInfo, AgentId, DiscoveredContainer } from '../types';

interface ContainerDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentInfo[];
  onBindContainer: (agentId: AgentId, container: DiscoveredContainer) => Promise<void>;
  onUnbindContainer: (agentId: AgentId) => Promise<void>;
  onStartAgent: (agentId: AgentId) => void;
}

export const ContainerDiscoveryModal: React.FC<ContainerDiscoveryModalProps> = ({
  isOpen,
  onClose,
  agents,
  onBindContainer,
  onUnbindContainer,
  onStartAgent
}) => {
  const [pattern, setPattern] = useState('*claw*, *hermes*, *agent*, *nous*');
  const [loading, setLoading] = useState(false);
  const [discoveredContainers, setDiscoveredContainers] = useState<DiscoveredContainer[]>([]);
  const [selectedAgentMap, setSelectedAgentMap] = useState<Record<string, AgentId>>({});
  const [bindingState, setBindingState] = useState<Record<string, boolean>>({});
  const [manualContainerInput, setManualContainerInput] = useState('');
  const [manualAgentSelect, setManualAgentSelect] = useState<AgentId>('hermes-agent');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const presetFilters = [
    { label: 'All Bot Agents', query: '*claw*, *hermes*, *agent*, *nous*' },
    { label: 'Hermes Only', query: '*hermes*' },
    { label: 'ZeroClaw Only', query: '*zero*' },
    { label: 'OpenClaw Only', query: '*open*' },
    { label: 'PicoClaw Only', query: '*pico*' },
    { label: 'All Host Containers (*)', query: '*' }
  ];

  const searchContainers = async (searchPattern?: string) => {
    setLoading(true);
    const p = searchPattern !== undefined ? searchPattern : pattern;
    try {
      const res = await fetch(`/api/docker/containers/search?pattern=${encodeURIComponent(p)}`);
      if (res.ok) {
        const data = await res.json();
        const containers: DiscoveredContainer[] = data.containers || [];
        setDiscoveredContainers(containers);

        // Pre-populate suggested agent selections
        const initialMap: Record<string, AgentId> = {};
        containers.forEach(c => {
          if (c.suggestedAgentId) {
            initialMap[c.id] = c.suggestedAgentId;
          } else {
            initialMap[c.id] = 'hermes-agent';
          }
        });
        setSelectedAgentMap(prev => ({ ...initialMap, ...prev }));
      }
    } catch (err) {
      console.error('Failed to search containers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchContainers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmBind = async (container: DiscoveredContainer, startAfter: boolean = false) => {
    const targetAgentId = selectedAgentMap[container.id] || container.suggestedAgentId || 'hermes-agent';
    setBindingState(prev => ({ ...prev, [container.id]: true }));
    try {
      await onBindContainer(targetAgentId, container);
      if (startAfter && container.status !== 'running') {
        onStartAgent(targetAgentId);
      }
      // Refresh list to update isBoundTo
      await searchContainers();
    } finally {
      setBindingState(prev => ({ ...prev, [container.id]: false }));
    }
  };

  const handleUnbind = async (agentId: AgentId, containerId: string) => {
    setBindingState(prev => ({ ...prev, [containerId]: true }));
    try {
      await onUnbindContainer(agentId);
      await searchContainers();
    } finally {
      setBindingState(prev => ({ ...prev, [containerId]: false }));
    }
  };

  const handleBindAllSuggested = async () => {
    setLoading(true);
    try {
      for (const c of discoveredContainers) {
        if (c.suggestedAgentId && !c.isBoundTo) {
          await onBindContainer(c.suggestedAgentId, c);
        }
      }
      await searchContainers();
    } finally {
      setLoading(false);
    }
  };

  const handleManualBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContainerInput.trim()) return;
    
    const fakeContainer: DiscoveredContainer = {
      id: manualContainerInput.trim().substring(0, 12),
      name: manualContainerInput.trim(),
      image: 'custom-image:latest',
      status: 'running',
      state: 'Running (Manual Link)',
      created: 'Just now',
      ports: 'configured',
      suggestedAgentId: manualAgentSelect,
      confidence: 'high'
    };

    await onBindContainer(manualAgentSelect, fakeContainer);
    setManualContainerInput('');
    await searchContainers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="container-discovery-modal"
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Container className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Find Existing Docker Containers
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Wildcard Search &amp; Discovery
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scan your Docker daemon for existing Hermes, ZeroClaw, OpenClaw, or PicoClaw containers and link them.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Controls */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="docker-wildcard-pattern-input"
                  type="text"
                  placeholder="Enter search pattern or wildcard (e.g. *claw*, *hermes*, *pico*)..."
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchContainers()}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <button
                id="execute-wildcard-scan-btn"
                onClick={() => searchContainers()}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Scan Docker</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Quick filters:
              </span>
              {presetFilters.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPattern(preset.query);
                    searchContainers(preset.query);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>
                Found <strong className="text-white font-mono">{discoveredContainers.length}</strong> container{discoveredContainers.length === 1 ? '' : 's'} matching wildcard criteria
              </span>
            </div>

            {discoveredContainers.some(c => c.suggestedAgentId && !c.isBoundTo) && (
              <button
                id="link-all-suggested-btn"
                onClick={handleBindAllSuggested}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Confirm All Auto-Matches
              </button>
            )}
          </div>

          {/* Container Cards List */}
          <div className="space-y-3">
            {discoveredContainers.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                  <Container className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-sm font-semibold text-white">No Matching Containers Found</h4>
                  <p className="text-xs text-slate-400">
                    No containers matching &quot;{pattern}&quot; were detected on the Docker socket. Try searching with <code className="text-indigo-400 font-mono">*</code> or enter your container name manually below.
                  </p>
                </div>
              </div>
            ) : (
              discoveredContainers.map((container) => {
                const isBound = !!container.isBoundTo;
                const boundAgentInfo = agents.find(a => a.id === container.isBoundTo);
                const selectedAgentId = selectedAgentMap[container.id] || container.suggestedAgentId || 'hermes-agent';
                const isBinding = !!bindingState[container.id];

                return (
                  <div
                    key={container.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isBound
                        ? 'bg-slate-900 border-l-4 border-l-emerald-500 border-slate-800'
                        : container.confidence === 'high'
                        ? 'bg-slate-900/90 border-l-4 border-l-indigo-500 border-slate-800 shadow-md'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Container Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                            {container.name}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            id: {container.id}
                          </span>

                          {container.status === 'running' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Running ({container.state})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {container.state || 'Stopped'}
                            </span>
                          )}

                          {container.confidence === 'high' && !isBound && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Recommended Match
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 font-mono truncate">
                          Image: <span className="text-slate-300">{container.image}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Ports: {container.ports || 'None mapped'}</span>
                          <span>•</span>
                          <span>Created: {container.created}</span>
                          {container.matchReason && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400">{container.matchReason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* User Confirmation / Linking Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                        {isBound ? (
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Linked to {boundAgentInfo?.name || container.isBoundTo}</span>
                            </div>

                            <button
                              onClick={() => handleUnbind(container.isBoundTo!, container.id)}
                              disabled={isBinding}
                              title="Unbind container from agent"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                Link to:
                              </span>
                              <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentMap(prev => ({ ...prev, [container.id]: e.target.value as AgentId }))}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                {agents.map((ag) => (
                                  <option key={ag.id} value={ag.id}>
                                    {ag.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => handleConfirmBind(container, false)}
                              disabled={isBinding}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                              {isBinding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Confirm &amp; Link
                            </button>

                            {container.status !== 'running' && (
                              <button
                                onClick={() => handleConfirmBind(container, true)}
                                disabled={isBinding}
                                title="Link and immediately start container"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                              >
                                <Play className="w-3 h-3 text-emerald-400" />
                                <span className="hidden sm:inline">Link &amp; Start</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Manual Container Link Form */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Container className="w-3.5 h-3.5 text-indigo-400" />
              Manual Container Link
            </div>
            <p className="text-[11px] text-slate-400">
              Have a container with a custom name or ID that didn&apos;t show up? Enter the name or ID directly to bind it to an agent.
            </p>

            <form onSubmit={handleManualBind} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Container Name or ID (e.g. custom-hermes-prod or 9f10a8bc72)..."
                value={manualContainerInput}
                onChange={(e) => setManualContainerInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />

              <select
                value={manualAgentSelect}
                onChange={(e) => setManualAgentSelect(e.target.value as AgentId)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    Link to {ag.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!manualContainerInput.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Bind Manually
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bound containers sync telemetry, port bindings, and logs in real-time.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
