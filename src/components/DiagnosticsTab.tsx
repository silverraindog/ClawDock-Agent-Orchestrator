import React, { useState, useEffect } from 'react';
import { RefreshCw, Terminal, AlertTriangle } from 'lucide-react';

export const DiagnosticsTab = ({ currentAgentId, agent, config, onFixOpenClaw }: { currentAgentId: string, agent: any, config: any, onFixOpenClaw: any }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verboseLogging, setVerboseLogging] = useState(() => localStorage.getItem('verboseLogging') === 'true');

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

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Server API Logs
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Verbose Logging:</label>
            <input 
              type="checkbox" 
              checked={verboseLogging}
              onChange={(e) => setVerboseLogging(e.target.checked)}
              className="accent-indigo-500"
            />
          </div>
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/50 text-xs text-red-300 border border-red-900 transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800 uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.slice(0, 50).map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 font-mono">{log.method}</td>
                <td className="px-4 py-2 font-mono">{log.pathname}</td>
                <td className={`px-4 py-2 ${log.status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>{log.status}</td>
                <td className="px-4 py-2">{log.durationMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
