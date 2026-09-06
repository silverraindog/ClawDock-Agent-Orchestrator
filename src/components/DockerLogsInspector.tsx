import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Pause, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  ArrowDown, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AgentId } from '../types';

interface DockerLogsInspectorProps {
  agentId: AgentId;
  agentName: string;
  containerId?: string;
  isContainerRunning?: boolean;
  onAddToast?: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

type LogLevel = 'all' | 'error' | 'warn' | 'info' | 'docker';

export const DockerLogsInspector: React.FC<DockerLogsInspectorProps> = ({
  agentId,
  agentName,
  containerId,
  isContainerRunning = true,
  onAddToast
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000);
  const [filterText, setFilterText] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<string>('');
  const [fetchLatencyMs, setFetchLatencyMs] = useState<number | null>(null);

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsLoading(true);
    const start = performance.now();
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/agents/${agentId}/logs?t=${timestamp}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      const elapsed = Math.round(performance.now() - start);
      setFetchLatencyMs(elapsed);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setLastFetchedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err: any) {
      if (isManual && onAddToast) {
        onAddToast('error', 'Log Fetch Failed', `Could not reach logs endpoint: ${err?.message || 'Error'}`);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Initial fetch and polling loop
  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs(true);

    let intervalId: any = null;
    if (isPolling) {
      intervalId = setInterval(() => {
        fetchLogs(false);
      }, pollIntervalMs);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [agentId, isPolling, pollIntervalMs]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Categorize log line severity
  const getLogSeverity = (log: string): 'error' | 'warn' | 'info' | 'docker' | 'normal' => {
    const l = log.toLowerCase();
    if (l.includes('error') || l.includes('fatal') || l.includes('exception') || l.includes('fail')) return 'error';
    if (l.includes('warn') || l.includes('warning')) return 'warn';
    if (l.includes('docker') || l.includes('engine') || l.includes('container')) return 'docker';
    if (l.includes('info') || l.includes('starting') || l.includes('ready') || l.includes('listening')) return 'info';
    return 'normal';
  };

  // Filter logs based on search text and level filter
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = filterText === '' || log.toLowerCase().includes(filterText.toLowerCase());
    if (!matchesSearch) return false;

    if (levelFilter === 'all') return true;
    const severity = getLogSeverity(log);
    if (levelFilter === 'error') return severity === 'error';
    if (levelFilter === 'warn') return severity === 'warn';
    if (levelFilter === 'info') return severity === 'info';
    if (levelFilter === 'docker') return severity === 'docker';
    return true;
  });

  const handleCopyLogs = () => {
    const textToCopy = filteredLogs.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (onAddToast) onAddToast('info', 'Logs Copied', `${filteredLogs.length} log lines copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const content = filteredLogs.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agentId}-docker-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onAddToast) onAddToast('success', 'Logs Exported', `Saved log snapshot to disk.`);
  };

  const handleClearLogs = () => {
    setLogs([]);
    if (onAddToast) onAddToast('info', 'View Cleared', 'Log view cleared. New logs will appear on next poll.');
  };

  // Counts for badge metrics
  const errorCount = logs.filter(l => getLogSeverity(l) === 'error').length;
  const warnCount = logs.filter(l => getLogSeverity(l) === 'warn').length;

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md' : 'flex flex-col'
    }`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Docker Live Logs Inspector
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                {agentName}
              </span>
              {isContainerRunning ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Container Stream
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Container Inactive
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              GET /api/agents/{agentId}/logs
              {containerId && <span className="ml-2 text-slate-500">[{containerId.slice(0, 12)}]</span>}
              {fetchLatencyMs !== null && (
                <span className="ml-2 text-emerald-400/90">({fetchLatencyMs}ms)</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Polling Toggle */}
          <button
            id="docker-logs-pause-resume-btn"
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isPolling
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title={isPolling ? 'Pause background polling' : 'Resume background polling'}
          >
            {isPolling ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Pause className="w-3 h-3" />
                <span className="hidden sm:inline">Streaming</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Paused</span>
              </>
            )}
          </button>

          {/* Polling Interval Select */}
          <select
            id="docker-logs-poll-interval"
            value={pollIntervalMs}
            onChange={(e) => setPollIntervalMs(Number(e.target.value))}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
            title="Polling frequency"
          >
            <option value={1000}>1s poll</option>
            <option value={2000}>2s poll</option>
            <option value={3000}>3s poll</option>
            <option value={5000}>5s poll</option>
            <option value={10000}>10s poll</option>
          </select>

          {/* Force Refresh */}
          <button
            id="docker-logs-refresh-now"
            onClick={() => fetchLogs(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 text-xs font-medium"
            title="Fetch logs from /api/agents/:agentId/logs now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Auto-scroll toggle */}
          <button
            id="docker-logs-autoscroll-toggle"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              autoScroll 
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy Logs */}
          <button
            id="docker-logs-copy-btn"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Copy visible logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Logs */}
          <button
            id="docker-logs-download-btn"
            onClick={handleDownloadLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download log file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear logs view */}
          <button
            id="docker-logs-clear-btn"
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
            title="Clear current view"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="docker-logs-fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors hidden sm:inline-flex"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            id="docker-logs-search-input"
            type="text"
            placeholder="Search container logs (e.g. error, port, exec)..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Severity Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              levelFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({logs.length})
          </button>

          <button
            onClick={() => setLevelFilter('error')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              levelFilter === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-rose-400 hover:bg-rose-950/30'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Errors ({errorCount})
          </button>

          <button
            onClick={() => setLevelFilter('warn')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              levelFilter === 'warn'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-amber-400 hover:bg-amber-950/30'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Warnings ({warnCount})
          </button>

          <button
            onClick={() => setLevelFilter('docker')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              levelFilter === 'docker'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-cyan-400 hover:bg-cyan-950/30'
            }`}
          >
            Engine
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        ref={logsContainerRef}
        id="docker-logs-console-window"
        className={`bg-slate-950 font-mono text-xs text-slate-300 p-4 overflow-y-auto leading-relaxed select-text ${
          isFullscreen ? 'flex-1 min-h-[400px]' : 'h-80 max-h-96'
        }`}
      >
        {filteredLogs.length > 0 ? (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => {
              const severity = getLogSeverity(log);
              return (
                <div 
                  key={idx} 
                  className={`group flex items-start gap-2 px-1.5 py-0.5 rounded hover:bg-slate-900/60 transition-colors font-mono ${
                    severity === 'error'
                      ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500 pl-2'
                      : severity === 'warn'
                      ? 'bg-amber-950/20 text-amber-300 border-l-2 border-amber-500 pl-2'
                      : severity === 'docker'
                      ? 'text-cyan-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 select-none text-[10px] w-8 text-right shrink-0 pt-0.5">
                    {idx + 1}
                  </span>

                  <span className="break-all whitespace-pre-wrap flex-1">
                    {log}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-500">
            <Terminal className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
            <p className="text-sm font-medium text-slate-400">No logs found matching your filter criteria.</p>
            <p className="text-xs text-slate-600 mt-1">
              Container is active and polling `/api/agents/{agentId}/logs`.
            </p>
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="mt-3 px-3 py-1 rounded-md bg-slate-800 text-indigo-300 text-xs font-sans hover:bg-slate-700 transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Total: <strong className="text-slate-300">{logs.length}</strong> lines</span>
          <span>Showing: <strong className="text-indigo-300">{filteredLogs.length}</strong></span>
          {lastFetchedTime && (
            <span className="hidden sm:inline flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              Last polled: {lastFetchedTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {isPolling ? `Auto-polling every ${pollIntervalMs / 1000}s` : 'Polling paused'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
      </div>
    </div>
  );
};
