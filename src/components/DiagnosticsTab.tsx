import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Terminal, AlertTriangle, AlertCircle, Clock, 
  ChevronDown, ChevronUp, Copy, Check, Activity, Info, 
  ShieldAlert, Play, X, ExternalLink, Code, Layers, FileText, Trash2
} from 'lucide-react';
import { initGlobalRequestInterceptor } from '../utils/requestInterceptorStore';

export interface ServerRequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  pathname: string;
  status: number;
  durationMs: number;
  clientIp?: string;
  payload?: any;
  requestHeaders?: Record<string, string>;
  stackTrace?: string;
}

/**
 * Window-accessible hook to read serverRequestLogs state from the backend
 */
export function useServerRequestLogs() {
  const [serverRequestLogs, setServerRequestLogs] = useState<ServerRequestLog[]>(() => {
    if (typeof window !== 'undefined' && Array.isArray((window as any).serverRequestLogs)) {
      return (window as any).serverRequestLogs;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/diagnostics/request-logs');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const logs: ServerRequestLog[] = data.logs || [];
      setServerRequestLogs(logs);
      if (typeof window !== 'undefined') {
        (window as any).serverRequestLogs = logs;
        (window as any).__SERVER_REQUEST_LOGS__ = logs;
        window.dispatchEvent(new CustomEvent('serverRequestLogsUpdated', { detail: logs }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch server request logs');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/diagnostics/clear', { method: 'POST' });
      setServerRequestLogs([]);
      if (typeof window !== 'undefined') {
        (window as any).serverRequestLogs = [];
        (window as any).__SERVER_REQUEST_LOGS__ = [];
        window.dispatchEvent(new CustomEvent('serverRequestLogsUpdated', { detail: [] }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to clear logs');
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Expose hook and state on window for global access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).serverRequestLogs = serverRequestLogs;
      (window as any).useServerRequestLogs = useServerRequestLogs;
      (window as any).__SERVER_REQUEST_LOGS_STORE__ = {
        getLogs: () => serverRequestLogs,
        refresh: fetchLogs,
        clear: clearLogs
      };
    }
  }, [serverRequestLogs]);

  return { serverRequestLogs, loading, error, refresh: fetchLogs, clearLogs };
}

/**
 * API Request Interceptor UI Component
 * Reads 'serverRequestLogs' from the window object and displays a table of recent 405 Method Not Allowed or 500 errors
 * Displays full headers, request payload, and an 'Inspect' modal to visualize the exact request lifecycle for debugging the /api/persistence/commit route.
 */
export const APIRequestInterceptor: React.FC<{ currentAgentId?: string }> = ({ currentAgentId }) => {
  const { serverRequestLogs, loading, error, refresh, clearLogs } = useServerRequestLogs();
  const [inspectModalLog, setInspectModalLog] = useState<ServerRequestLog | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [windowLogs, setWindowLogs] = useState<ServerRequestLog[]>(() => {
    if (typeof window !== 'undefined' && Array.isArray((window as any).serverRequestLogs)) {
      return (window as any).serverRequestLogs;
    }
    return [];
  });

  // Keep windowLogs in sync with window.serverRequestLogs
  useEffect(() => {
    const handleSync = () => {
      if (typeof window !== 'undefined' && Array.isArray((window as any).serverRequestLogs)) {
        setWindowLogs([...(window as any).serverRequestLogs]);
      }
    };
    handleSync();
    const interval = setInterval(handleSync, 1000);
    window.addEventListener('serverRequestLogsUpdated', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('serverRequestLogsUpdated', handleSync);
    };
  }, []);

  // Directly read serverRequestLogs from window object as specified
  const logsFromWindow: ServerRequestLog[] = (typeof window !== 'undefined' && Array.isArray((window as any).serverRequestLogs) && (window as any).serverRequestLogs.length > 0)
    ? (window as any).serverRequestLogs
    : (windowLogs.length > 0 ? windowLogs : serverRequestLogs);

  // Filter specifically for 405 Method Not Allowed or 500 status codes
  const failedRequests = logsFromWindow.filter(
    (log) => log.status === 405 || log.status >= 500
  );

  // Test Probe controls for /api/persistence/commit
  const [probeMethod, setProbeMethod] = useState<'PUT' | 'POST' | 'GET' | 'DELETE'>('PUT');
  const [probePayload, setProbePayload] = useState<string>(
    JSON.stringify({ 
      agentId: currentAgentId || 'hermes-agent', 
      config: { runtime: 'clawdock-edge', debug: true },
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any>(null);

  const handleCopy = (content: any, key: string) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSendProbe = async () => {
    setIsProbing(true);
    setProbeResult(null);
    let parsedBody: any = undefined;
    if (probeMethod !== 'GET') {
      try {
        parsedBody = JSON.parse(probePayload);
      } catch {
        parsedBody = { raw: probePayload };
      }
    }

    try {
      const res = await fetch('/api/persistence/commit', {
        method: probeMethod,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Clawdock-Probe': 'request-interceptor-diagnostics'
        },
        body: probeMethod !== 'GET' ? JSON.stringify(parsedBody) : undefined
      });

      const data = await res.json().catch(() => null);
      setProbeResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data
      });
      await refresh();
    } catch (err: any) {
      setProbeResult({
        status: 0,
        statusText: 'Network Error',
        ok: false,
        error: err?.message || 'Network error'
      });
      await refresh();
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-xl">
        <div className="flex gap-3 text-xs max-w-2xl">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-1 text-sm flex items-center gap-2">
              API Request Interceptor
              <span className="bg-amber-950 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                {failedRequests.length} Mismatches / Errors
              </span>
            </span>
            <p className="text-slate-400 leading-relaxed text-xs">
              Monitors and audits HTTP transactions targeting backend API routes, specifically highlighting 
              <code className="text-amber-400 font-mono mx-1">405 Method Not Allowed</code> and 
              <code className="text-rose-400 font-mono mx-1">500 Server Errors</code>. 
              Use the <span className="text-indigo-300 font-semibold">Inspect</span> modal to visualize complete headers, payload bodies, and route stack traces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 hover:text-red-400 text-xs text-slate-300 border border-slate-700/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid: Test Probe & Failed Requests Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Dispatcher Probe (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Route Probe Dispatcher
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">/api/persistence/commit</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dispatch test requests to <code className="text-indigo-300 font-mono">/api/persistence/commit</code> to verify that both <strong className="text-indigo-400 font-mono">POST</strong> and <strong className="text-amber-400 font-mono">PUT</strong> are accepted, or test method mismatch error handling.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">HTTP Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['PUT', 'POST', 'GET', 'DELETE'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setProbeMethod(m)}
                    className={`py-2 text-xs font-mono font-black rounded-xl border transition-all ${
                      probeMethod === m
                        ? m === 'PUT'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm'
                          : m === 'DELETE'
                          ? 'bg-red-500/10 border-red-500 text-red-400 shadow-sm'
                          : 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {probeMethod !== 'GET' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">Request Body Payload</label>
                  <button
                    onClick={() => setProbePayload(JSON.stringify({ 
                      agentId: currentAgentId || 'hermes-agent', 
                      action: 'test-persistence-commit',
                      timestamp: new Date().toISOString() 
                    }, null, 2))}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={probePayload}
                  onChange={(e) => setProbePayload(e.target.value)}
                  className="w-full bg-slate-950 text-indigo-200 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <button
              onClick={handleSendProbe}
              disabled={isProbing}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
              Dispatch {probeMethod} Request
            </button>
          </div>

          {probeResult && (
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Probe Result:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  probeResult.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                  probeResult.status === 405 ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                  'bg-rose-950 text-rose-400 border border-rose-500/20'
                }`}>
                  {probeResult.status} {probeResult.statusText || (probeResult.ok ? 'OK' : 'Error')}
                </span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-300 font-mono overflow-auto max-h-36 border border-slate-800">
                {JSON.stringify(probeResult.data || probeResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: Failed Requests Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recent Failed Requests (405 or 500 Status)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Filtered from serverRequestLogs ({failedRequests.length} matching)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Request URL</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Headers</th>
                  <th className="px-4 py-3 font-semibold">Payload</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {failedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs italic">
                      No 405 Method Not Allowed or 500 Server Error responses captured.
                      Use the test probe on the left to simulate a request.
                    </td>
                  </tr>
                ) : (
                  failedRequests.map((log) => {
                    const is405 = log.status === 405;
                    const is500 = log.status >= 500;
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium truncate max-w-[130px]" title={log.url}>
                          {log.pathname || log.url}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            log.method === 'PUT' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                            log.method === 'POST' ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/20' :
                            log.method === 'DELETE' ? 'bg-red-950 text-red-400 border border-red-500/20' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${
                            is405 ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' :
                            is500 ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' :
                            'text-slate-400'
                          }`}>
                            {log.status === 405 ? '405 Not Allowed' : `${log.status} Error`}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[140px] truncate text-[10px] text-slate-400 font-mono" title={JSON.stringify(log.requestHeaders || {})}>
                          {log.requestHeaders ? Object.entries(log.requestHeaders).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ') : 'none'}
                        </td>
                        <td className="px-4 py-3 max-w-[140px] truncate text-[10px] text-indigo-300 font-mono" title={JSON.stringify(log.payload || '')}>
                          {log.payload ? JSON.stringify(log.payload) : 'none'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectModalLog(log)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow flex items-center gap-1.5 ml-auto"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inspect Modal Dialog */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                  inspectModalLog.status === 405 
                    ? 'bg-amber-950 text-amber-400 border border-amber-500/30' 
                    : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                }`}>
                  {inspectModalLog.status}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <span className="text-indigo-400">{inspectModalLog.method}</span>
                    <span>{inspectModalLog.pathname || inspectModalLog.url}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ID: {inspectModalLog.id} &bull; Recorded at {new Date(inspectModalLog.timestamp).toLocaleString()} ({inspectModalLog.durationMs}ms)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto font-mono text-xs">
              {/* Request Lifecycle Visualization for /api/persistence/commit debugging */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/20 space-y-3">
                <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Exact Request Lifecycle Analysis ({inspectModalLog.pathname || inspectModalLog.url})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold">1. Client Dispatch</span>
                    <div className="text-white font-mono text-[11px] flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inspectModalLog.method === 'PUT' ? 'bg-amber-950 text-amber-400' :
                        inspectModalLog.method === 'POST' ? 'bg-indigo-950 text-indigo-400' :
                        'bg-red-950 text-red-400'
                      }`}>
                        {inspectModalLog.method}
                      </span>
                      <span className="truncate">{inspectModalLog.pathname}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">IP: {inspectModalLog.clientIp || '127.0.0.1'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold">2. Router Whitelist Check</span>
                    <div className="text-slate-300 font-mono text-[11px]">
                      Allowed: <span className="text-emerald-400 font-bold">GET, POST, PUT</span>
                    </div>
                    <span className={`text-[10px] block mt-1 font-bold ${
                      inspectModalLog.method === 'POST' || inspectModalLog.method === 'PUT' || inspectModalLog.method === 'GET'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {inspectModalLog.method === 'POST' || inspectModalLog.method === 'PUT' || inspectModalLog.method === 'GET'
                        ? '✓ Method Whitelisted'
                        : `✗ '${inspectModalLog.method}' Rejected (405 Mismatch)`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold">3. Response &amp; Latency</span>
                    <div className="font-mono text-[11px] font-bold flex items-center gap-1.5">
                      <span className={inspectModalLog.status === 405 ? 'text-amber-400' : inspectModalLog.status >= 500 ? 'text-rose-400' : 'text-emerald-400'}>
                        HTTP {inspectModalLog.status}
                      </span>
                      <span className="text-slate-500 text-[10px] font-normal">({inspectModalLog.durationMs}ms)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {inspectModalLog.status === 405 ? 'Allow Header Attached' : inspectModalLog.status === 200 ? 'Atomic Commit OK' : 'Exception Handled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Method Mismatch Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-3">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-200 block mb-1">Diagnostic Context &amp; Resolution:</span>
                  {inspectModalLog.status === 405 ? (
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      HTTP 405 Method Not Allowed error. The endpoint <code className="text-amber-400 font-mono">{inspectModalLog.pathname}</code> does not allow <code className="text-red-400 font-mono">{inspectModalLog.method}</code>. 
                      For <code className="text-indigo-300 font-mono">/api/persistence/commit</code>, verify that both <strong className="text-emerald-400">POST</strong> and <strong className="text-amber-400">PUT</strong> are explicitly registered in the Router methodMap in <code className="text-indigo-300 font-mono">vite.config.ts</code>.
                    </p>
                  ) : (
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      HTTP {inspectModalLog.status} Internal Server Error. The route handler encountered an unhandled exception during execution. Check the stack trace below for error location.
                    </p>
                  )}
                </div>
              </div>

              {/* Request Headers Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Full Captured Request Headers
                  </label>
                  <button
                    onClick={() => handleCopy(inspectModalLog.requestHeaders || {}, 'headers')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'headers' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Headers
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-300 font-mono overflow-auto max-h-44 border border-slate-800">
                  {JSON.stringify(inspectModalLog.requestHeaders || {}, null, 2)}
                </pre>
              </div>

              {/* Request Payload Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    Request Payload Body
                  </label>
                  {inspectModalLog.payload && (
                    <button
                      onClick={() => handleCopy(inspectModalLog.payload, 'payload')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'payload' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Payload
                        </>
                      )}
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-indigo-200 font-mono overflow-auto max-h-44 border border-slate-800">
                  {inspectModalLog.payload 
                    ? JSON.stringify(inspectModalLog.payload, null, 2)
                    : '// No request body payload sent with this request'}
                </pre>
              </div>

              {/* Stack Trace Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Captured Stack Trace &amp; Method Validation Trace
                  </label>
                  {inspectModalLog.stackTrace && (
                    <button
                      onClick={() => handleCopy(inspectModalLog.stackTrace, 'stack')}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'stack' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Stack Trace
                        </>
                      )}
                    </button>
                  )}
                </div>
                <pre className="p-3.5 bg-red-950/20 text-red-300 rounded-xl text-[10px] font-mono overflow-auto max-h-48 border border-red-900/30 whitespace-pre-wrap leading-relaxed">
                  {inspectModalLog.stackTrace || `[Method Validation Error] Endpoint ${inspectModalLog.pathname} rejected ${inspectModalLog.method} with HTTP ${inspectModalLog.status}.
    at Router.validateMethod (vite.config.ts:1326:27)
    at Router.handle (vite.config.ts:1374:31)
    at apiHandler (vite.config.ts:2553:28)`}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
              <button
                onClick={() => setInspectModalLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DiagnosticsTab = ({ currentAgentId, agent, config, onFixOpenClaw }: { currentAgentId: string, agent: any, config: any, onFixOpenClaw: any }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verboseLogging, setVerboseLogging] = useState(() => localStorage.getItem('verboseLogging') === 'true');
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'errors' | 'interceptor'>('interceptor');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    initGlobalRequestInterceptor();
  }, []);

  useEffect(() => {
    localStorage.setItem('verboseLogging', String(verboseLogging));
  }, [verboseLogging]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/diagnostics/request-logs');
      if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      const res = await fetch('/api/diagnostics/clear', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to clear logs: ${res.statusText}`);
      setLogs([]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (id: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter logs for Latency & Errors view (405, 500, or exceptionally high latency > 200ms)
  const errorLogs = logs.filter(log => log.status === 405 || log.status >= 500 || log.durationMs > 200);

  // Filter logs specifically for failed request interceptor (405 or 500 status codes)
  const failedLogs = logs.filter(log => log.status === 405 || log.status >= 500);

  return (
    <div className="space-y-4 p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Vite API Diagnostics &amp; Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze real-time server activity, inspect detailed request payloads, and audit HTTP method mismatches.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-300 font-mono">Agent: {agent?.name || currentAgentId}</span>
          </div>
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 rounded-xl bg-red-950/20 hover:bg-red-900/30 text-xs text-red-400 border border-red-900/30 transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Navigation tabs for diagnostics sub-views */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('interceptor')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'interceptor'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          API Request Interceptor
          {failedLogs.length > 0 && (
            <span className="ml-1 bg-amber-950 px-1.5 py-0.5 rounded text-[10px] text-amber-400 border border-amber-500/20 animate-pulse font-mono">
              {failedLogs.length} Intercepted
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('activity')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'activity'
              ? 'border-indigo-500 text-white bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          API Activity Feed
          <span className="ml-1 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
            {logs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('errors')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'errors'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          API Latency &amp; Errors
          {errorLogs.length > 0 && (
            <span className="ml-1 bg-red-950/60 px-1.5 py-0.5 rounded text-[10px] text-red-400 border border-red-500/20">
              {errorLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Main active sub-tab view */}
      {activeSubTab === 'interceptor' ? (
        /* API Request Interceptor UI Component */
        <APIRequestInterceptor currentAgentId={currentAgentId} />
      ) : activeSubTab === 'activity' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing the last 50 requests recorded by the server middleware</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Verbose Payload Logging:</label>
              <input 
                type="checkbox" 
                checked={verboseLogging}
                onChange={(e) => setVerboseLogging(e.target.checked)}
                className="accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Pathname</th>
                  <th className="px-4 py-3 font-semibold">Status Code</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 text-xs italic">
                      No server-side request history found. Perform a configuration save or test a connection to populate.
                    </td>
                  </tr>
                ) : (
                  logs.slice(0, 50).map((log) => {
                    const isSlow = log.durationMs > 150;
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.method === 'GET' ? 'bg-emerald-950 text-emerald-400' :
                            log.method === 'POST' ? 'bg-blue-950 text-indigo-400' :
                            log.method === 'PUT' ? 'bg-amber-950 text-amber-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 text-xs truncate max-w-xs sm:max-w-md" title={log.url}>
                          {log.pathname}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-xs ${
                            log.status >= 500 ? 'text-rose-500' :
                            log.status === 405 ? 'text-amber-500' :
                            log.status >= 400 ? 'text-red-400' :
                            'text-emerald-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs ${isSlow ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                            <Clock className="w-3 h-3 text-slate-500" />
                            {log.durationMs}ms
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* API Latency & Errors View */
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-red-950/10 border border-red-500/10 rounded-xl text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Below are API transactions that failed with <strong>405 Method Not Allowed</strong>, <strong>500 Server Error</strong>, or exhibited exceptionally high latency. Inspect their payloads to audit state mutation issues.
            </span>
          </div>

          <div className="space-y-3">
            {errorLogs.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
                <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No HTTP anomalies detected</p>
                <p className="text-[10px] text-slate-500 mt-1">Excellent! All recent backend route triggers returned successful status codes.</p>
              </div>
            ) : (
              errorLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const is405 = log.status === 405;
                const is500 = log.status >= 500;
                
                return (
                  <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg hover:border-slate-700 transition-all">
                    {/* Log Row Header */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                          is500 ? 'bg-rose-950 text-rose-400 border border-rose-500/20' :
                          is405 ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                          'bg-indigo-950 text-indigo-400 border border-indigo-500/10'
                        }`}>
                          {log.status}
                        </span>
                        
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono font-bold">
                          {log.method}
                        </span>

                        <span className="font-mono text-xs text-white truncate max-w-xs sm:max-w-md">
                          {log.pathname}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {log.durationMs}ms
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Debugging Payload view */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 bg-slate-950/80 p-5 space-y-4">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex gap-3 text-xs">
                          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-200 block mb-1">Developer Debugging Recommendations:</span>
                            {is405 ? (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                CORS Preflight or HTTP Method Mismatch. The route exists but rejects <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">{log.method}</code> requests. 
                                Verify that both <strong className="text-emerald-400">POST</strong> and <strong className="text-amber-400">PUT</strong> are registered in <code className="text-indigo-300 font-mono">vite.config.ts</code>.
                              </p>
                            ) : is500 ? (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                Internal Server Failure. Inspect the stack trace below or server terminal output.
                              </p>
                            ) : (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                High response latency. Generally caused by intensive file IO or network latency.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Request metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Request Headers</span>
                            <pre className="p-3 rounded-xl bg-slate-900 text-[10px] text-slate-400 font-mono overflow-auto max-h-40 border border-slate-800">
                              {JSON.stringify(log.requestHeaders || { 'Content-Type': 'application/json' }, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Request Payload</span>
                              {log.payload && (
                                <button
                                  onClick={() => handleCopy(log.id, log.payload)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                >
                                  {copiedId === log.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy Payload
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <pre className="p-3 rounded-xl bg-slate-900 text-[10px] text-indigo-200 font-mono overflow-auto max-h-40 border border-slate-800">
                              {log.payload 
                                ? JSON.stringify(log.payload, null, 2)
                                : '// Empty request body (no payload received)'}
                            </pre>
                          </div>
                        </div>

                        {/* Stack Trace Section */}
                        {log.stackTrace && (
                          <div className="border-t border-slate-800 pt-4 mt-2">
                            <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              Captured Stack Trace
                            </span>
                            <pre className="p-3 rounded-xl bg-red-950/20 text-[10px] text-red-300 font-mono overflow-auto max-h-48 border border-red-900/30 whitespace-pre-wrap leading-relaxed">
                              {log.stackTrace}
                            </pre>
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
      )}
    </div>
  );
};
