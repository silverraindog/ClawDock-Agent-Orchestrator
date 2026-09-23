import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  ArrowUpCircle, 
  CheckCircle2, 
  Bot, 
  Server, 
  Boxes, 
  Sparkles, 
  Clock, 
  Terminal, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Layers,
  Container,
  AlertTriangle,
  Tag,
  History,
  Activity,
  RotateCcw,
  GitCompare,
  ArrowRightLeft,
  FileJson,
  X
} from 'lucide-react';
import { SystemUpdateItem, UpdateCategory, BuildHistoryItem } from '../types';

interface UpdatesTabProps {
  updates: SystemUpdateItem[];
  onCheckAll: () => Promise<void>;
  onCheckSingle: (id: string) => Promise<void>;
  onApplyUpdate: (id: string, targetVersion?: string) => Promise<void>;
  onApplyAllUpdates: () => Promise<void>;
  isCheckingAll: boolean;
  lastCheckedTime: string;
}

// Mock configuration schemas for comparison
const MOCK_SCHEMAS: Record<string, any> = {
  'v1.2.0': {
    engine: 'hermes-3.5',
    max_tokens: 4096,
    temperature: 0.7,
    features: ['async_tools', 'memory_graph', 'reasoning_tokens'],
    retry_policy: { strategy: 'exponential', max_retries: 3 }
  },
  'v1.1.0': {
    engine: 'hermes-3.0',
    max_tokens: 2048,
    temperature: 0.8,
    features: ['async_tools', 'memory_graph'],
    retry_policy: { strategy: 'fixed', max_retries: 5 }
  },
  'v2.0.0': {
    schema_version: '2.0',
    agent_id: 'openclaw-gateway',
    routing: 'multi-fleet',
    models: ['gpt-4o', 'claude-3.5-sonnet'],
    security: { tls: true, auth: 'oidc' }
  },
  'v0.6.2': {
    allocator: 'jemalloc',
    heap_limit: '12MB',
    simd: true,
    persistence: 'sqlite'
  },
  'v1.0.0': {
    boot_mode: 'fast',
    inference: 'picolm-gguf',
    hardware_accel: 'riscv-v',
    web_gateway: true
  }
};

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  updates,
  onCheckAll,
  onCheckSingle,
  onApplyUpdate,
  onApplyAllUpdates,
  isCheckingAll,
  lastCheckedTime
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | UpdateCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUpdates, setOnlyUpdates] = useState(false);
  const [expandedChangelog, setExpandedChangelog] = useState<Record<string, boolean>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [compareSelection, setCompareSelection] = useState<{agentId: string, v1?: BuildHistoryItem, v2?: BuildHistoryItem}>({ agentId: '' });
  const [showCompare, setShowCompare] = useState(false);

  // Filtered update list
  const filteredUpdates = useMemo(() => {
    return updates.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Status filter
      if (onlyUpdates && item.status !== 'update_available') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (item?.name || '').toLowerCase().includes(q) ||
          (item?.description || '').toLowerCase().includes(q) ||
          (item?.packageOrImage || '').toLowerCase().includes(q) ||
          (item?.currentVersion || '').toLowerCase().includes(q) ||
          (item?.latestVersion || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [updates, activeCategory, onlyUpdates, searchQuery]);

  const handleRollback = async (agentId: string, history: BuildHistoryItem) => {
    if (!confirm(`Are you sure you want to rollback to ${history.version} (Tag: ${history.dockerTag})? This will restart the container.`)) return;
    
    setRollingBack(history.id);
    try {
      const res = await fetch(`/api/agents/${agentId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: history.dockerTag, version: history.version })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Rollback initiated for ${agentId}. The agent will restart shortly.`);
      }
    } catch (e) {
      console.error('Rollback failed:', e);
    } finally {
      setRollingBack(null);
    }
  };

  const startComparison = (agentId: string) => {
    setCompareSelection({ agentId });
    setShowCompare(true);
  };

  const toggleVersionSelect = (v: BuildHistoryItem) => {
    setCompareSelection(prev => {
      if (prev.v1?.id === v.id) return { ...prev, v1: undefined };
      if (prev.v2?.id === v.id) return { ...prev, v2: undefined };
      if (!prev.v1) return { ...prev, v1: v };
      if (!prev.v2) return { ...prev, v2: v };
      return { ...prev, v2: v }; // Replace v2 if both selected
    });
  };

  // Metric counts
  const totalCount = updates.length;
  const updatesAvailableCount = updates.filter(u => u.status === 'update_available').length;
  const upToDateCount = updates.filter(u => u.status === 'up_to_date').length;
  const agentCount = updates.filter(u => u.category === 'agent').length;
  const agentUpdatesCount = updates.filter(u => u.category === 'agent' && u.status === 'update_available').length;
  const mcpCount = updates.filter(u => u.category === 'mcp').length;
  const mcpUpdatesCount = updates.filter(u => u.category === 'mcp' && u.status === 'update_available').length;
  const skillCount = updates.filter(u => u.category === 'skill').length;
  const skillUpdatesCount = updates.filter(u => u.category === 'skill' && u.status === 'update_available').length;

  const toggleChangelog = (id: string) => {
    setExpandedChangelog(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleVersionChange = (id: string, version: string) => {
    setSelectedVersions(prev => ({ ...prev, [id]: version }));
  };

  const handleCopyCommand = (id: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommandId(id);
    setTimeout(() => setCopiedCommandId(null), 2500);
  };

  const handleSingleUpdate = async (item: SystemUpdateItem) => {
    const targetVer = selectedVersions[item.id] || item.latestVersion;
    setUpdatingIds(prev => ({ ...prev, [item.id]: true }));
    try {
      await onApplyUpdate(item.id, targetVer);
    } finally {
      setUpdatingIds(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleBulkUpdate = async () => {
    setIsBulkUpdating(true);
    try {
      await onApplyAllUpdates();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getCategoryBadge = (category: UpdateCategory) => {
    switch (category) {
      case 'agent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bot className="w-3.5 h-3.5" />
            AI Bot Container
          </span>
        );
      case 'mcp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Server className="w-3.5 h-3.5" />
            MCP Server
          </span>
        );
      case 'skill':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Boxes className="w-3.5 h-3.5" />
            Skill Spec
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparison Modal Overlay */}
      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Compare Build Schemas</h3>
                  <p className="text-xs text-slate-500">Agent: {compareSelection.agentId}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCompare(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {!compareSelection.v1 || !compareSelection.v2 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-800 rounded-2xl">
                  <div className="p-4 rounded-full bg-slate-800/50">
                    <ArrowRightLeft className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium">Select two builds from the history to compare configurations</p>
                  <div className="flex gap-2">
                    {updates.find(u => u.id === compareSelection.agentId)?.buildHistory?.map(h => (
                      <button
                        key={h.id}
                        onClick={() => toggleVersionSelect(h)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          compareSelection.v1?.id === h.id || compareSelection.v2?.id === h.id
                            ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {h.version}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* Version 1 */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{compareSelection.v1.version}</span>
                        <span className="text-[10px] text-slate-500">{compareSelection.v1.dockerTag}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Left Baseline</span>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-slate-950 font-mono text-xs overflow-auto border border-slate-800">
                      <pre className="text-slate-300">
                        {JSON.stringify(MOCK_SCHEMAS[compareSelection.v1.version] || { warning: 'Schema not found for this build' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Version 2 */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 font-mono">{compareSelection.v2.version}</span>
                        <span className="text-[10px] text-indigo-300/60">{compareSelection.v2.dockerTag}</span>
                      </div>
                      <span className="text-[10px] text-indigo-400">Target Changes</span>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-slate-950 font-mono text-xs overflow-auto border border-indigo-500/10">
                      <pre className="text-slate-300">
                        {Object.entries(MOCK_SCHEMAS[compareSelection.v2.version] || {}).map(([key, val]) => {
                          const v1Val = (MOCK_SCHEMAS[compareSelection.v1!.version] || {})[key];
                          const isDiff = JSON.stringify(val) !== JSON.stringify(v1Val);
                          return (
                            <div key={key} className={isDiff ? 'bg-amber-500/10 -mx-4 px-4 py-0.5 border-l-2 border-amber-500' : ''}>
                              <span className="text-slate-500">"{key}": </span>
                              <span className={isDiff ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                {JSON.stringify(val, null, 2)}
                              </span>
                              {isDiff && <span className="text-[10px] text-slate-500 ml-2 italic"> // changed from {JSON.stringify(v1Val)}</span>}
                            </div>
                          );
                        })}
                        {!(MOCK_SCHEMAS[compareSelection.v2.version]) && 'Schema not found for this build'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Indicates schema difference detected between builds</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCompareSelection({ agentId: compareSelection.agentId })}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
                <button 
                  onClick={() => setShowCompare(false)}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  System Updates
                  {updatesAvailableCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      {updatesAvailableCount} Available
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unified registry scanner for Hermes, ZeroClaw, OpenClaw, PicoClaw, Model Context Protocol servers, and SKILL.md specs.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="btn-check-all-updates"
              onClick={onCheckAll}
              disabled={isCheckingAll}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isCheckingAll ? 'Checking Registries...' : 'Check All Updates'}</span>
            </button>

            {updatesAvailableCount > 0 && (
              <button
                id="btn-apply-all-updates"
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isBulkUpdating ? 'Updating Stack...' : `Update All (${updatesAvailableCount})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Monitored Items</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-white">{totalCount}</span>
              <span className="text-[11px] text-slate-500">Packages &amp; Bots</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
              <ArrowUpCircle className="w-3 h-3" />
              Updates Available
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-amber-300">{updatesAvailableCount}</span>
              <span className="text-[11px] text-slate-500">Ready to pull</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Up to Date
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-300">{upToDateCount}</span>
              <span className="text-[11px] text-slate-500">Current release</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last Registry Scan
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-semibold text-slate-300">{lastCheckedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Items</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('agent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'agent'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Bots</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60">
              {agentCount}
            </span>
            {agentUpdatesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveCategory('mcp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'mcp'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>MCP Servers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60">
              {mcpCount}
            </span>
            {mcpUpdatesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveCategory('skill')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'skill'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Skills</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60">
              {skillCount}
            </span>
            {skillUpdatesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        {/* Right Search & Only Updates Checkbox */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyUpdates}
              onChange={e => setOnlyUpdates(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span>Updates Only ({updatesAvailableCount})</span>
          </label>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter items or versions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Main Updates List */}
      <div className="space-y-3">
        {filteredUpdates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Everything is up to date</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No pending updates match your current filter. You can click &quot;Check All Updates&quot; anytime to query GitHub, Docker Hub, and npm registries.
            </p>
          </div>
        ) : (
          filteredUpdates.map(item => {
            const isUpdating = updatingIds[item.id];
            const isExpanded = expandedChangelog[item.id];
            const hasUpdate = item.status === 'update_available';
            const selectedVer = selectedVersions[item.id] || item.latestVersion;

            return (
              <div
                key={item.id}
                id={`update-card-${item.id}`}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  hasUpdate
                    ? 'border-amber-500/30 bg-slate-900/90 shadow-sm'
                    : 'border-slate-800/80 bg-slate-900/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Metadata & Names */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(item.category)}
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {item?.name || item?.id}
                      </h3>
                      {item.breakingChanges && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Breaking Changes
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="text-slate-400">{item.packageOrImage}</span>
                      <span>•</span>
                      <span>Checked: {item.lastChecked}</span>
                      {item.dockerTag && (
                        <>
                          <span>•</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                            item.registryMatch !== false 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            <Tag className="w-2.5 h-2.5" />
                            {item.dockerTag}
                            {item.registryMatch !== false ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <Activity className="w-2.5 h-2.5 animate-pulse" />
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Center: Version Comparison & Selector */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Installed Version Pill */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Installed
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-slate-300">
                        {item.currentVersion}
                      </span>
                    </div>

                    <div className="text-slate-600 font-mono text-xs">→</div>

                    {/* Target / Latest Version Selector */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                        Target / Latest
                      </span>
                      {item.availableVersions && item.availableVersions.length > 1 ? (
                        <div className="relative">
                          <select
                            value={selectedVer}
                            onChange={e => handleVersionChange(item.id, e.target.value)}
                            className="appearance-none pl-2.5 pr-7 py-1 rounded-lg bg-slate-950 border border-indigo-500/40 font-mono text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-400 cursor-pointer"
                          >
                            {item.availableVersions.map(v => (
                              <option key={v.version} value={v.version}>
                                {v.version} {v.isLatest ? '(latest)' : ''} {v.version === item.currentVersion ? '(current)' : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-indigo-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                          hasUpdate 
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.latestVersion}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="min-w-[110px] flex justify-end">
                      {hasUpdate ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-3.5 h-3.5" />
                          Update Avail.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Up to Date
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasUpdate ? (
                      <button
                        onClick={() => handleSingleUpdate(item)}
                        disabled={isUpdating}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span>Update to {selectedVer}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => onCheckSingle(item.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-check</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleChangelog(item.id)}
                      title="Toggle Release Notes"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Changelog & Command Strip */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>What&apos;s New in {selectedVer}:</span>
                        {item.category === 'agent' && (
                          <span className="text-[11px] font-normal text-indigo-400 flex items-center gap-1">
                            <Container className="w-3 h-3" />
                            Docker Container Image
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1 pl-4 list-disc list-outside text-xs text-slate-400">
                        {item.changelogSummary.map((note, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Available Releases History */}
                    {item.availableVersions && item.availableVersions.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Available Releases &amp; Tags:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {item.availableVersions.map(v => (
                            <div 
                              key={v.version}
                              onClick={() => handleVersionChange(item.id, v.version)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                (selectedVersions[item.id] || item.latestVersion) === v.version
                                  ? 'border-indigo-500/50 bg-indigo-500/10'
                                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between font-mono">
                                <span className="font-bold text-slate-200">{v.version}</span>
                                <span className="text-[10px] text-slate-500">{v.releaseDate}</span>
                              </div>
                              {v.releaseNotes && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                  {v.releaseNotes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Host CLI Command Execution Helper */}
                    {item.installCommand && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            <Terminal className="w-3 h-3 text-indigo-400" />
                            Host CLI Upgrade Command:
                          </span>
                          <button
                            onClick={() => handleCopyCommand(item.id, item.installCommand || '')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedCommandId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Command</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto select-all">
                          {item.installCommand}
                        </div>
                      </div>
                    )}

                    {/* Build History Section */}
                    {item.buildHistory && item.buildHistory.length > 0 && (
                      <div className="pt-4 border-t border-slate-800/40">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-indigo-400" />
                            Build & Deployment History (CI/CD Pipeline)
                          </span>
                          <button
                            onClick={() => startComparison(item.id)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 transition-colors"
                          >
                            <GitCompare className="w-3 h-3" />
                            Compare Versions
                          </button>
                        </div>
                        <div className="space-y-2">
                          {item.buildHistory.map(history => (
                            <div key={history.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/60 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                                  <Container className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-200 font-mono">{history.version}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono border border-indigo-500/20">
                                      {history.dockerTag}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                                    {history.commitMessage || 'No commit message available'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" />
                                    {new Date(history.timestamp).toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                                    Deployed Successfully
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRollback(item.id, history)}
                                  disabled={rollingBack === history.id}
                                  className={`p-2 rounded-lg border transition-all ${
                                    rollingBack === history.id
                                      ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500'
                                  }`}
                                  title="Rollback to this version"
                                >
                                  {rollingBack === history.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
