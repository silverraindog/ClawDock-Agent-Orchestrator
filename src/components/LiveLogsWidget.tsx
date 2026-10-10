import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Check,
  Search,
  Maximize2,
  Radio,
  Filter,
  ChevronDown,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Download,
  X,
  Clock
} from 'lucide-react';
import { AgentInfo } from '../types';

export type LogLevel = 'All' | 'Info' | 'Warning' | 'Error';

interface LiveLogsWidgetProps {
  agent: AgentInfo;
  onNavigateTab: (tab: string) => void;
}

export const LiveLogsWidget: React.FC<LiveLogsWidgetProps> = ({
  agent,
  onNavigateTab
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(3); // User-definable interval in seconds
  const isLive = autoRefresh;
  const setIsLive = setAutoRefresh;

  // Persisted search query across sessions
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('live_logs_search_query') ||
        localStorage.getItem('clawdock_live_logs_search_query') ||
        localStorage.getItem('live_logs_widget_search') ||
        localStorage.getItem('live_logs_search') ||
        ''
      );
    } catch {
      return '';
    }
  });

  const [isRegex, setIsRegex] = useState<boolean>(true);

  // Persisted active log filter level across sessions
  const [logLevel, setLogLevel] = useState<LogLevel>(() => {
    try {
      const saved = (
        localStorage.getItem('live_logs_filter_level') ||
        localStorage.getItem('clawdock_live_logs_filter_level') ||
        localStorage.getItem('live_logs_widget_filter') ||
        localStorage.getItem('live_logs_filter')
      );
      if (saved) {
        const lower = saved.toLowerCase();
        if (lower === 'info') return 'Info';
        if (lower === 'warning') return 'Warning';
        if (lower === 'error') return 'Error';
        if (lower === 'all') return 'All';
      }
    } catch {}
    return 'All';
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [clearedFeedback, setClearedFeedback] = useState<boolean>(false);
  const [exported, setExported] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(false); // Default false to prevent unwanted page scrolling
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const clearedBaselineRef = useRef<number>(0);
  const rawLogsRef = useRef<string[]>([]);

  // Fetch logs from /api/agents/:id/logs at 3-second interval
  const fetchLogs = async (forceResetBaseline = false) => {
    try {
      const res = await fetch(`/api/agents/${agent.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          rawLogsRef.current = data.logs;
          let visibleLogs = data.logs;

          if (forceResetBaseline) {
            clearedBaselineRef.current = 0;
          } else if (clearedBaselineRef.current > 0) {
            if (data.logs.length > clearedBaselineRef.current) {
              // Show only newly arrived logs since the clear event
              visibleLogs = data.logs.slice(clearedBaselineRef.current);
            } else if (data.logs.length < clearedBaselineRef.current) {
              // Logs were rotated or cleared on server
              clearedBaselineRef.current = 0;
              visibleLogs = data.logs;
            } else {
              // No new logs yet in this fresh session
              visibleLogs = [];
            }
          }

          setLogs(visibleLogs);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error(`[LiveLogsWidget] Failed to fetch logs for ${agent.id}:`, err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const intervalMs = Math.max(1, refreshInterval) * 1000;
    const interval = setInterval(() => {
      fetchLogs();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [agent.id, autoRefresh, refreshInterval]);

  // Auto scroll container only without affecting page scroll
  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Persist last used search query in localStorage across sessions
  useEffect(() => {
    try {
      localStorage.setItem('live_logs_search_query', searchQuery);
      localStorage.setItem('clawdock_live_logs_search_query', searchQuery);
      localStorage.setItem('live_logs_widget_search', searchQuery);
      localStorage.setItem('live_logs_search', searchQuery);
    } catch (e) {
      console.warn('[LiveLogsWidget] Failed to persist search query to localStorage:', e);
    }
  }, [searchQuery]);

  // Persist active log filter level in localStorage across sessions
  useEffect(() => {
    try {
      localStorage.setItem('live_logs_filter_level', logLevel);
      localStorage.setItem('clawdock_live_logs_filter_level', logLevel);
      localStorage.setItem('live_logs_widget_filter', logLevel);
      localStorage.setItem('live_logs_filter', logLevel);
    } catch (e) {
      console.warn('[LiveLogsWidget] Failed to persist filter level to localStorage:', e);
    }
  }, [logLevel]);

  const parseLogMarker = (line: string): 'Info' | 'Warning' | 'Error' | 'Unknown' => {
    // Explicit terminal error markers: [ERROR], [FATAL], [ERR], [CRITICAL], [FAIL], ERROR:, FATAL:, CRITICAL:, LEVEL=ERROR
    if (
      /\[(?:ERROR|ERR|FATAL|CRITICAL|FAIL|FAILURE)\]/i.test(line) ||
      /^(?:ERROR|FATAL|CRITICAL|FAIL):/i.test(line) ||
      /level=(?:"error"|error|"fatal"|fatal|"critical"|critical)/i.test(line) ||
      /\b(ERROR|FATAL|CRITICAL)\s*:/i.test(line)
    ) {
      return 'Error';
    }

    // Explicit terminal warning markers: [WARN], [WARNING], [WRN], WARN:, WARNING:, LEVEL=WARN
    if (
      /\[(?:WARN|WARNING|WRN)\]/i.test(line) ||
      /^(?:WARN|WARNING|WRN):/i.test(line) ||
      /level=(?:"warn"|warn|"warning"|warning)/i.test(line) ||
      /\b(WARN|WARNING)\s*:/i.test(line)
    ) {
      return 'Warning';
    }

    // Explicit terminal info markers: [INFO], [INF], [INFORMATION], INFO:, LEVEL=INFO, [SYSTEM], [DOCKER]
    if (
      /\[(?:INFO|INF|INFORMATION|SYSTEM|DOCKER|DOCKER DAEMON|CLAW)\]/i.test(line) ||
      /^(?:INFO|INF|SYSTEM):/i.test(line) ||
      /level=(?:"info"|info)/i.test(line) ||
      /\b(INFO)\s*:/i.test(line)
    ) {
      return 'Info';
    }

    // Fallback word heuristics if no bracketed marker is present
    if (/\b(FATAL|CRITICAL|FAILED|ERROR)\b/i.test(line)) {
      return 'Error';
    }
    if (/\b(WARNING|WARN)\b/i.test(line)) {
      return 'Warning';
    }
    if (/\b(INFO|INFORMATION)\b/i.test(line)) {
      return 'Info';
    }

    return 'Unknown';
  };

  const matchesLogLevel = (line: string, level: LogLevel): boolean => {
    if (level === 'All') return true;
    const parsed = parseLogMarker(line);
    if (parsed === level) return true;
    if (level === 'Info' && (parsed === 'Unknown' || parsed === 'Info')) return true;
    return false;
  };

  const warningCount = useMemo(() => {
    return (logs || []).filter(line => parseLogMarker(line) === 'Warning').length;
  }, [logs]);

  const criticalCount = useMemo(() => {
    return (logs || []).filter(line => parseLogMarker(line) === 'Error').length;
  }, [logs]);

  const currentHealthState: 'Live' | 'Warning' | 'Critical' = useMemo(() => {
    if (agent.status === 'error' || criticalCount > 0) return 'Critical';
    if (agent.status === 'restarting' || warningCount > 0) return 'Warning';
    return 'Live';
  }, [agent.status, criticalCount, warningCount]);

  const compiledSearch = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return { regex: null, isInvalidRegex: false, rawPattern: '' };
    }

    if (isRegex) {
      try {
        const rx = new RegExp(trimmed, 'i');
        return { regex: rx, isInvalidRegex: false, rawPattern: trimmed };
      } catch {
        // Fallback to escaped literal if syntax is temporarily invalid
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { regex: new RegExp(escaped, 'i'), isInvalidRegex: true, rawPattern: escaped };
      }
    } else {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { regex: new RegExp(escaped, 'i'), isInvalidRegex: false, rawPattern: escaped };
    }
  }, [searchQuery, isRegex]);

  const filteredLogs = useMemo(() => {
    return (logs || []).filter(line => {
      const matchesLevel = matchesLogLevel(line, logLevel);
      if (!matchesLevel) return false;
      if (!compiledSearch.regex) return true;
      return compiledSearch.regex.test(line);
    });
  }, [logs, logLevel, compiledSearch]);

  const renderHighlightedLine = (line: string) => {
    if (!compiledSearch.regex || !searchQuery.trim()) {
      return line;
    }

    try {
      const pattern = compiledSearch.rawPattern;
      if (!pattern) return line;

      // Group in parentheses to preserve delimiters in split
      const splitRegex = new RegExp(`(${pattern})`, 'gi');
      const parts = line.split(splitRegex);
      if (parts.length <= 1) return line;

      const singleMatchRegex = new RegExp(`^${pattern}$`, 'i');
      return parts.map((part, i) => {
        if (!part) return null;
        if (singleMatchRegex.test(part)) {
          return (
            <mark
              key={i}
              className="bg-amber-400/35 text-amber-100 border-b border-amber-400 font-semibold px-0.5 rounded shadow-xs"
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return line;
    }
  };

  const handleCopyLogs = () => {
    const toCopy = filteredLogs.length > 0 ? filteredLogs : logs;
    navigator.clipboard.writeText((toCopy || []).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = async () => {
    // Record current baseline so fresh monitoring session starts from this point onwards
    clearedBaselineRef.current = (rawLogsRef.current && rawLogsRef.current.length > 0)
      ? rawLogsRef.current.length
      : logs.length;
    setLogs([]);
    setClearedFeedback(true);
    setTimeout(() => setClearedFeedback(false), 2000);

    // Call DELETE on server to clear server-side log buffer as well
    try {
      await fetch(`/api/agents/${agent.id}/logs`, { method: 'DELETE' });
    } catch (err) {
      console.warn(`[LiveLogsWidget] DELETE /api/agents/${agent.id}/logs error:`, err);
    }
  };

  const handleExportLogs = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    const content = (logsToExport && logsToExport.length > 0)
      ? logsToExport.join('\n')
      : `[${new Date().toISOString()}] No log entries currently in buffer for ${agent.id}.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `${agent.id}-logs-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const getLogColor = (line: string) => {
    const upper = line.toUpperCase();
    if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('FAIL')) {
      return 'text-red-400 bg-red-500/10 border-l-2 border-red-500 pl-2';
    }
    if (upper.includes('WARN') || upper.includes('WARNING')) {
      return 'text-amber-300 bg-amber-500/10 border-l-2 border-amber-500 pl-2';
    }
    if (upper.includes('SUCCESS') || upper.includes('STARTED') || upper.includes('READY')) {
      return 'text-emerald-400';
    }
    if (upper.includes('[DOCKER]') || upper.includes('[SYSTEM]')) {
      return 'text-indigo-300';
    }
    return 'text-slate-300';
  };

  return (
    <div 
      id="live-logs-widget-container"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col"
    >
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Docker Logs
              </h3>

              {/* Color-coded Status Badges for Live, Warning, and Critical */}
              <div id="live-logs-status-badges" className="flex items-center gap-1.5 flex-wrap">
                {/* Live Badge */}
                <button
                  type="button"
                  id="live-logs-badge-live"
                  onClick={() => setLogLevel('All')}
                  title={isLive ? 'Stream active - click to reset filter' : 'Stream paused - click to reset filter'}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    isLive && currentHealthState !== 'Critical'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-300'
                  }`}
                >
                  <Radio className={`w-2.5 h-2.5 ${isLive ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
                  <span>Live</span>
                </button>

                {/* Warning Badge */}
                <button
                  type="button"
                  id="live-logs-badge-warning"
                  onClick={() => setLogLevel(logLevel === 'Warning' ? 'All' : 'Warning')}
                  title={`${warningCount} Warning log entries - click to toggle filter`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    warningCount > 0 || currentHealthState === 'Warning'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:text-slate-400'
                  }`}
                >
                  <AlertTriangle className={`w-2.5 h-2.5 ${warningCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>Warning</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                    warningCount > 0 ? 'bg-amber-500/25 text-amber-200' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {warningCount}
                  </span>
                </button>

                {/* Critical Badge */}
                <button
                  type="button"
                  id="live-logs-badge-critical"
                  onClick={() => setLogLevel(logLevel === 'Error' ? 'All' : 'Error')}
                  title={`${criticalCount} Critical error entries - click to toggle filter`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    criticalCount > 0 || currentHealthState === 'Critical'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse hover:bg-red-500/25'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:text-slate-400'
                  }`}
                >
                  <ShieldAlert className={`w-2.5 h-2.5 ${criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                  <span>Critical</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                    criticalCount > 0 ? 'bg-red-500/25 text-red-200' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {criticalCount}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Container: <span className="text-slate-200">{agent.containerName || agent.id}</span> • {filteredLogs.length} entries {searchQuery && `(${filteredLogs.length} matching "${searchQuery}")`} {lastUpdated && `(Updated ${lastUpdated})`}
            </p>
          </div>
        </div>

        {/* Widget Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Regex-friendly Search Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              id="live-logs-search-input"
              data-testid="live-logs-search-input"
              type="text"
              placeholder={isRegex ? "Search regex (e.g. error.*fail)..." : "Filter logs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter logs with regex"
              className={`bg-slate-950 border rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono w-40 sm:w-56 transition-colors ${
                compiledSearch.isInvalidRegex
                  ? 'border-amber-500/70 focus:border-amber-400 text-amber-200'
                  : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {/* Action buttons inside the search input: Regex Toggle & Clear Search */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                id="live-logs-regex-toggle"
                data-testid="live-logs-regex-toggle"
                onClick={() => setIsRegex(!isRegex)}
                title={isRegex ? "Regular Expression active (Click to toggle)" : "Literal search active (Click to enable Regex)"}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  isRegex
                    ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/60'
                    : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                .*
              </button>
              {searchQuery && (
                <button
                  type="button"
                  id="live-logs-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search query"
                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Log Level Dropdown Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            <select
              id="live-logs-level-filter"
              data-testid="live-logs-level-filter"
              name="logLevel"
              aria-label="Filter log level"
              value={logLevel}
              onChange={(e) => {
                const val = e.target.value.toLowerCase();
                if (val === 'info') setLogLevel('Info');
                else if (val === 'warning') setLogLevel('Warning');
                else if (val === 'error') setLogLevel('Error');
                else setLogLevel('All');
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-7 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono appearance-none cursor-pointer hover:border-slate-700 transition-colors"
              title="Filter by log level"
            >
              <option value="All">All</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Auto-Refresh Toggle */}
          <button
            type="button"
            id="live-logs-auto-refresh-toggle"
            data-testid="live-logs-auto-refresh-toggle"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? `Auto-refresh active (${refreshInterval}s) - Click to pause` : 'Auto-refresh paused - Click to resume'}
            aria-label="Toggle auto-refresh"
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline font-mono">{autoRefresh ? 'Pause' : 'Resume'}</span>
          </button>

          {/* User-definable Refresh Interval */}
          <div className="relative flex items-center" title="User-definable refresh interval">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            <select
              id="live-logs-interval-select"
              data-testid="live-logs-interval-select"
              name="refreshInterval"
              aria-label="Auto-refresh interval"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className={`bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono appearance-none transition-colors cursor-pointer ${
                autoRefresh
                  ? 'text-slate-200 hover:border-slate-700 focus:outline-none focus:border-indigo-500'
                  : 'text-slate-600 opacity-60 cursor-not-allowed'
              }`}
            >
              <option value={1}>1s</option>
              <option value={2}>2s</option>
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLogs(true)}
            title="Refresh Logs (Fetch all latest)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Clear Log Buffer */}
          <button
            type="button"
            id="live-logs-clear-btn"
            onClick={handleClearLogs}
            title="Clear display buffer to start a fresh log monitoring session"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 hover:text-rose-400 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs group cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span className="hidden sm:inline font-mono">{clearedFeedback ? 'Cleared' : 'Clear'}</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            title="Copy Logs"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export Logs */}
          <button
            type="button"
            id="live-logs-export-btn"
            data-testid="live-logs-export-btn"
            onClick={handleExportLogs}
            title="Export Logs (Download as text file)"
            aria-label="Export Logs"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 hover:text-indigo-300 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs cursor-pointer group"
          >
            {exported ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 transition-colors" />
            )}
            <span className="hidden sm:inline font-mono">{exported ? 'Exported' : 'Export Logs'}</span>
          </button>

          {/* Expand to Full Docker Tab */}
          <button
            onClick={() => onNavigateTab('docker')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-indigo-500/20"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Terminal</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div 
        ref={terminalContainerRef}
        className="p-4 bg-slate-950 font-mono text-xs overflow-y-auto max-h-72 sm:max-h-80 space-y-1.5 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Terminal className="w-8 h-8 text-slate-700 animate-pulse" />
            {logs.length === 0 ? (
              <>
                <p className="text-slate-300 font-medium">
                  Display buffer cleared for <strong className="text-indigo-400">{agent.containerName || agent.id}</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  {isLive
                    ? 'Fresh monitoring session active — waiting for new incoming log events...'
                    : 'Stream paused. Click Resume or Refresh to fetch logs.'}
                </p>
              </>
            ) : (
              <>
                <p>
                  No {logLevel !== 'All' ? `[${logLevel.toUpperCase()}]` : ''} log entries match{' '}
                  {searchQuery ? `"${searchQuery}"` : 'current filters'} for <strong className="text-slate-400">{agent.id}</strong>.
                </p>
                <p className="text-[11px] text-slate-600">Try adjusting your log level filter or search term.</p>
              </>
            )}
          </div>
        ) : (
          filteredLogs.map((line, index) => (
            <div key={index} className={`leading-relaxed py-0.5 whitespace-pre-wrap break-all ${getLogColor(line)}`}>
              <span className="text-slate-600 select-none mr-3 text-[10px]">{String(index + 1).padStart(3, '0')}</span>
              {renderHighlightedLine(line)}
            </div>
          ))
        )}
      </div>

      {/* Widget Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span>
            Endpoint: <code className="text-indigo-300">/api/agents/{agent.id}/logs</code>{' '}
            <span className={autoRefresh ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              ({autoRefresh ? `Auto-refresh: ${refreshInterval}s` : 'Auto-refresh: Paused'})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Auto-refresh</span>
            <button
              type="button"
              id="live-logs-footer-auto-refresh-switch"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Pause auto-refresh' : 'Enable auto-refresh'}
              className={`w-8 h-4 rounded-full transition-colors relative p-0.5 cursor-pointer ${autoRefresh ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span>Auto-scroll</span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`w-8 h-4 rounded-full transition-colors relative p-0.5 cursor-pointer ${autoScroll ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoScroll ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
