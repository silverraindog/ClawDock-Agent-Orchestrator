import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Check,
  Search,
  Maximize2,
  Radio
} from 'lucide-react';
import { AgentInfo } from '../types';

interface LiveLogsWidgetProps {
  agent: AgentInfo;
  onNavigateTab: (tab: string) => void;
}

export const LiveLogsWidget: React.FC<LiveLogsWidgetProps> = ({
  agent,
  onNavigateTab
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(false); // Default false to prevent unwanted page scrolling
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Fetch logs from /api/agents/:id/logs at 3-second interval
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/agents/${agent.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error(`[LiveLogsWidget] Failed to fetch logs for ${agent.id}:`, err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [agent.id, isLive]);

  // Auto scroll container only without affecting page scroll
  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = (logs || []).filter(line => 
    !searchQuery || line.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLogs = () => {
    navigator.clipboard.writeText((logs || []).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      id="live-logs-widget"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col"
    >
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Docker Logs
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isLive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <Radio className={`w-2.5 h-2.5 ${isLive ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
                {isLive ? 'Streaming (3s)' : 'Paused'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Container: <span className="text-slate-200">{agent.containerName || agent.id}</span> • {filteredLogs.length} entries {lastUpdated && `(Updated ${lastUpdated})`}
            </p>
          </div>
        </div>

        {/* Widget Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48 font-mono"
            />
          </div>

          {/* Pause/Resume Toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            title={isLive ? 'Pause Live Stream' : 'Resume Live Stream'}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isLive
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isLive ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchLogs}
            title="Refresh Logs"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            title="Copy All Logs"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
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
            <p>No container log entries found for <strong className="text-slate-400">{agent.id}</strong>.</p>
            <p className="text-[11px] text-slate-600">Make sure the container is running and generating output.</p>
          </div>
        ) : (
          filteredLogs.map((line, index) => (
            <div key={index} className={`leading-relaxed py-0.5 whitespace-pre-wrap break-all ${getLogColor(line)}`}>
              <span className="text-slate-600 select-none mr-3 text-[10px]">{String(index + 1).padStart(3, '0')}</span>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Widget Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Endpoint: <code className="text-indigo-300">/api/agents/{agent.id}/logs</code> (Poll 3s)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Auto-scroll</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${autoScroll ? 'bg-indigo-600' : 'bg-slate-700'}`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoScroll ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
