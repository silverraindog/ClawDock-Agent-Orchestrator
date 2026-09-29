import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Filter
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
}

interface ApiLatencyChartProps {
  logs: ServerRequestLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  pollCount?: number;
}

export const ApiLatencyChart: React.FC<ApiLatencyChartProps> = ({
  logs,
  isLoading = false,
  onRefresh,
  pollCount = 0
}) => {
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'GET' | 'POST'>('ALL');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  // Take the last 50 recorded requests and prepare in chronological order (oldest to newest)
  const chartData = useMemo(() => {
    // logs are typically unshifted (newest first); slice 50 and reverse for chronological left-to-right chart
    const recent50 = logs.slice(0, 50).reverse();

    const filtered = recent50.filter((item) => {
      if (methodFilter !== 'ALL' && item.method !== methodFilter) return false;
      if (showErrorsOnly && item.status < 400) return false;
      return true;
    });

    return filtered.map((item, index) => {
      const date = new Date(item.timestamp);
      const timeLabel = isNaN(date.getTime())
        ? `#${index + 1}`
        : date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        id: item.id,
        index: index + 1,
        time: timeLabel,
        rawTimestamp: item.timestamp,
        durationMs: item.durationMs ?? 0,
        status: item.status,
        method: item.method,
        path: item.pathname || item.url,
        clientIp: item.clientIp || '127.0.0.1'
      };
    });
  }, [logs, methodFilter, showErrorsOnly]);

  // Compute key latency statistics over the last 50 items
  const stats = useMemo(() => {
    const sample = logs.slice(0, 50);
    if (sample.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        successRate: 100,
        errorCount: 0,
        total: 0
      };
    }

    const durations = sample
      .map((l) => l.durationMs ?? 0)
      .sort((a, b) => a - b);

    const sum = durations.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / durations.length);
    const min = durations[0];
    const max = durations[durations.length - 1];

    const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
    const p95 = durations[p95Index];

    const errors = sample.filter((l) => l.status >= 400).length;
    const successRate = Math.round(((sample.length - errors) / sample.length) * 1000) / 10;

    return {
      avg,
      min,
      max,
      p95,
      successRate,
      errorCount: errors,
      total: sample.length
    };
  }, [logs]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                API Latency Trends & Performance Observability
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-normal">
                  Last {Math.min(50, logs.length)} Requests
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualizing server request durations in milliseconds over time from <code className="text-indigo-300 font-mono text-[11px]">serverRequestLogs</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Method Filter */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(['ALL', 'GET', 'POST'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  methodFilter === m
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Errors Only Toggle */}
          <button
            onClick={() => setShowErrorsOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              showErrorsOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Errors Only
          </button>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
              {pollCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">({pollCount})</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Latency Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Average Latency</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {stats.avg}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Mean response time</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>95th Percentile</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {stats.p95}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">p95 ceiling</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Peak Duration</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {stats.max}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Max latency observed</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Min Duration</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {stats.min}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Fastest response</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Success Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {stats.successRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stats.total - stats.errorCount} / {stats.total} ok</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Error Statuses</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${stats.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {stats.errorCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">4xx / 5xx responses</div>
        </div>
      </div>

      {/* Latency Trends Line Chart */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span>Request Duration Over Time</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Chronological: Earliest → Latest)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-indigo-500 inline-block" />
              Duration (ms)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-500 inline-block" />
              Average ({stats.avg}ms)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-rose-500 inline-block" />
              100ms Ceiling
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>No requests matching the selected filter.</span>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  unit="ms"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    const status = data.status;
                    const isOk = status >= 200 && status < 400;

                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono text-[11px]">
                          <span className="text-slate-400">{data.time}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              isOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            HTTP {status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-bold font-mono text-[10px]">
                              {data.method}
                            </span>
                            <span className="text-slate-200 font-mono text-[11px] truncate max-w-[180px]" title={data.path}>
                              {data.path}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-400">Latency:</span>
                            <span className="font-mono font-bold text-white">
                              {data.durationMs}ms
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Client:</span>
                            <span className="font-mono">{data.clientIp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Average Reference Line */}
                {stats.avg > 0 && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                )}
                {/* 100ms Alert Reference Line */}
                <ReferenceLine
                  y={100}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="durationMs"
                  name="Latency"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#0f172a' }}
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
