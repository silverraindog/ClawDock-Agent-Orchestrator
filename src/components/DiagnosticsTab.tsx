import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  Server,
  Terminal,
  Copy,
  Check,
  Filter,
  Play,
  Pause,
  Code
} from 'lucide-react';

interface ServerRequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  pathname: string;
  status: number;
  durationMs?: number;
  clientIp?: string;
}

interface ProblematicRouteTest {
  id: string;
  title: string;
  method: 'GET' | 'POST';
  endpoint: string;
  status: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  rawBody: string;
  timestamp: string;
}

export const DiagnosticsTab: React.FC = () => {
  // Real-time server request logs state from /api/diagnostics/request-logs
  const [serverLogs, setServerLogs] = useState<ServerRequestLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Problematic routes probe state
  const [isProbing, setIsProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<ProblematicRouteTest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedBodyId, setExpandedBodyId] = useState<string | null>(null);

  // Fetch real-time server request logs from /api/diagnostics/request-logs
  const fetchServerRequestLogs = async () => {
    setIsLogsLoading(true);
    try {
      const res = await fetch('/api/diagnostics/request-logs');
      if (res.ok) {
        const data = await res.json();
        if (data && data.logs) {
          setServerLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch server request logs:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerRequestLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchServerRequestLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Run comprehensive probe on problematic routes (/api/state and docker-exec-config)
  const runProblematicRoutesProbe = async () => {
    setIsProbing(true);

    const testDefinitions: Array<{ title: string; method: 'GET' | 'POST'; endpoint: string; body?: any }> = [
      { title: 'Agent Runtime State (GET)', method: 'GET', endpoint: '/api/state' },
      { title: 'Agent Runtime State (POST Ping)', method: 'POST', endpoint: '/api/state', body: {} },
      { title: 'Hermes Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/hermes-agent/docker-exec-config' },
      { title: 'Hermes Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/hermes-agent/docker-exec-config' },
      { title: 'ZeroClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/zeroclaw/docker-exec-config' },
      { title: 'ZeroClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/zeroclaw/docker-exec-config' },
      { title: 'OpenClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/openclaw/docker-exec-config' },
      { title: 'OpenClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/openclaw/docker-exec-config' },
      { title: 'PicoClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/picoclaw/docker-exec-config' },
      { title: 'PicoClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/picoclaw/docker-exec-config' }
    ];

    const results: ProblematicRouteTest[] = [];

    for (const test of testDefinitions) {
      const start = performance.now();
      try {
        const options: RequestInit = {
          method: test.method,
          headers: test.body ? { 'Content-Type': 'application/json' } : undefined,
          body: test.body ? JSON.stringify(test.body) : undefined
        };

        const res = await fetch(test.endpoint, options);
        const durationMs = Math.round(performance.now() - start);
        const text = await res.text();

        results.push({
          id: `${test.method}_${test.endpoint}_${Date.now()}`,
          title: test.title,
          method: test.method,
          endpoint: test.endpoint,
          status: res.status,
          statusText: res.statusText || (res.status === 200 ? 'OK' : res.status === 404 ? 'Not Found' : res.status === 405 ? 'Method Not Allowed' : ''),
          ok: res.ok,
          durationMs,
          rawBody: text,
          timestamp: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - start);
        results.push({
          id: `${test.method}_${test.endpoint}_${Date.now()}`,
          title: test.title,
          method: test.method,
          endpoint: test.endpoint,
          status: 0,
          statusText: 'Network Error',
          ok: false,
          durationMs,
          rawBody: JSON.stringify({ error: err.message || 'Fetch request failed' }, null, 2),
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    setProbeResults(results);
    setIsProbing(false);
    // Refresh server logs immediately so new probe requests appear in real-time request logs table
    fetchServerRequestLogs();
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered server logs
  const filteredServerLogs = useMemo(() => {
    return serverLogs.filter((log) => {
      if (logFilter === 'errors' && log.status < 400) return false;
      if (logFilter === 'state' && !log.url.includes('/api/state')) return false;
      if (logFilter === 'docker-exec' && !log.url.includes('docker-exec-config')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.url.toLowerCase().includes(q) ||
          log.method.toLowerCase().includes(q) ||
          String(log.status).includes(q)
        );
      }
      return true;
    });
  }, [serverLogs, logFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header card with action controls */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                API Diagnostics &amp; Route Inspector
              </h2>
              <p className="text-xs text-slate-400">
                Verify connectivity for problematic endpoints (<code className="text-indigo-300">/api/state</code> &amp; <code className="text-indigo-300">docker-exec-config</code>) and monitor real-time server request logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={runProblematicRoutesProbe}
            disabled={isProbing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-60"
          >
            <Terminal className={`w-4 h-4 ${isProbing ? 'animate-pulse text-indigo-200' : ''}`} />
            {isProbing ? 'Probing Routes...' : 'Probe Problematic Routes'}
          </button>

          <button
            onClick={fetchServerRequestLogs}
            disabled={isLogsLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLogsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {autoRefresh ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Problematic Routes Probe Results Card */}
      {probeResults.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Problematic Routes Connectivity Results</h3>
                <p className="text-xs text-slate-400">
                  Direct HTTP probe test of <code className="text-indigo-300">/api/state</code> and <code className="text-indigo-300">/api/agents/:id/docker-exec-config</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                {probeResults.filter((r) => r.ok).length} Successful
              </span>
              {probeResults.filter((r) => !r.ok).length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                  {probeResults.filter((r) => !r.ok).length} Failed
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {probeResults.map((test) => {
              const is2xx = test.status >= 200 && test.status < 300;
              const is404 = test.status === 404;
              const is405 = test.status === 405;
              const isExpanded = expandedBodyId === test.id;

              return (
                <div
                  key={test.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            test.method === 'GET'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {test.method}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{test.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-500">{test.durationMs}ms</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold flex items-center gap-1 ${
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
                          {test.status} {test.statusText}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-indigo-300/80 truncate">
                      {test.endpoint}
                    </div>
                  </div>

                  {/* Raw Response Status & Body Card */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Code className="w-3 h-3 text-slate-500" />
                        Raw Response Body
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(test.id, test.rawBody)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                          title="Copy raw body to clipboard"
                        >
                          {copiedId === test.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setExpandedBodyId(isExpanded ? null : test.id)}
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>

                    <pre
                      className={`p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto transition-all ${
                        isExpanded ? 'max-h-64' : 'max-h-20'
                      }`}
                    >
                      {test.rawBody || '<Empty response body>'}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Request Logs Section (via /api/diagnostics/request-logs) */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Real-Time Server Request Logs ({serverLogs.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live HTTP stream captured by backend API router (<code className="text-indigo-300">/api/diagnostics/request-logs</code>)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-1 text-xs">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded ${
                  logFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({serverLogs.length})
              </button>
              <button
                onClick={() => setLogFilter('errors')}
                className={`px-2 py-0.5 rounded ${
                  logFilter === 'errors' ? 'bg-red-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Errors ({serverLogs.filter((l) => l.status >= 400).length})
              </button>
              <button
                onClick={() => setLogFilter('state')}
                className={`px-2 py-0.5 rounded ${
                  logFilter === 'state' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                /api/state
              </button>
              <button
                onClick={() => setLogFilter('docker-exec')}
                className={`px-2 py-0.5 rounded ${
                  logFilter === 'docker-exec' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                docker-exec
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36"
              />
            </div>
          </div>
        </div>

        {filteredServerLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            {serverLogs.length === 0
              ? 'No API requests recorded yet. Click "Probe Problematic Routes" or interact with the app.'
              : 'No requests match the current filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Exact Route Path</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">Client IP</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredServerLogs.map((log) => {
                  const isSuccess = log.status >= 200 && log.status < 300;
                  const is405 = log.status === 405;
                  const is404 = log.status === 404;
                  const is500 = log.status >= 500;

                  return (
                    <tr key={log.id || `${log.method}_${log.url}_${log.timestamp}`} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'GET'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : log.method === 'POST'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : log.method === 'PUT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-indigo-300 font-medium">{log.pathname || log.url}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : is405
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : is404
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {log.status} {log.status === 200 ? 'OK' : log.status === 404 ? 'Not Found' : log.status === 405 ? 'Method Not Allowed' : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {log.durationMs !== undefined ? `${log.durationMs}ms` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{log.clientIp || '127.0.0.1'}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
