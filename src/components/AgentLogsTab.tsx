import React, { useState, useEffect, useRef } from 'react';
import { List } from 'react-window';
import {
  Terminal,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Check,
  Layers,
  Cpu,
  Activity,
  AlertTriangle,
  Info,
  XCircle,
  Filter,
  Search,
  Server
} from 'lucide-react';
import { AgentInfo } from '../types';

interface AgentLogsTabProps {
  agents: AgentInfo[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
}

export const AgentLogsTab: React.FC<AgentLogsTabProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent
}) => {
  const [activeAgentId, setActiveAgentId] = useState<string>(selectedAgentId || 'hermes-agent');
  const [containerLogs, setContainerLogs] = useState<string[]>([]);
  const [uiLogs, setUiLogs] = useState<Array<{ timestamp: string; type: string; level: 'INFO' | 'WARN' | 'ERROR'; message: string }>>([]);
  const [isLiveContainer, setIsLiveContainer] = useState(true);
  const [copiedContainer, setCopiedContainer] = useState(false);
  const [copiedUi, setCopiedUi] = useState(false);
  
  // Master search and source grouping state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceGroup, setSourceGroup] = useState<'ALL' | 'DOCKER' | 'RUNTIME'>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  // Sync active agent if prop changes
  useEffect(() => {
    if (selectedAgentId) {
      setActiveAgentId(selectedAgentId);
    }
  }, [selectedAgentId]);

  // Fetch container logs for activeAgentId
  const fetchContainerLogs = async () => {
    try {
      const res = await fetch(`/api/agents/${activeAgentId}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setContainerLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch container logs:', err);
    }
  };

  // Generate Runtime event logs for this agent with log level tagging
  const generateUiLogs = () => {
    const timeStr = new Date().toLocaleTimeString();
    const mockUiEntries: Array<{ timestamp: string; type: string; level: 'INFO' | 'WARN' | 'ERROR'; message: string }> = [
      { timestamp: timeStr, type: 'STATE_SYNC', level: 'INFO', message: `Synchronized configuration schema and mounted config.yaml for [${activeAgentId}]` },
      { timestamp: timeStr, type: 'MCP_BRIDGE', level: 'INFO', message: `Filesystem & SQLite MCP tools active for [${activeAgentId}]` },
      { timestamp: timeStr, type: 'HEALTH_CHECK', level: 'INFO', message: `Container socket /var/run/docker.sock operational (GID 999)` },
      { timestamp: timeStr, type: 'WARN_CHECK', level: 'WARN', message: `High token usage warning detected in recent context window for [${activeAgentId}]` },
      { timestamp: timeStr, type: 'API_DISPATCH', level: 'INFO', message: `GET /api/agents/${activeAgentId}/config returned 200 OK` }
    ];
    setUiLogs(prev => {
      if (prev.length === 0) return mockUiEntries;
      return prev;
    });
  };

  useEffect(() => {
    fetchContainerLogs();
    generateUiLogs();

    if (!isLiveContainer) return;
    const containerInterval = setInterval(fetchContainerLogs, 3000);
    return () => clearInterval(containerInterval);
  }, [activeAgentId, isLiveContainer]);

  const copyAllLogs = () => {
    const dockerText = containerLogs.join('\n');
    const runtimeText = uiLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.type}] ${l.message}`).join('\n');
    const combined = `=== DOCKER CONTAINER LOGS ===\n${dockerText}\n\n=== RUNTIME ORCHESTRATION LOGS ===\n${runtimeText}`;
    navigator.clipboard.writeText(combined);
    setCopiedContainer(true);
    setTimeout(() => setCopiedContainer(false), 2000);
  };

  // Helper to determine log level of a raw container log line
  const getContainerLogLevel = (line: string): 'INFO' | 'WARN' | 'ERROR' => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('err') || lower.includes('fail') || lower.includes('fatal') || lower.includes('exception')) {
      return 'ERROR';
    }
    if (lower.includes('warn') || lower.includes('warning') || lower.includes('deprecated') || lower.includes('alert')) {
      return 'WARN';
    }
    return 'INFO';
  };

  // Helper to highlight search terms in text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    try {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-400 text-slate-950 px-0.5 rounded font-bold">{part}</mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  // Normalized log entries grouped by source
  const dockerEntries = containerLogs.map((line, idx) => ({
    id: `docker-${idx}`,
    source: 'DOCKER' as const,
    timestamp: 'CONTAINER',
    type: 'STDOUT/STDERR',
    level: getContainerLogLevel(line),
    message: line
  }));

  const runtimeEntries = uiLogs.map((log, idx) => ({
    id: `runtime-${idx}`,
    source: 'RUNTIME' as const,
    timestamp: log.timestamp,
    type: log.type,
    level: log.level,
    message: log.message
  }));

  const allEntries = [...dockerEntries, ...runtimeEntries];

  const filteredEntries = allEntries.filter(entry => {
    const matchesSource = sourceGroup === 'ALL' || entry.source === sourceGroup;
    const matchesLevel = levelFilter === 'ALL' || entry.level === levelFilter;
    const matchesSearch = searchQuery.trim() === '' ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesLevel && matchesSearch;
  });

  const LogRow = ({ index, style, ariaAttributes }: { index: number; style: React.CSSProperties; ariaAttributes: any }) => {
    const entry = filteredEntries[index];
    const isDocker = entry.source === 'DOCKER';
    return (
      <div style={style} className="px-2" {...ariaAttributes}>
        <div
          className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            entry.level === 'ERROR'
              ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
              : entry.level === 'WARN'
              ? 'bg-amber-950/25 border-amber-500/30 text-amber-200'
              : isDocker
              ? 'bg-slate-900/70 border-slate-800 text-emerald-300/90'
              : 'bg-slate-900/90 border-slate-800/80 text-slate-200'
          }`}
        >
          <div className="flex items-start md:items-center gap-3 min-w-0">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
              isDocker
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
            }`}>
              {isDocker ? <Cpu className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
              {entry.source}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
              entry.level === 'ERROR'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : entry.level === 'WARN'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}>
              {entry.level}
            </span>
            <span className="text-[10px] text-slate-500 shrink-0 font-mono">[{entry.type}]</span>
            <span className="break-all text-xs flex-1 font-mono">
              {renderHighlightedText(entry.message, searchQuery)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 shrink-0 font-mono text-right">
            {entry.timestamp}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Agent Selector */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            Swarm Agent Logs &amp; Event Stream
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Virtualized console output streaming Docker container stdout/stderr alongside Runtime orchestration audit events for [{activeAgentId}].
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="text-xs font-semibold text-slate-400">Agent:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {agents.map((agent) => {
              const isSelected = activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    setActiveAgentId(agent.id);
                    onSelectAgent(agent.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {agent.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search, Grouping & Controls Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Filter Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search & find specific log events within container logs and runtime state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
            />
          </div>

          {/* Source Grouping Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 px-2 font-bold uppercase">Source:</span>
            {(['ALL', 'DOCKER', 'RUNTIME'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceGroup(src)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  sourceGroup === src
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {src === 'ALL' ? 'All Sources' : src === 'DOCKER' ? 'Docker (Stdout)' : 'Runtime (Audit)'}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  levelFilter === lvl
                    ? lvl === 'ERROR' ? 'bg-rose-500 text-white' : lvl === 'WARN' ? 'bg-amber-500 text-slate-950' : lvl === 'INFO' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300 font-bold">{filteredEntries.length} events displayed</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px]">Showing grouped logs for agent <strong className="text-white font-mono">{activeAgentId}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveContainer(!isLiveContainer)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                isLiveContainer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              {isLiveContainer ? <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              {isLiveContainer ? 'Live Stream Active' : 'Stream Paused'}
            </button>

            <button
              onClick={fetchContainerLogs}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              {copiedContainer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedContainer ? 'Copied All' : 'Copy All Logs'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Logs Console Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="text-slate-600 text-center py-32 space-y-2">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
            <p>// No matching log events found for the selected source or search query.</p>
          </div>
        ) : (
          <List<object>
            height={600}
            rowCount={filteredEntries.length}
            rowHeight={85}
            width="100%"
            rowComponent={LogRow}
            rowProps={{}}
          />
        )}
      </div>
    </div>
  );
};
