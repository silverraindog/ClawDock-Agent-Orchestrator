import React, { useState, useEffect } from 'react';
import { RefreshCw, Terminal, AlertTriangle, AlertCircle, Clock, ChevronDown, ChevronUp, Copy, Check, Activity, Info, ShieldAlert, Cpu, ArrowRight, Play, Eye, ListFilter } from 'lucide-react';

export const DiagnosticsTab = ({ currentAgentId, agent, config, onFixOpenClaw }: { currentAgentId: string, agent: any, config: any, onFixOpenClaw: any }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verboseLogging, setVerboseLogging] = useState(() => localStorage.getItem('verboseLogging') === 'true');
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'errors' | 'interceptor'>('activity');
  const [expandedLogId, setExpandedExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interceptor sub-tab selected failed request id
  const [selectedFailedLogId, setSelectedFailedLogId] = useState<string | null>(null);

  // Test suite states
  const [testMethod, setTestMethod] = useState<string>('DELETE');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

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

  // Trigger test request
  const handleSendTestRequest = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/persistence/commit', {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Interceptor-Test': 'true'
        },
        body: testMethod !== 'GET' ? JSON.stringify({
          agentId: currentAgentId,
          testTimestamp: new Date().toISOString(),
          context: 'Clawdock Interceptor Diagnostics Suite'
        }) : undefined
      });

      const data = await res.json().catch(() => null);
      setTestResult({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        payload: data
      });
      fetchLogs(); // sync logs instantly
    } catch (err: any) {
      setTestResult({
        error: err.message || 'Connection failed'
      });
    } finally {
      setTestSending(false);
    }
  };

  // Filter logs for Latency & Errors view (405, 500, or exceptionally high latency > 200ms)
  const errorLogs = logs.filter(log => log.status === 405 || log.status >= 500 || log.durationMs > 200);

  // Filter logs specifically for failed request interceptor (405 or 500 status codes)
  const failedLogs = logs.filter(log => log.status === 405 || log.status >= 500);

  // Determine active inspected log
  const activeInspectedLog = failedLogs.find(log => log.id === selectedFailedLogId) || failedLogs[0];

  return (
    <div className="space-y-4 p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Vite API Diagnostics & Monitoring
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
          API Latency & Errors
          {errorLogs.length > 0 && (
            <span className="ml-1 bg-red-950/60 px-1.5 py-0.5 rounded text-[10px] text-red-400 border border-red-500/20">
              {errorLogs.length}
            </span>
          )}
        </button>
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
            <span className="ml-1 bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px] text-amber-400 border border-amber-500/20 animate-pulse">
              {failedLogs.length} Intercepted
            </span>
          )}
        </button>
      </div>

      {/* Main active sub-tab view */}
      {activeSubTab === 'activity' ? (
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
                    const isError = log.status === 405 || log.status >= 500;
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
      ) : activeSubTab === 'errors' ? (
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
                      onClick={() => setExpandedExpandedLogId(isExpanded ? null : log.id)}
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
                        {/* Troubleshooting recommendations based on status */}
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex gap-3 text-xs">
                          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-200 block mb-1">Developer Debugging Recommendations:</span>
                            {is405 ? (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                CORS Preflight or HTTP Method Mismatch. The route exists but rejects <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">{log.method}</code> requests. 
                                Verify that <code className="text-indigo-300 font-mono">src/utils/apiBridge.ts</code> matches the handlers configured in <code className="text-indigo-300 font-mono">vite.config.ts</code> and <code className="text-indigo-300 font-mono">server.ts</code>.
                              </p>
                            ) : is500 ? (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                Internal Server Failure. The handler encountered a runtime exception (e.g. invalid json parsing, file system permission issues, or conflicting database keys).
                                Inspect the server output terminal to view the complete traceback log.
                              </p>
                            ) : (
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                High response latency. This is generally caused by DNS lookups, Ollama local model warm-up delays, or intensive backend file-writing IO.
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

                        {/* API Request Interceptor Stack Trace Section */}
                        {log.stackTrace && (
                          <div className="border-t border-slate-800 pt-4 mt-2">
                            <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              API Request Interceptor Stack Trace
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
      ) : (
        /* Real-time API Request Interceptor View */
        <div className="space-y-6">
          {/* Tool explanation */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3 text-xs max-w-2xl">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200 block mb-1 text-sm">Real-time API Request Interceptor & Trace Capture</span>
                <p className="text-slate-400 leading-relaxed text-xs">
                  This interface captures, registers, and decodes any failed HTTP transaction returning a <strong>405 Method Not Allowed</strong> or <strong>500 Server Error</strong>. Analyze explicit method mappings and full request lifecycle traces to eliminate persistent anomalies.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 shrink-0 text-center min-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Strict Router Schema</span>
              <span className="text-xs font-mono text-emerald-400 font-black">ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Test Suite Controller (col-span-3) */}
            <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Play className="w-4 h-4 text-emerald-400" />
                Trigger Method Test
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">HTTP Method Probe</label>
                  <div className="grid grid-cols-5 gap-1">
                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setTestMethod(m)}
                        className={`py-2 text-[10px] font-mono font-black rounded-lg border transition-all ${
                          testMethod === m
                            ? m === 'DELETE' || m === 'PATCH'
                              ? 'bg-red-500/10 border-red-500 text-red-400'
                              : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Target Route</label>
                  <input
                    type="text"
                    readOnly
                    value="/api/persistence/commit"
                    className="w-full bg-slate-950 text-xs font-mono text-indigo-300 p-2.5 rounded-xl border border-slate-800 outline-none"
                  />
                </div>

                <button
                  onClick={handleSendTestRequest}
                  disabled={testSending}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testSending ? 'animate-spin' : ''}`} />
                  Transmit Method Probe
                </button>
              </div>

              {testResult && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-t border-slate-800 pt-3">Probe Output</h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">Response Code</span>
                      <span className={`font-mono font-bold ${testResult.status === 405 ? 'text-amber-400' : testResult.status >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {testResult.status} {testResult.statusText}
                      </span>
                    </div>

                    {testResult.payload && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Response JSON</span>
                        <pre className="p-2 rounded bg-slate-900 text-[10px] text-slate-300 font-mono overflow-auto max-h-32">
                          {JSON.stringify(testResult.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Intercepted Failed Requests List (col-span-3) */}
            <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <ListFilter className="w-4 h-4 text-amber-500" />
                Intercepted Failures List
              </h3>

              <div className="space-y-2 overflow-y-auto max-h-[480px]">
                {failedLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs italic">
                    No intercepted failures (405 or 500) recorded in the active buffer.
                  </div>
                ) : (
                  failedLogs.map((log) => {
                    const isSelected = activeInspectedLog?.id === log.id;
                    const is405 = log.status === 405;
                    const is500 = log.status >= 500;
                    
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedFailedLogId(log.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? is500 
                              ? 'bg-rose-955/20 border-rose-500 text-rose-300' 
                              : 'bg-amber-955/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            is500 ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            HTTP {log.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 font-mono">
                            {log.method}
                          </span>
                          <span className="text-[11px] font-mono text-slate-300 truncate font-semibold block">
                            {log.pathname}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: Active Failure lifecycle Inspector (col-span-6) */}
            <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Eye className="w-4 h-4 text-indigo-400" />
                Active Transaction Lifecycle Trace
              </h3>

              {!activeInspectedLog ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Cpu className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400 font-semibold font-mono">Pipeline Inactive</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Select an intercepted failure from the list or send a live DELETE probe to verify step-by-step lifecycle interception.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Trace ID & details */}
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-mono text-[11px]">inspectedId: <strong className="text-slate-300">{activeInspectedLog.id}</strong></span>
                    <span className="font-mono text-[11px] text-indigo-400">Duration: <strong>{activeInspectedLog.durationMs}ms</strong></span>
                  </div>

                  {/* Flow Timline Stepper */}
                  <div className="relative border-l-2 border-indigo-500/20 ml-3 pl-6 space-y-5 text-xs text-slate-300">
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0.5 bg-indigo-500 w-4 h-4 rounded-full flex items-center justify-center border border-slate-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      </span>
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        1. Client API Call Received
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-indigo-400">{activeInspectedLog.method}</span>
                      </h4>
                      <p className="text-slate-400 mt-1">
                        Endpoint: <code className="text-indigo-300 font-mono">{activeInspectedLog.pathname}</code>. Initialized headers.
                      </p>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[31px] top-0.5 bg-indigo-500 w-4 h-4 rounded-full flex items-center justify-center border border-slate-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      </span>
                      <h4 className="font-bold text-slate-100">2. Enforced Method Validation Check</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">
                        Evaluated request method <code className="text-indigo-400 font-mono">{activeInspectedLog.method}</code> against configured handlers. Route pattern: <code className="text-slate-300 font-mono">/^\/api\/persistence\/commit(\/)?$/i</code>.
                      </p>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[31px] top-0.5 bg-rose-500 w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      </span>
                      <h4 className="font-bold text-rose-400 flex items-center gap-2">
                        3. validation result
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-[10px] text-rose-400 font-mono font-black">FAILED (HTTP {activeInspectedLog.status})</span>
                      </h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">
                        Validation rejected method {activeInspectedLog.method}. Enforced Allowed Methods on this endpoint: <code className="text-emerald-400 font-mono">GET, POST, PUT, OPTIONS</code>. Stack trace exception generated and logged.
                      </p>
                    </div>
                  </div>

                  {/* Headers & body inspector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Request Headers</span>
                      <pre className="p-3 rounded-xl bg-slate-950 text-[10px] text-slate-400 font-mono overflow-auto max-h-36 border border-slate-800">
                        {JSON.stringify(activeInspectedLog.requestHeaders || { 'Content-Type': 'application/json' }, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Request Body Payload</span>
                        {activeInspectedLog.payload && (
                          <button
                            onClick={() => handleCopy(activeInspectedLog.id, activeInspectedLog.payload)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                          >
                            {copiedId === activeInspectedLog.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <pre className="p-3 rounded-xl bg-slate-950 text-[10px] text-indigo-200 font-mono overflow-auto max-h-36 border border-slate-800">
                        {activeInspectedLog.payload 
                          ? JSON.stringify(activeInspectedLog.payload, null, 2)
                          : '// Empty request body (no payload captured)'}
                      </pre>
                    </div>
                  </div>

                  {/* Stack trace inspector */}
                  {activeInspectedLog.stackTrace && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Captured Exception Stack Trace
                      </span>
                      <pre className="p-3.5 rounded-xl bg-red-950/20 text-[10px] text-red-300 font-mono overflow-auto max-h-40 border border-red-900/30 whitespace-pre-wrap leading-relaxed">
                        {activeInspectedLog.stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
