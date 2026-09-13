import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Download,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface ServerRequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  pathname: string;
  status: number;
  durationMs?: number;
  clientIp?: string;
  statusCode?: number;
}

interface RequestLogsTableProps {
  onRefreshTriggered?: () => void;
  className?: string;
}

export const RequestLogsTable: React.FC<RequestLogsTableProps> = ({
  onRefreshTriggered,
  className = ''
}) => {
  const [logs, setLogs] = useState<ServerRequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'errors' | 'state' | 'docker-exec' | 'success'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [lastFetchedTime, setLastFetchedTime] = useState<string>('');

  // Call /api/diagnostics/request-logs endpoint
  const fetchRequestLogs = async (isManualClick: boolean = false) => {
    setIsLoading(true);
    const endpoint = '/api/diagnostics/request-logs';
    const method = 'GET';

    if (isManualClick) {
      console.log('[RequestLogsTable] Request Payload:', {
        endpoint,
        method,
        headers: { Accept: 'application/json' },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' }
      });

      if (isManualClick) {
        console.log('[RequestLogsTable] Response Status:', res.status, res.statusText, 'for', endpoint);
      }

      if (res.ok) {
        const data = await res.json();

        if (isManualClick) {
          console.log('[RequestLogsTable] Full JSON Body:', data);
        }

        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
        setLastFetchedTime(new Date().toLocaleTimeString());
        if (onRefreshTriggered) {
          onRefreshTriggered();
        }
      } else {
        const errText = await res.text();
        console.error('[RequestLogsTable] Error Response Body:', errText);
      }
    } catch (err: any) {
      console.error('[RequestLogsTable] Network/Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestLogs(false);
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchRequestLogs(false), 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filtering and searching logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const status = log.status || log.statusCode || 200;
      if (filter === 'errors' && status < 400) return false;
      if (filter === 'success' && (status < 200 || status >= 400)) return false;
      if (filter === 'state' && !log.url.includes('/api/state')) return false;
      if (filter === 'docker-exec' && !log.url.includes('docker-exec-config')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.url.toLowerCase().includes(q) ||
          log.pathname.toLowerCase().includes(q) ||
          log.method.toLowerCase().includes(q) ||
          String(status).includes(q) ||
          (log.clientIp && log.clientIp.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, filter, searchQuery]);

  const exportLogsAsJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-request-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4 shadow-xl ${className}`}>
      {/* Header with Title and Control Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Live Server Request Logs
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              {logs.length} Recorded
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming real-time HTTP audit log via endpoint <code className="text-indigo-300 font-mono">/api/diagnostics/request-logs</code>
            {lastFetchedTime && <span className="ml-2 text-slate-500">• Last synced {lastFetchedTime}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="refresh-request-logs-btn"
            onClick={() => fetchRequestLogs(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
            title="Perform manual GET /api/diagnostics/request-logs and output to console"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Fetching...' : 'Refresh Logs'}
          </button>

          <button
            id="toggle-auto-refresh-logs-btn"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
            title={autoRefresh ? 'Pause 3s polling' : 'Resume 3s polling'}
          >
            {autoRefresh ? <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3 h-3" />}
            {autoRefresh ? 'Live Polling' : 'Paused'}
          </button>

          <button
            id="export-request-logs-btn"
            onClick={exportLogsAsJson}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
            title="Download full request log buffer as JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-1 text-xs overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('errors')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              filter === 'errors' ? 'bg-rose-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Errors ({logs.filter((l) => (l.status || l.statusCode || 200) >= 400).length})
          </button>
          <button
            onClick={() => setFilter('state')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              filter === 'state' ? 'bg-sky-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            /api/state ({logs.filter((l) => l.url.includes('/api/state')).length})
          </button>
          <button
            onClick={() => setFilter('docker-exec')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              filter === 'docker-exec' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            docker-exec ({logs.filter((l) => l.url.includes('docker-exec-config')).length})
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              filter === 'success' ? 'bg-emerald-700 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2xx OK ({logs.filter((l) => (l.status || l.statusCode || 200) >= 200 && (l.status || l.statusCode || 200) < 300).length})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search method, route, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Scrollable Table View */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-slate-800/80 bg-slate-950/60 text-slate-500 text-xs">
          {logs.length === 0
            ? 'No server requests logged yet. Trigger an API request or click "Probe Problematic Routes" above.'
            : 'No requests match the selected filter or search term.'}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
              <tr className="text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3.5 font-semibold">Method</th>
                <th className="py-2.5 px-3.5 font-semibold">Route Path</th>
                <th className="py-2.5 px-3.5 font-semibold">Status Code</th>
                <th className="py-2.5 px-3.5 font-semibold">Duration</th>
                <th className="py-2.5 px-3.5 font-semibold">Client IP</th>
                <th className="py-2.5 px-3.5 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => {
                const status = log.status || log.statusCode || 200;
                const is2xx = status >= 200 && status < 300;
                const is405 = status === 405;
                const is404 = status === 404;
                const is500 = status >= 500;
                const isExpanded = expandedLogId === (log.id || `${log.method}_${log.url}_${log.timestamp}`);

                return (
                  <React.Fragment key={log.id || `${log.method}_${log.url}_${log.timestamp}`}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : (log.id || `${log.method}_${log.url}_${log.timestamp}`))}
                      className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3.5 font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'GET'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : log.method === 'POST'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : log.method === 'PUT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.method === 'DELETE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-slate-200 font-medium max-w-[280px] truncate" title={log.url}>
                        <span className="text-indigo-300">{log.pathname || log.url}</span>
                      </td>
                      <td className="py-2 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            is2xx
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : is405
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : is404
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {is2xx ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : is405 ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {status} {status === 200 ? 'OK' : status === 404 ? 'Not Found' : status === 405 ? 'Method Not Allowed' : status === 500 ? 'Internal Error' : ''}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-slate-400 text-[11px]">
                        {log.durationMs !== undefined ? `${log.durationMs}ms` : '<1ms'}
                      </td>
                      <td className="py-2 px-3.5 text-slate-500 text-[11px]">{log.clientIp || '127.0.0.1'}</td>
                      <td className="py-2 px-3.5 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-400">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 inline text-slate-600" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-900/70 border-b border-slate-800">
                        <td colSpan={7} className="p-3">
                          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                              <span className="text-indigo-400 font-bold">Request Log ID: {log.id || 'N/A'}</span>
                              <span>Full Timestamp: {log.timestamp}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
                              <div><span className="text-slate-500">Method:</span> {log.method}</div>
                              <div><span className="text-slate-500">Status Code:</span> {status}</div>
                              <div><span className="text-slate-500">Full URL:</span> {log.url}</div>
                              <div><span className="text-slate-500">Pathname:</span> {log.pathname || log.url}</div>
                              <div><span className="text-slate-500">Duration:</span> {log.durationMs || 0}ms</div>
                              <div><span className="text-slate-500">Client IP:</span> {log.clientIp || '127.0.0.1'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
