import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';

export interface ServerRequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  pathname?: string;
  status: number;
  statusCode?: number;
  durationMs?: number;
  clientIp?: string;
}

export type SortField = 'timestamp' | 'method' | 'path' | 'status' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface RequestLogsTableProps {
  logs?: ServerRequestLog[];
  isLoading?: boolean;
  onRefreshTriggered?: () => void;
  className?: string;
}

export const RequestLogsTable: React.FC<RequestLogsTableProps> = ({
  logs: externalLogs,
  isLoading: externalLoading = false,
  onRefreshTriggered,
  className = ''
}) => {
  const [internalLogs, setInternalLogs] = useState<ServerRequestLog[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | '2xx' | '3xx' | '4xx' | '5xx'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [lastFetchedTime, setLastFetchedTime] = useState<string>('');
  const [pollCount, setPollCount] = useState<number>(0);

  const isControlled = Array.isArray(externalLogs);
  const rawLogs = isControlled ? externalLogs : internalLogs;
  const isLoading = isControlled ? externalLoading : internalLoading;

  // Standalone fetch when not controlled by parent component
  const fetchRequestLogs = async (isManualClick: boolean = false) => {
    if (isControlled) {
      if (onRefreshTriggered) {
        onRefreshTriggered();
      }
      return;
    }

    setInternalLoading(true);
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
          setInternalLogs(data.logs);
        }
        setLastFetchedTime(new Date().toLocaleTimeString());
        setPollCount((prev) => prev + 1);
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
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (isControlled) return;

    fetchRequestLogs(false);
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchRequestLogs(false), 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, isControlled]);

  // Restrict to the last 50 recorded API requests from serverRequestLogs
  const recent50Logs = useMemo(() => {
    return rawLogs.slice(0, 50);
  }, [rawLogs]);

  // Filtering by status code and search query
  const filteredLogs = useMemo(() => {
    return recent50Logs.filter((log) => {
      const status = log.status ?? log.statusCode ?? 200;
      if (statusFilter === '2xx' && (status < 200 || status >= 300)) return false;
      if (statusFilter === '3xx' && (status < 300 || status >= 400)) return false;
      if (statusFilter === '4xx' && (status < 400 || status >= 500)) return false;
      if (statusFilter === '5xx' && status < 500) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const path = (log.pathname || log.url || '').toLowerCase();
        const method = (log.method || '').toLowerCase();
        const statusStr = String(status);
        const ip = (log.clientIp || '').toLowerCase();
        const durationStr = `${log.durationMs ?? 0}ms`;

        return (
          path.includes(q) ||
          method.includes(q) ||
          statusStr.includes(q) ||
          ip.includes(q) ||
          durationStr.includes(q)
        );
      }
      return true;
    });
  }, [recent50Logs, statusFilter, searchQuery]);

  // Sorting logic across Timestamp, Method, Path, Status Code, and Duration
  const sortedLogs = useMemo(() => {
    const result = [...filteredLogs];
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'timestamp') {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        cmp = (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      } else if (sortField === 'method') {
        cmp = (a.method || '').localeCompare(b.method || '');
      } else if (sortField === 'path') {
        const pathA = a.pathname || a.url || '';
        const pathB = b.pathname || b.url || '';
        cmp = pathA.localeCompare(pathB);
      } else if (sortField === 'status') {
        const statusA = a.status ?? a.statusCode ?? 200;
        const statusB = b.status ?? b.statusCode ?? 200;
        cmp = statusA - statusB;
      } else if (sortField === 'duration') {
        const durA = a.durationMs ?? 0;
        const durB = b.durationMs ?? 0;
        cmp = durA - durB;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredLogs, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'timestamp' || field === 'duration' ? 'desc' : 'asc');
    }
  };

  const resetSort = () => {
    setSortField('timestamp');
    setSortDirection('desc');
  };

  const exportLogsAsJson = () => {
    const jsonStr = JSON.stringify(recent50Logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-request-logs-last-50-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortHeader = (label: string, field: SortField, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2.5 px-3.5 font-semibold cursor-pointer select-none transition-colors group ${
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
        } ${isSorted ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
        title={`Click to sort by ${label} (${isSorted && sortDirection === 'asc' ? 'descending' : 'ascending'})`}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <span className={`transition-opacity ${isSorted ? 'opacity-100 text-indigo-400' : 'opacity-40 group-hover:opacity-80'}`}>
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4 shadow-xl ${className}`}>
      {/* Header with Title and Control Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Last 50 Recorded API Requests
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              {recent50Logs.length} of 50 Requests
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log from <code className="text-indigo-300 font-mono text-[11px]">serverRequestLogs</code>. Click any column header to sort by Timestamp, Method, Path, Status Code, or Duration.
            {lastFetchedTime && <span className="ml-2 text-slate-500">• Last synced {lastFetchedTime}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="refresh-request-logs-btn"
            onClick={() => fetchRequestLogs(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
            title="Refresh logs from /api/diagnostics/request-logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Fetching...' : 'Refresh Logs'}
          </button>

          {!isControlled && (
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
          )}

          <button
            id="export-request-logs-btn"
            onClick={exportLogsAsJson}
            disabled={recent50Logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
            title="Download last 50 request logs as JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Active Sort Pill */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Status Code Filter Buttons */}
        <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-1 text-xs overflow-x-auto">
          {(['all', '2xx', '3xx', '4xx', '5xx'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors whitespace-nowrap ${
                statusFilter === filterKey
                  ? 'bg-indigo-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>

        {/* Sort Status & Search Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Sort Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 font-mono text-[10px]">SORT:</span>
            <span className="text-indigo-400 font-semibold capitalize font-mono text-[11px]">
              {sortField} ({sortDirection.toUpperCase()})
            </span>
            {(sortField !== 'timestamp' || sortDirection !== 'desc') && (
              <button
                onClick={resetSort}
                title="Reset to default sort (Timestamp Descending)"
                className="ml-1 p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search path, method, status, duration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Sortable Table View */}
      {sortedLogs.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-slate-800/80 bg-slate-950/60 text-slate-500 text-xs">
          {recent50Logs.length === 0
            ? 'No server requests logged yet. Trigger an API request or click "Probe Problematic Routes" above.'
            : 'No requests match the selected filter or search term.'}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
              <tr className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                {renderSortHeader('Timestamp', 'timestamp', 'left')}
                {renderSortHeader('Method', 'method', 'left')}
                {renderSortHeader('Path', 'path', 'left')}
                {renderSortHeader('Status Code', 'status', 'center')}
                {renderSortHeader('Duration', 'duration', 'right')}
                <th className="py-2.5 px-3.5 font-semibold text-right">Client IP</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedLogs.map((log) => {
                const status = log.status ?? log.statusCode ?? 200;
                const is2xx = status >= 200 && status < 300;
                const is3xx = status >= 300 && status < 400;
                const is4xx = status >= 400 && status < 500;
                const is5xx = status >= 500;
                const duration = log.durationMs ?? 0;
                const rowKey = log.id || `${log.method}_${log.url}_${log.timestamp}`;
                const isExpanded = expandedLogId === rowKey;

                const date = new Date(log.timestamp);
                const formattedTime = isNaN(date.getTime())
                  ? log.timestamp
                  : date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : rowKey)}
                      className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      {/* 1. Timestamp */}
                      <td className="py-2 px-3.5 text-slate-300 text-[11px] tabular-nums whitespace-nowrap" title={log.timestamp}>
                        {formattedTime}
                      </td>

                      {/* 2. Method */}
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

                      {/* 3. Path */}
                      <td className="py-2 px-3.5 text-indigo-300 font-medium max-w-[280px] truncate" title={log.url}>
                        {log.pathname || log.url}
                      </td>

                      {/* 4. Status Code */}
                      <td className="py-2 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            is2xx
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : is3xx
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : is4xx
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : is5xx
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {is2xx ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : is4xx ? (
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400" />
                          )}
                          {status}
                        </span>
                      </td>

                      {/* 5. Duration */}
                      <td className="py-2 px-3.5 text-right font-semibold">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] tabular-nums ${
                            duration < 30
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : duration < 100
                              ? 'text-sky-300 bg-sky-500/10 border border-sky-500/20'
                              : 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                          }`}
                        >
                          {duration}ms
                        </span>
                      </td>

                      {/* Client IP */}
                      <td className="py-2 px-3.5 text-right text-slate-500 text-[11px] tabular-nums">
                        {log.clientIp || '127.0.0.1'}
                      </td>

                      {/* Details toggle */}
                      <td className="py-2 px-3.5 text-right text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 inline text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 inline text-slate-600" />
                        )}
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
                              <div><span className="text-slate-500">Duration (durationMs):</span> {duration}ms</div>
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
