import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Globe, Server } from 'lucide-react';

interface ApiLogEntry {
  method: string;
  url: string;
  status: number;
  timestamp: string;
}

export const DiagnosticsTab: React.FC = () => {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ endpoint: string; status: number; ok: boolean; response: string }>>([]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/diagnostics/logs');
      const data = await res.json();
      if (data && data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch diagnostics logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const runDiagnosticsTests = async () => {
    const endpoints = [
      '/api/health',
      '/api/state',
      '/api/persistence',
      '/api/docker/status'
    ];

    const results: Array<{ endpoint: string; status: number; ok: boolean; response: string }> = [];

    for (const ep of endpoints) {
      try {
        const start = performance.now();
        const res = await fetch(ep);
        const text = await res.text();
        results.push({
          endpoint: ep,
          status: res.status,
          ok: res.ok,
          response: text.substring(0, 150)
        });
      } catch (err: any) {
        results.push({
          endpoint: ep,
          status: 0,
          ok: false,
          response: err.message || 'Network error'
        });
      }
    }

    setTestResults(results);
    fetchLogs();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Backend API &amp; HTTP Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inspection of API request attempts, HTTP status codes, and endpoint routings (/api/state, /api/persistence, /api/health).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runDiagnosticsTests}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Globe className="w-4 h-4" />
            Run Endpoint Probe
          </button>
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Endpoint Probe Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {testResults.map((tr, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1 font-mono text-xs">
                  <div className="text-indigo-300 font-semibold">{tr.endpoint}</div>
                  <div className="text-slate-400 text-[11px] truncate max-w-xs">{tr.response}</div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                  tr.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {tr.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {tr.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recent HTTP Request Attempts ({logs.length})</h3>
          <span className="text-[11px] text-slate-400 font-mono">Auto-refreshes every 5s</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No API requests recorded yet. Interact with the app or click "Run Endpoint Probe".
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Endpoint URL</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log, idx) => {
                  const isSuccess = log.status >= 200 && log.status < 300;
                  const isWarn = log.status >= 400 && log.status < 500;
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-300">{log.method}</td>
                      <td className="py-2.5 px-4 text-indigo-300">{log.url}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          isWarn ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
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
