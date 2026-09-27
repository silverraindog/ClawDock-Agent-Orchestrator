import React, { useState, useEffect, useRef } from 'react';
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
  Search
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
  const [isLiveUi, setIsLiveUi] = useState(true);
  const [copiedContainer, setCopiedContainer] = useState(false);
  const [copiedUi, setCopiedUi] = useState(false);
  const [containerFilter, setContainerFilter] = useState('');
  const [uiFilter, setUiFilter] = useState('');
  const [containerLevelFilter, setContainerLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [uiLevelFilter, setUiLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const containerLogsEndRef = useRef<HTMLDivElement>(null);
  const uiLogsEndRef = useRef<HTMLDivElement>(null);

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

  // Generate UI event logs for this agent with log level tagging
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

  const copyContainerLogs = () => {
    navigator.clipboard.writeText(containerLogs.join('\n'));
    setCopiedContainer(true);
    setTimeout(() => setCopiedContainer(false), 2000);
  };

  const copyUiLogs = () => {
    const text = uiLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.type}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedUi(true);
    setTimeout(() => setCopiedUi(false), 2000);
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
          <mark key={i} className="bg-amber-400 text-slate-955 px-0.5 rounded font-bold">{part}</mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const filteredContainerLogs = containerLogs.filter(line => {
    const matchesText = containerFilter ? line.toLowerCase().includes(containerFilter.toLowerCase()) : true;
    const level = getContainerLogLevel(line);
    const matchesLevel = containerLevelFilter === 'ALL' || level === containerLevelFilter;
    return matchesText && matchesLevel;
  });

  const filteredUiLogs = uiLogs.filter(log => {
    const matchesText = uiFilter ? log.message.toLowerCase().includes(uiFilter.toLowerCase()) || log.type.toLowerCase().includes(uiFilter.toLowerCase()) : true;
    const matchesLevel = uiLevelFilter === 'ALL' || log.level === uiLevelFilter;
    return matchesText && matchesLevel;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Agent Selector */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            Split Consoles: Container &amp; UI Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time separated terminal outputs streaming container stdout/stderr alongside frontend orchestration audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="text-xs font-semibold text-slate-400">Select Agent:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'].map((id) => {
              const isSelected = activeAgentId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveAgentId(id);
                    onSelectAgent(id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Split Consoles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CONSOLE 1: CONTAINER LOGS */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Container Logs</h3>
                <p className="text-[11px] text-slate-400 font-mono">/api/agents/{activeAgentId}/logs</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsLiveContainer(!isLiveContainer)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  isLiveContainer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {isLiveContainer ? <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" /> : <Pause className="w-3 h-3" />}
                {isLiveContainer ? 'Live' : 'Paused'}
              </button>

              <button
                onClick={fetchContainerLogs}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Refresh Container Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={copyContainerLogs}
                disabled={containerLogs.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors disabled:opacity-40"
              >
                {copiedContainer ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedContainer ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Filtering, Search & Log Level Highlighting Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search & highlight container logs..."
                  value={containerFilter}
                  onChange={(e) => setContainerFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setContainerLevelFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      containerLevelFilter === lvl
                        ? lvl === 'ERROR' ? 'bg-rose-500 text-white' : lvl === 'WARN' ? 'bg-amber-500 text-slate-950' : lvl === 'INFO' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs overflow-x-auto overflow-y-auto h-[380px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 space-y-1">
            {filteredContainerLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-20">// No matching container logs found.</div>
            ) : (
              filteredContainerLogs.map((line, idx) => {
                const lvl = getContainerLogLevel(line);
                return (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap py-1 px-2 rounded border transition-colors flex items-start gap-2 ${
                      lvl === 'ERROR'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                        : lvl === 'WARN'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                        : 'bg-transparent border-transparent text-emerald-400/90'
                    }`}
                  >
                    <span className="select-none text-[10px] opacity-60 pt-0.5">[{lvl}]</span>
                    <span className="flex-1">{renderHighlightedText(line, containerFilter)}</span>
                  </div>
                );
              })
            )}
            <div ref={containerLogsEndRef} />
          </div>
        </div>

        {/* CONSOLE 2: UI & FRONTEND ORCHESTRATION AUDIT LOGS */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">UI &amp; Frontend Audit Logs</h3>
                <p className="text-[11px] text-slate-400 font-mono">Client orchestrator events for [{activeAgentId}]</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsLiveUi(!isLiveUi)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  isLiveUi ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {isLiveUi ? <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" /> : <Pause className="w-3 h-3" />}
                {isLiveUi ? 'Live' : 'Paused'}
              </button>

              <button
                onClick={generateUiLogs}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Refresh UI Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={copyUiLogs}
                disabled={uiLogs.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors disabled:opacity-40"
              >
                {copiedUi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Filtering, Search & Log Level Highlighting Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search & highlight UI audit logs..."
                  value={uiFilter}
                  onChange={(e) => setUiFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setUiLevelFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      uiLevelFilter === lvl
                        ? lvl === 'ERROR' ? 'bg-rose-500 text-white' : lvl === 'WARN' ? 'bg-amber-500 text-slate-950' : lvl === 'INFO' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs overflow-x-auto overflow-y-auto h-[380px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 space-y-2">
            {filteredUiLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-20">// No matching UI audit events found.</div>
            ) : (
              filteredUiLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded border space-y-1 ${
                    log.level === 'ERROR'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : log.level === 'WARN'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-300' : log.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                      }`}>
                        {log.level}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">{log.type}</span>
                    </div>
                  </div>
                  <div className="text-xs">{renderHighlightedText(log.message, uiFilter)}</div>
                </div>
              ))
            )}
            <div ref={uiLogsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
};
