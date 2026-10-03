import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Play, 
  RefreshCw, 
  Clock, 
  Copy, 
  Check, 
  ListFilter, 
  Terminal, 
  AlertTriangle, 
  Layers, 
  ChevronRight, 
  Trash2,
  Code
} from 'lucide-react';
import { 
  InterceptedRequestLog, 
  getInterceptedLogs, 
  clearInterceptedLogs, 
  registerBeforeRequestHook,
  initGlobalRequestInterceptor 
} from '../utils/requestInterceptorStore';

interface RequestInterceptorProps {
  currentAgentId: string;
}

export const RequestInterceptor: React.FC<RequestInterceptorProps> = ({ currentAgentId }) => {
  const [logs, setLogs] = useState<InterceptedRequestLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Test Suite States
  const [testMethod, setTestMethod] = useState<'PUT' | 'POST' | 'GET' | 'DELETE'>('PUT');
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify({ agentId: currentAgentId, config: { runtime: 'clawdock-edge', debug: true } }, null, 2)
  );
  const [simulateFailHeader, setSimulateFailHeader] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [liveHookActive, setLiveHookActive] = useState(true);
  const [lastHookTriggered, setLastHookTriggered] = useState<string | null>(null);

  // Sync logs and register beforeRequest hook
  useEffect(() => {
    initGlobalRequestInterceptor();
    setLogs(getInterceptedLogs());

    const handleUpdate = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.logs) {
        setLogs(customEvt.detail.logs);
      } else {
        setLogs(getInterceptedLogs());
      }
    };

    window.addEventListener('request-interceptor-updated', handleUpdate);

    // Register a visual beforeRequest listener hook
    const unregister = registerBeforeRequestHook((ctx) => {
      if (ctx.pathname.includes('/api/persistence/commit')) {
        setLastHookTriggered(`beforeRequest hook executed for [${ctx.method}] at ${new Date(ctx.timestamp).toLocaleTimeString()}`);
      }
    });

    return () => {
      window.removeEventListener('request-interceptor-updated', handleUpdate);
      unregister();
    };
  }, []);

  const handleCopy = (id: string, text: any) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendProbe = async () => {
    setIsSending(true);
    setLastTestResult(null);

    let parsedBody: any = undefined;
    if (testMethod !== 'GET') {
      try {
        parsedBody = JSON.parse(customPayload);
      } catch {
        parsedBody = { raw: customPayload };
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Clawdock-Probe': 'request-interceptor-diagnostics'
      };

      if (simulateFailHeader) {
        headers['X-Simulate-Mismatch'] = 'true';
      }

      const res = await fetch('/api/persistence/commit', {
        method: testMethod,
        headers,
        body: testMethod !== 'GET' ? JSON.stringify(parsedBody) : undefined
      });

      const responseData = await res.json().catch(() => null);
      
      setLastTestResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseData
      });
      
      // Update local state from store
      setLogs(getInterceptedLogs());
    } catch (err: any) {
      setLastTestResult({
        status: 0,
        statusText: 'Network Error',
        ok: false,
        error: err.message
      });
      setLogs(getInterceptedLogs());
    } finally {
      setIsSending(false);
    }
  };

  const activeLog = logs.find(l => l.id === selectedLogId) || logs[0];

  return (
    <div className="space-y-6">
      {/* Top Banner with Store Status */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-xl">
        <div className="flex gap-3 text-xs max-w-2xl">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-1 text-sm flex items-center gap-2">
              Request Interceptor &amp; Global <code className="text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs">beforeRequest</code> Hook
            </span>
            <p className="text-slate-400 leading-relaxed text-xs">
              Monitors and intercepts HTTP requests targeting <code className="text-indigo-300 font-mono">/api/persistence/commit</code>. 
              Captures complete request payloads, headers, response status codes, and exception stack traces into a window-accessible store (<code className="text-amber-400 font-mono">window.__REQUEST_INTERCEPTOR_STORE__</code>).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Global Hook Status</span>
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {liveHookActive ? 'ACTIVE (Fetch Hooked)' : 'PAUSED'}
            </span>
          </div>

          <button
            onClick={() => {
              clearInterceptedLogs();
              setLogs([]);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/40 hover:text-red-400 text-xs text-slate-300 border border-slate-700/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Interceptor Logs
          </button>
        </div>
      </div>

      {lastHookTriggered && (
        <div className="px-4 py-2 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            {lastHookTriggered}
          </span>
          <span className="text-[10px] text-slate-500">Real-time beforeRequest dispatch</span>
        </div>
      )}

      {/* Main Grid: Probe Controls & Intercepted Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Probe Dispatcher (col-span-4) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Test Request Dispatcher
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">/api/persistence/commit</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">HTTP Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['PUT', 'POST', 'GET', 'DELETE'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTestMethod(m)}
                    className={`py-2 text-xs font-mono font-black rounded-xl border transition-all ${
                      testMethod === m
                        ? m === 'PUT'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm'
                          : m === 'DELETE'
                          ? 'bg-red-500/10 border-red-500 text-red-400 shadow-sm'
                          : 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {testMethod !== 'GET' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">Request Body Payload (JSON)</label>
                  <button
                    onClick={() => setCustomPayload(JSON.stringify({ agentId: currentAgentId, timestamp: new Date().toISOString(), config: { updatedVia: 'interceptor-probe' } }, null, 2))}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Reset Preset
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  className="w-full bg-slate-950 text-indigo-200 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <button
              onClick={handleSendProbe}
              disabled={isSending}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              Dispatch {testMethod} Request
            </button>
          </div>

          {/* Test Probe Output */}
          {lastTestResult && (
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Probe Result:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  lastTestResult.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                  lastTestResult.status === 405 ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                  'bg-rose-950 text-rose-400 border border-rose-500/20'
                }`}>
                  {lastTestResult.status} {lastTestResult.statusText || (lastTestResult.ok ? 'OK' : 'Error')}
                </span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-300 font-mono overflow-auto max-h-36 border border-slate-800">
                {JSON.stringify(lastTestResult.body || lastTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: Intercepted Request Logs & Inspector (col-span-8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Logs Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-amber-500" />
                Intercepted Failed Requests ({logs.length})
              </h3>
              <span className="text-[10px] text-slate-500">Stored in window.__REQUEST_INTERCEPTOR_STORE__</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-slate-800/80 uppercase text-[9px] tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-4 py-2.5 font-semibold">Method</th>
                    <th className="px-4 py-2.5 font-semibold">Pathname</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 text-xs italic">
                        No failed requests intercepted yet. Trigger a DELETE or invalid probe to capture logs.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isSelected = (activeLog?.id === log.id);
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogId(log.id)}
                          className={`cursor-pointer transition-colors hover:bg-slate-800/30 ${
                            isSelected ? 'bg-indigo-950/30 text-indigo-300' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              log.method === 'PUT' ? 'bg-amber-950 text-amber-400' :
                              log.method === 'POST' ? 'bg-indigo-950 text-indigo-400' :
                              'bg-red-950 text-red-400'
                            }`}>
                              {log.method}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-200 text-xs truncate max-w-xs">
                            {log.pathname}
                          </td>
                          <td className="px-4 py-2.5 font-bold">
                            <span className={log.status === 405 ? 'text-amber-400' : log.status >= 500 ? 'text-rose-400' : 'text-slate-400'}>
                              {log.status || 'ERR'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <ChevronRight className={`w-3.5 h-3.5 inline-block text-slate-400 ${isSelected ? 'text-indigo-400 translate-x-1' : ''} transition-transform`} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Log Inspector Card */}
          {activeLog ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-xs font-mono font-bold">
                    {activeLog.method}
                  </span>
                  <span className="text-xs text-slate-200 font-mono font-bold">{activeLog.pathname}</span>
                  <span className="text-[11px] text-slate-500 font-mono">({activeLog.durationMs}ms)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Captured at {new Date(activeLog.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Payload & Headers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Headers */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Captured Request Headers
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-300 font-mono overflow-auto max-h-44 border border-slate-800">
                    {JSON.stringify(activeLog.headers || {}, null, 2)}
                  </pre>
                </div>

                {/* Payload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Captured Request Payload
                    </span>
                    {activeLog.payload && (
                      <button
                        onClick={() => handleCopy(activeLog.id, activeLog.payload)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      >
                        {copiedId === activeLog.id ? (
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
                    {activeLog.payload 
                      ? JSON.stringify(activeLog.payload, null, 2)
                      : '// No request body payload sent'}
                  </pre>
                </div>
              </div>

              {/* Response Details & Stack Trace */}
              {activeLog.stackTrace && (
                <div className="space-y-1.5 border-t border-slate-800 pt-3">
                  <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Captured Stack Trace &amp; Method Validation Failure
                  </span>
                  <pre className="p-3.5 bg-red-950/20 rounded-xl text-[10px] text-red-300 font-mono overflow-auto max-h-40 border border-red-900/30 whitespace-pre-wrap leading-relaxed">
                    {activeLog.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No Request Selected</p>
              <p className="text-[10px] text-slate-500 mt-1">Select an intercepted request log above to view detailed headers and body payload.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
