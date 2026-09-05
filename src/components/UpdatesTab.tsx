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
  AlertTriangle
} from 'lucide-react';
import { SystemUpdateItem, UpdateCategory } from '../types';

interface UpdatesTabProps {
  updates: SystemUpdateItem[];
  onCheckAll: () => Promise<void>;
  onCheckSingle: (id: string) => Promise<void>;
  onApplyUpdate: (id: string, targetVersion?: string) => Promise<void>;
  onApplyAllUpdates: () => Promise<void>;
  isCheckingAll: boolean;
  lastCheckedTime: string;
}

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
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.packageOrImage.toLowerCase().includes(q) ||
          item.currentVersion.toLowerCase().includes(q) ||
          item.latestVersion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [updates, activeCategory, onlyUpdates, searchQuery]);

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
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                        {item.name}
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
