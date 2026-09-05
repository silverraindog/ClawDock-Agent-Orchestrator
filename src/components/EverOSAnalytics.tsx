import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, Zap, HardDrive } from 'lucide-react';

const MEMORY_TRENDS_DATA = [
  { time: '00:00', hermes: 42, zeroclaw: 12.4, openclaw: 31, picoclaw: 8.5, everos: 48 },
  { time: '04:00', hermes: 44, zeroclaw: 12.2, openclaw: 29, picoclaw: 8.5, everos: 46 },
  { time: '08:00', hermes: 58, zeroclaw: 13.1, openclaw: 42, picoclaw: 9.1, everos: 55 },
  { time: '12:00', hermes: 72, zeroclaw: 12.8, openclaw: 56, picoclaw: 8.9, everos: 68 },
  { time: '16:00', hermes: 65, zeroclaw: 12.5, openclaw: 48, picoclaw: 8.8, everos: 62 },
  { time: '20:00', hermes: 51, zeroclaw: 12.4, openclaw: 36, picoclaw: 8.6, everos: 52 },
  { time: '24:00', hermes: 45, zeroclaw: 12.4, openclaw: 32, picoclaw: 8.5, everos: 49 },
];

const NAMESPACE_DIST_DATA = [
  { name: 'Global Shared Facts', value: 45, color: '#6366f1' },
  { name: 'Hermes Trajectories', value: 30, color: '#3b82f6' },
  { name: 'ZeroClaw Edge Logs', value: 18, color: '#f59e0b' },
  { name: 'OpenClaw Webhooks', value: 25, color: '#10b981' },
  { name: 'PicoClaw Embedded', value: 12, color: '#06b6d4' },
  { name: 'Distilled Skills', value: 20, color: '#ec4899' },
];

const LATENCY_COMPARISON_DATA = [
  { queryType: 'Short Fact Lookup', bm25: 45, vector: 180, hybridMRAG: 120 },
  { queryType: 'Trajectory Case Search', bm25: 85, vector: 240, hybridMRAG: 175 },
  { queryType: 'Cross-Bot Sync Query', bm25: 110, vector: 310, hybridMRAG: 215 },
  { queryType: 'Skill Pattern Matching', bm25: 60, vector: 195, hybridMRAG: 140 },
];

export const EverOSAnalytics: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<'trends' | 'namespace' | 'latency'>('trends');

  return (
    <div className="space-y-6 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            EverOS Memory Performance &amp; Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry across agent RAM usage, namespace memory partitioning, and hybrid mRAG query latency.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveMetric('trends')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMetric === 'trends' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            RAM Trends
          </button>
          <button
            onClick={() => setActiveMetric('namespace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMetric === 'namespace' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Namespaces
          </button>
          <button
            onClick={() => setActiveMetric('latency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMetric === 'latency' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            mRAG Latency
          </button>
        </div>
      </div>

      {/* Chart 1: Memory RAM Usage Trends Over Time */}
      {activeMetric === 'trends' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-white">Container &amp; EverOS Daemon RAM Footprint (MB)</span>
            <span className="font-mono text-emerald-400">Stable sub-75MB total pool</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MEMORY_TRENDS_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="everosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="hermesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" textAnchor="end" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MB" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="everos" name="EverOS Daemon" stroke="#6366f1" fillOpacity={1} fill="url(#everosGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="hermes" name="Hermes Agent" stroke="#3b82f6" fillOpacity={1} fill="url(#hermesGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="openclaw" name="OpenClaw" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="zeroclaw" name="ZeroClaw (Rust)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart 2: Namespace Distribution (Pie / Bar) */}
      {activeMetric === 'namespace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-fadeIn">
          <div className="lg:col-span-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">Memory Item Share by Partition</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={NAMESPACE_DIST_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {NAMESPACE_DIST_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Namespace Breakdown</h4>
            {NAMESPACE_DIST_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-200 font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-slate-400 font-bold">{item.value} files</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart 3: mRAG Latency Comparison */}
      {activeMetric === 'latency' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-white">Retrieval Latency Breakdown (Milliseconds)</span>
            <span className="font-mono text-indigo-400">Hybrid mRAG Optimized (&lt;350ms SLA)</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LATENCY_COMPARISON_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="queryType" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="bm25" name="BM25 SQLite" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vector" name="LanceDB Vector Only" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hybridMRAG" name="EverOS Hybrid mRAG" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
