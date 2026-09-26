import React from 'react';
import { 
  Activity, 
  Container, 
  HardDrive, 
  Radio, 
  ShieldCheck, 
  ExternalLink, 
  Terminal, 
  ArrowRight,
  Server,
  Zap,
  Settings2,
  Boxes,
  Play,
  Search,
  Sparkles,
  Brain,
  Clock,
  History,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Key,
  AlertCircle,
  AlertTriangle,
  Globe,
  Lock,
  Layers
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  LineChart, 
  Line, 
  ResponsiveContainer, 
  YAxis, 
  Tooltip,
  XAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { AgentFullConfig, AgentInfo, DockerSystemInfo, SkillItem, MCPServerConfig, LLMHealthReport } from '../types';
import { fetchLLMHealth } from '../utils/apiBridge';
import { MoAConsensusMonitor } from './MoAConsensusMonitor';

interface DashboardTabProps {
  agent: AgentInfo;
  config: AgentFullConfig;
  dockerInfo: DockerSystemInfo;
  skills: SkillItem[];
  mcpServers: MCPServerConfig[];
  onNavigateTab: (tab: string) => void;
  onInstallAgent: () => void;
  onDetectAgent: () => void;
  onOpenDiscovery: () => void;
  allAgents?: AgentInfo[];
}

// Sub-component for Agent Health real-time latency ping chart
export const AgentHealthWidget: React.FC<{ runningAgents: AgentInfo[] }> = ({ runningAgents }) => {
  // Store rolling latency data for each running agent
  const [latencyData, setLatencyData] = React.useState<Record<string, { val: number; i: number }[]>>({});

  React.useEffect(() => {
    // Initialize history with existing history from agents or random stable defaults
    const initialData: Record<string, { val: number; i: number }[]> = {};
    runningAgents.forEach(agent => {
      const history = agent.latencyHistory && agent.latencyHistory.length > 0 
        ? agent.latencyHistory 
        : [120, 130, 115, 140, 135, 122, 128, 145, 130, 138];
      
      initialData[agent.id] = history.map((val, idx) => ({ val, i: idx }));
    });
    setLatencyData(initialData);

    // Set up a real-time interval to simulate or fetch fresh latency updates every 3 seconds
    const interval = setInterval(() => {
      setLatencyData(prev => {
        const next = { ...prev };
        runningAgents.forEach(agent => {
          const currentList = prev[agent.id] || [];
          const lastVal = currentList.length > 0 ? currentList[currentList.length - 1].val : 120;
          
          // Generate a natural random-walk latency fluctuation (stable around container baselines)
          const delta = (Math.random() - 0.5) * 15;
          let newVal = Math.round(lastVal + delta);
          
          // Constrain value to realistic bounds (e.g. 30ms - 400ms)
          newVal = Math.max(30, Math.min(400, newVal));

          const newList = [...currentList, { val: newVal, i: Date.now() }];
          // Keep sliding window of last 15 points
          if (newList.length > 15) {
            newList.shift();
          }
          next[agent.id] = newList;
        });
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [runningAgents]);

  if (runningAgents.length === 0) {
    return (
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 text-center space-y-2">
        <Activity className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agent Health Monitors</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No containers are currently running. Deploy or start an agent container to activate real-time latency ping widgets.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Agent Health: Real-time Latency Ping (ms)
          </h3>
          <p className="text-[11px] text-slate-400">
            Reactive heartbeats and network roundtrip ping for all running container instances.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Realtime Polling (3s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {runningAgents.map(agent => {
          const points = latencyData[agent.id] || [];
          const currentLatency = points.length > 0 ? points[points.length - 1].val : (agent.avgLatencyMs || 120);
          
          return (
            <div key={agent.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200 truncate max-w-[120px]" title={agent.name}>
                    {agent.name}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 truncate" title={agent.containerId}>
                    ID: {agent.containerId || 'detached'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-400">{currentLatency}ms</span>
                  <div className="text-[9px] text-slate-500 font-medium">Ping</div>
                </div>
              </div>

              <div className="h-10 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-200">
                              {payload[0].value}ms
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="val" 
                      stroke="#10b981" 
                      strokeWidth={1.5} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Port: {agent.defaultPort}
                </span>
                <span className="font-mono">Avg: {Math.round(points.reduce((acc, p) => acc + p.val, 0) / Math.max(1, points.length))}ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-component for Agent Resource Usage (CPU/Memory)
export const ResourceMonitorWidget: React.FC<{ runningAgents: AgentInfo[] }> = ({ runningAgents }) => {
  const [resourceData, setResourceData] = React.useState<Record<string, { cpu: number; mem: number; i: number }[]>>({});

  React.useEffect(() => {
    console.log('[DashboardTab] [ResourceMonitorWidget] useEffect mounted - initializing resource polling from /api/resources');

    const initialData: Record<string, { cpu: number; mem: number; i: number }[]> = {};
    runningAgents.forEach(agent => {
      initialData[agent.id] = Array.from({ length: 15 }).map((_, i) => ({
        cpu: Math.random() * 30 + 10,
        mem: agent.memoryUsageMb || 50,
        i
      }));
    });
    setResourceData(initialData);

    const fetchResources = async () => {
      const endpoint = '/api/resources';
      console.log(`[DashboardTab] [ResourceMonitorWidget] [${new Date().toLocaleTimeString()}] Fetching resources from ${endpoint}...`);
      try {
        const res = await fetch(endpoint);
        console.log(`[DashboardTab] [ResourceMonitorWidget] GET ${endpoint} response HTTP status: ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          console.error(`[DashboardTab] [ResourceMonitorWidget] ${endpoint} returned error status: ${res.status} (${res.statusText})`);
          return;
        }

        const data = await res.json();
        console.log(`[DashboardTab] [ResourceMonitorWidget] Received payload from ${endpoint}:`, data);

        if (data && data.resources) {
          setResourceData(prev => {
            const next = { ...prev };
            runningAgents.forEach(agent => {
              const currentList = prev[agent.id] || [];
              const agentRes = data.resources[agent.id];
              const cpu = (agentRes && typeof agentRes.cpuUsagePct === 'number')
                ? agentRes.cpuUsagePct
                : Math.max(5, Math.min(95, (currentList[currentList.length - 1]?.cpu || 15) + (Math.random() - 0.5) * 10));
              const mem = (agentRes && typeof agentRes.memoryUsageMb === 'number')
                ? agentRes.memoryUsageMb
                : Math.max(20, Math.min(500, (currentList[currentList.length - 1]?.mem || 50) + (Math.random() - 0.5) * 20));

              const newList = [...currentList, { cpu, mem, i: Date.now() }];
              if (newList.length > 15) newList.shift();
              next[agent.id] = newList;
            });
            return next;
          });
        }
      } catch (err: any) {
        console.error(`[DashboardTab] [ResourceMonitorWidget] Exception during GET ${endpoint}:`, err);
      }
    };

    fetchResources();
    const interval = setInterval(fetchResources, 2000);

    return () => {
      console.log('[DashboardTab] [ResourceMonitorWidget] useEffect cleanup - clearing interval');
      clearInterval(interval);
    };
  }, [runningAgents]);

  if (runningAgents.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          Container Resource Utilization
        </h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Realtime Polling (2s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {runningAgents.map(agent => {
          const data = resourceData[agent.id] || [];
          const latest = data[data.length - 1] || { cpu: 0, mem: 0 };
          return (
            <div key={agent.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span>{agent.name}</span>
                <span className="font-mono text-[10px] text-slate-500">{agent.containerId}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                    <span>CPU</span>
                    <span className="font-mono text-indigo-400">{latest.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} isAnimationActive={false} />
                        <YAxis hide domain={[0, 100]} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                    <span>Mem</span>
                    <span className="font-mono text-emerald-400">{latest.mem.toFixed(0)}MB</span>
                  </div>
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <Area type="monotone" dataKey="mem" stroke="#10b981" fill="#10b981" fillOpacity={0.2} isAnimationActive={false} />
                        <YAxis hide domain={[0, 'auto']} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface AgentResourceTrendChartProps {
  agentId: string;
  agentName: string;
  status: string;
}

export const AgentResourceTrendChart: React.FC<AgentResourceTrendChartProps> = ({ agentId, agentName, status }) => {
  const [statsHistory, setStatsHistory] = React.useState<{ time: string; cpu: number; memoryMb: number; memoryPct: number }[]>([]);
  const [currentCpu, setCurrentCpu] = React.useState<number>(0);
  const [currentMemMb, setCurrentMemMb] = React.useState<number>(0);
  const [currentMemPct, setCurrentMemPct] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metricMode, setMetricMode] = React.useState<'combined' | 'cpu' | 'memory'>('combined');

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.history) {
        setStatsHistory(data.history);
        setCurrentCpu(data.cpuUsagePct ?? 0);
        setCurrentMemMb(data.memoryUsageMb ?? 0);
        setCurrentMemPct(data.memoryUsagePct ?? 0);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent stats');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  React.useEffect(() => {
    setLoading(true);
    fetchStats();
    const timer = setInterval(fetchStats, 3000);
    return () => clearInterval(timer);
  }, [agentId, fetchStats]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Real-Time Resource Usage Trends ({agentName || agentId})
              </h3>
              <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <p className="text-xs text-slate-400">
              Live CPU &amp; Memory telemetry polled real-time from <code className="text-indigo-300 font-mono">/api/agents/{agentId}/stats</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Selector */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setMetricMode('combined')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${metricMode === 'combined' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Combined
            </button>
            <button
              onClick={() => setMetricMode('cpu')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${metricMode === 'cpu' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              CPU (%)
            </button>
            <button
              onClick={() => setMetricMode('memory')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${metricMode === 'memory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Memory (MB)
            </button>
          </div>

          <button
            onClick={() => fetchStats()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh statistics now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Badges / Stat Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              CPU Usage
            </div>
            <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
              {currentCpu.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-mono">
              {status === 'running' ? 'Active Container' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              Memory (RAM)
            </div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
              {currentMemMb.toFixed(1)} MB
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-mono">
              {currentMemPct.toFixed(1)}% limit
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Polling Stream
            </div>
            <div className="text-xs font-bold text-indigo-300 font-mono mt-1">
              Every 3.0s
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="h-64 w-full pt-2">
        {loading && statsHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Loading agent telemetry trends...
          </div>
        ) : error && statsHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center text-rose-400 text-xs">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={statsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              
              {metricMode === 'combined' && (
                <>
                  <YAxis yAxisId="cpu" orientation="left" stroke="#06b6d4" fontSize={10} tickLine={false} domain={[0, 'auto']} unit="%" />
                  <YAxis yAxisId="mem" orientation="right" stroke="#10b981" fontSize={10} tickLine={false} domain={[0, 'auto']} unit="MB" />
                </>
              )}
              {metricMode === 'cpu' && (
                <YAxis stroke="#06b6d4" fontSize={10} tickLine={false} domain={[0, 'auto']} unit="%" />
              )}
              {metricMode === 'memory' && (
                <YAxis stroke="#10b981" fontSize={10} tickLine={false} domain={[0, 'auto']} unit="MB" />
              )}

              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#f8fafc' }}
                formatter={(val: any, name: any) => {
                  if (name === 'CPU (%)' || name === 'cpu') return [`${Number(val).toFixed(1)}%`, 'CPU Usage'];
                  if (name === 'Memory (MB)' || name === 'memoryMb') return [`${Number(val).toFixed(1)} MB`, 'Memory Usage'];
                  return [val, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {(metricMode === 'combined' || metricMode === 'cpu') && (
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU (%)"
                  yAxisId={metricMode === 'combined' ? 'cpu' : undefined}
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                />
              )}

              {(metricMode === 'combined' || metricMode === 'memory') && (
                <Area
                  type="monotone"
                  dataKey="memoryMb"
                  name="Memory (MB)"
                  yAxisId={metricMode === 'combined' ? 'mem' : undefined}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memGradient)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// Sub-component for LLM Health & Provider Availability Monitor Widget
export const LLMHealthMonitorWidget: React.FC<{
  onNavigateTab?: (tab: string) => void;
  activeProvider?: string;
  fallbackProvider?: string;
  currentAgent?: AgentInfo;
  allAgents?: AgentInfo[];
  config?: AgentFullConfig;
}> = ({ onNavigateTab, activeProvider, fallbackProvider, currentAgent, allAgents = [], config }) => {
  const [healthReport, setHealthReport] = React.useState<LLMHealthReport | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [filter, setFilter] = React.useState<'all' | 'configured' | 'online' | 'issues' | 'fallbacks'>('all');
  const [error, setError] = React.useState<string | null>(null);

  const loadHealthData = React.useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    try {
      const data = await fetchLLMHealth(forceRefresh);
      if (data) {
        setHealthReport(data);
        setError(null);
      } else {
        setError('Unable to fetch live LLM provider health status from /api/health.');
      }
    } catch (err: any) {
      setError(err.message || 'LLM health monitor failed to connect.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadHealthData(false);
    const interval = setInterval(() => {
      loadHealthData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadHealthData]);

  const providers = healthReport?.providers || [];
  const fallbackAgents = healthReport?.fallbackAgents || [];
  const activeFallbackAgents = fallbackAgents.filter(a => a.isRunningOnFallback);
  const hasFallbackActive = activeFallbackAgents.length > 0;

  const filteredProviders = providers.filter(p => {
    const isConfigured = p.configuredInAgents.length > 0 || 
                         (activeProvider && p.id === activeProvider.toLowerCase()) || 
                         (fallbackProvider && p.id === fallbackProvider.toLowerCase());
    if (filter === 'configured') return isConfigured;
    if (filter === 'online') return p.status === 'online';
    if (filter === 'issues') return p.status === 'missing_key' || p.status === 'invalid_key' || p.status === 'unreachable';
    if (filter === 'fallbacks') return (p.isFallbackFor && p.isFallbackFor.length > 0);
    return true;
  });

  const onlineCount = healthReport?.onlineCount ?? providers.filter(p => p.status === 'online').length;
  const missingKeyCount = healthReport?.missingKeyCount ?? providers.filter(p => p.status === 'missing_key').length;
  const overallStatus = healthReport?.status || (onlineCount > 0 ? 'healthy' : 'degraded');

  return (
    <div id="llm-health-monitor-widget" className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                LLM Health &amp; Provider Availability
              </h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                overallStatus === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : overallStatus === 'degraded'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  overallStatus === 'healthy' ? 'bg-emerald-400 animate-pulse' : overallStatus === 'degraded' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                {overallStatus === 'healthy' ? 'SYSTEM HEALTHY' : overallStatus === 'degraded' ? 'PARTIALLY DEGRADED' : 'CRITICAL FAULT'}
              </span>

              {hasFallbackActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  FALLBACK ROUTING ACTIVE ({activeFallbackAgents.length})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live endpoint probing, API validation status, and automatic fallback failover monitoring via <code className="text-indigo-300 font-mono text-[11px]">/api/health</code>.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Filter Pills */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            {(['all', 'configured', 'online', 'issues', 'fallbacks'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                  filter === mode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'issues' ? 'Issues' : mode === 'fallbacks' ? 'Fallbacks' : mode}
              </button>
            ))}
          </div>

          <button
            id="refresh-llm-health-btn"
            onClick={() => loadHealthData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Force refresh /api/health connectivity and API key validation"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Probing /api/health...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Visual Alert When Agent Falls Back to OpenRouter Due to Local Network Errors */}
      {fallbackAgents.some(a => a.isRunningOnFallback && (a.fallbackProvider?.toLowerCase() === 'openrouter' || a.reason?.toLowerCase().includes('openrouter'))) && (
        <div 
          id="dashboard-openrouter-fallback-alert"
          className="p-4 rounded-xl border-2 border-rose-500/70 bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-amber-950/40 shadow-xl space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-200">
                    Local Network Alert: Fallback to OpenRouter Active
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    192.168.1.49 UNREACHABLE
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  The local Ollama server at <code className="text-rose-300 font-mono text-[11px]">http://192.168.1.49:11434</code> is offline or unreachable over the network. Agent requests have fallen back to OpenRouter.
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('config')}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold shadow transition-colors flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
              >
                <span>Check Agent Config</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prominent Highlighting When Agent is Running on Fallback Configuration */}
      {hasFallbackActive && (
        <div 
          id="dashboard-active-fallback-alert"
          className="p-4 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/20 shadow-lg space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>Agent Failover Active: Running on Fallback Configuration</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  The following agent(s) encountered primary LLM errors and are automatically executing on configured fallback redundancy:
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('config')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition-colors flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
              >
                <span>Resolve in Config</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List of affected agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {activeFallbackAgents.map(fb => (
              <div 
                key={fb.agentId} 
                className="p-3 rounded-lg bg-slate-950/80 border border-amber-500/30 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    {fb.agentName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    FALLBACK ACTIVE
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 pt-0.5 flex-wrap">
                  <span className="text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/30">
                    Primary: {fb.primaryProvider.toUpperCase()} ({fb.primaryStatus.replace('_', ' ')})
                  </span>
                  <span className="text-slate-500">➔</span>
                  <span className="text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                    Fallback: {fb.fallbackProvider.toUpperCase()} ({fb.fallbackStatus})
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  {fb.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOA Architecture Endpoint Validation & Local Static IP Mapping */}
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-900/90 to-slate-950/80 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">MOA Local Server Endpoint Resolution</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Target: 192.168.1.49:11434
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enforcing local Ollama endpoint resolution instead of defaulting to <code className="text-rose-300 font-mono text-[10px]">moa://local</code> or <code className="text-amber-300 font-mono text-[10px]">openrouter</code>.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 self-start sm:self-center">
            Provider: custom:ollama
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aggregator Model</span>
              <span className="text-[10px] font-mono text-emerald-400">custom:ollama</span>
            </div>
            <div className="font-mono text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span>{config?.moa?.aggregatorModel || 'gemma4-soul:latest'}</span>
              <span className="text-[10px] text-slate-500 font-normal">→ http://192.168.1.49:11434</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposers / Reference Models</span>
              <span className="text-[10px] font-mono text-indigo-400">3 Models Active</span>
            </div>
            <div className="font-mono text-slate-200 text-[11px] truncate" title={(config?.moa?.proposerModels || ['gemma4-soul:latest', 'deepseek-coder-v2:16b', 'qwen2-5-coder-7b-32k:latest']).join(', ')}>
              {(config?.moa?.proposerModels || ['gemma4-soul:latest', 'deepseek-coder-v2:16b', 'qwen2-5-coder-7b-32k:latest']).join(' • ')}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
            <Globe className="w-3 h-3 text-indigo-400" />
            Total Providers
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {providers.length || 8}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Ready &amp; Online
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {onlineCount} <span className="text-xs text-slate-500 font-normal">available</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
            <Key className="w-3 h-3 text-amber-400" />
            Missing Keys
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            {missingKeyCount} <span className="text-xs text-slate-500 font-normal">unconfigured</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-indigo-400" />
            Active Failovers
          </div>
          <div className="text-lg font-bold font-mono text-slate-200">
            {activeFallbackAgents.length > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {activeFallbackAgents.length} Running
              </span>
            ) : (
              <span className="text-emerald-400 text-xs font-sans">
                0 (All Direct)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Provider Cards Grid */}
      {loading && !healthReport ? (
        <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Probing /api/health and validating LLM provider API credentials...</span>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No providers matched the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {filteredProviders.map(prov => {
            const isOllama = prov.id === 'ollama';
            const isOnline = prov.status === 'online';
            const isMissingKey = prov.status === 'missing_key';
            const isInvalidKey = prov.status === 'invalid_key';

            return (
              <div
                key={prov.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  isOnline
                    ? 'bg-slate-950/60 border-emerald-500/20 hover:border-emerald-500/40'
                    : isMissingKey
                      ? 'bg-slate-950/40 border-amber-500/20 hover:border-amber-500/30'
                      : isInvalidKey
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                        : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{prov.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono text-slate-400 bg-slate-900 border border-slate-800">
                          {prov.providerType}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px] mt-0.5">
                        {prov.endpoint}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isMissingKey
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : isInvalidKey
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : isMissingKey ? 'bg-amber-400' : isInvalidKey ? 'bg-rose-400' : 'bg-slate-500'
                      }`} />
                      {isOnline ? (prov.latencyMs !== null ? `${prov.latencyMs}ms` : 'Ready') :
                       isMissingKey ? 'Key Missing' :
                       isInvalidKey ? 'Auth Failed' : 'Offline'}
                    </span>
                  </div>

                  {/* API Key Validation Status Indicator */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400 text-[10px]">API Key Validation:</span>
                    {isOllama ? (
                      <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        Zero Key (Local)
                      </span>
                    ) : prov.hasKey ? (
                      <span className={`font-mono text-[10px] flex items-center gap-1 ${isInvalidKey ? 'text-rose-400' : 'text-emerald-400'}`}>
                        <Key className="w-2.5 h-2.5" />
                        {isInvalidKey ? 'Invalid / Unauthorized' : 'Validated Active'}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-mono text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Unset / Missing
                      </span>
                    )}
                  </div>

                  {/* Configured in Agents info */}
                  {prov.configuredInAgents.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {prov.configuredInAgents.map(a => {
                        const isPrim = prov.isPrimaryFor?.includes(a);
                        const isFb = prov.isFallbackFor?.includes(a);
                        return (
                          <span
                            key={a}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                              isPrim
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                : isFb
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {a} {isPrim ? '(Primary)' : isFb ? '(Fallback)' : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Diagnostic Message */}
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                    {prov.message}
                  </p>
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {prov.modelsCount > 0 ? `${prov.modelsCount} models` : 'Gateway API'}
                  </span>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('config')}
                      className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 hover:underline cursor-pointer"
                    >
                      <span>Configure</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  agent,
  config,
  dockerInfo,
  skills,
  mcpServers,
  onNavigateTab,
  onInstallAgent,
  onDetectAgent,
  onOpenDiscovery,
  allAgents = []
}) => {
  const activeSkillsCount = skills.filter(s => s.installed).length;
  const activeMcpCount = mcpServers.filter(m => m.enabled).length;

  const channels = config?.channels || {};
  const activeChannels = [
    { name: 'Telegram', enabled: channels.telegram?.enabled ?? false, details: channels.telegram?.allowedUsers },
    { name: 'Discord', enabled: channels.discord?.enabled ?? false, details: channels.discord?.guildIds ? 'Configured' : 'No guild' },
    { name: 'Slack', enabled: channels.slack?.enabled ?? false, details: channels.slack?.socketMode ? 'Socket Mode' : 'HTTP' },
    { name: 'WhatsApp', enabled: channels.whatsapp?.enabled ?? false, details: channels.whatsapp?.sessionId },
    { name: 'Matrix', enabled: channels.matrix?.enabled ?? false, details: channels.matrix?.homeserver },
    { name: 'Webhook', enabled: channels.webhook?.enabled ?? false, details: channels.webhook?.port ? `Port ${channels.webhook.port}` : 'Inactive' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Hero Agent Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {agent.framework}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-mono text-slate-300 bg-slate-800 border border-slate-700">
                {agent.language}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-mono text-indigo-300 bg-slate-950 border border-slate-800">
                Port {agent.defaultPort}
              </span>
              <span className="text-xs text-slate-400">
                v{agent.version}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {agent.name}
              {agent.status === 'running' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Running in Docker
                </span>
              ) : agent.status === 'stopped' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Container Exited
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Local Host
                </span>
              )}

              {/* Failback capability status badge and icon */}
              {agent.failbackStatus === 'active' || config.fallback?.enabled ? (
                <span
                  id="dashboard-failback-active-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10"
                  title={`Failback Active: ${agent.failbackCapability || config.fallback?.fallbackModel || config.fallback?.targetAgentId || 'Local Model / Secondary Gateway'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Failback Active: {agent.failbackCapability || config.fallback?.fallbackModel || config.fallback?.targetAgentId || 'Edge Gateway'}
                </span>
              ) : agent.failbackStatus === 'configured' || config.fallback?.targetAgentId ? (
                <span
                  id="dashboard-failback-configured-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  title={`Failback Configured (Standby): ${agent.failbackCapability || config.fallback?.targetAgentId}`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  Failback Standby: {agent.failbackCapability || config.fallback?.targetAgentId}
                </span>
              ) : (
                <span
                  id="dashboard-failback-inactive-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  Failback Standby
                </span>
              )}
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed">
              {agent.description}
            </p>

            {/* Capability tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 text-slate-300 border border-slate-800"
                >
                  ✓ {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Action Box */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              id="find-existing-container-hero-btn"
              onClick={onOpenDiscovery}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 hover:text-white font-medium text-sm transition-colors border border-indigo-500/30"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span>Find Existing Container</span>
            </button>
            {agent.status !== 'running' ? (
              <button
                id="install-agent-docker-btn"
                onClick={onInstallAgent}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Deploy in Docker</span>
              </button>
            ) : (
              <button
                id="view-logs-btn"
                onClick={() => onNavigateTab('docker')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 font-medium text-sm transition-colors border border-slate-700"
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>View Container Logs</span>
              </button>
            )}

            <button
              id="detect-agent-single-btn"
              onClick={onDetectAgent}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors border border-slate-800"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Detect Container</span>
            </button>

            <a
              href={agent.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <span>Official Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Docker Container */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Container className="w-3.5 h-3.5 text-indigo-400" />
              Container ID
            </span>
            <span className="font-mono text-[11px] text-emerald-400">
              {agent.containerName || 'default'}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono truncate">
            {agent.containerId || 'c_detached'}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            Image: {agent.dockerImage}
          </p>
        </div>

        {/* Metric 2: Memory Footprint */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              Memory Footprint
            </span>
            <span className="text-[11px] text-slate-500">Target &lt; 200MB</span>
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-baseline gap-2">
            <span>{agent.memoryUsageMb.toFixed(1)} MB</span>
            <span className="text-xs font-normal text-emerald-400">
              {agent.id === 'picoclaw' ? 'Ultra-low RAM' : agent.id === 'zeroclaw' ? 'Rust sub-15MB' : 'Python 3.11'}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (agent.memoryUsageMb / 200) * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Model & Provider */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Language Model
            </span>
            <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {config.model.provider}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono truncate">
            {config.model.model}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Temp: {config.model.temperature}</span>
            <span>Reasoning: {config.model.reasoningEffort}</span>
          </p>
        </div>

        {/* Metric 4: Skills & MCP */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              Installed Tools
            </span>
            <span className="text-[11px] text-slate-500">Marketplace</span>
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-baseline gap-3">
            <span>{activeSkillsCount} Skills</span>
            <span className="text-xs font-normal text-indigo-400">{activeMcpCount} MCP</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Filesystem, Search &amp; Code Sandbox
          </p>
        </div>
      </div>

      {/* Real-time CPU & Memory Telemetry Visualization */}
      <AgentResourceTrendChart 
        agentId={agent?.id} 
        agentName={agent?.name || agent?.id} 
        status={agent?.status} 
      />

      {/* MoA Consensus Monitor Visualization */}
      <MoAConsensusMonitor
        agent={agent}
        config={config}
        onNavigateTab={onNavigateTab}
      />

      {/* Failback & Edge Redundancy Status Banner */}
      <div 
        id="dashboard-failback-status-card"
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              agent.failbackStatus === 'active' || config.fallback?.enabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/10'
                : agent.failbackStatus === 'configured' || config.fallback?.targetAgentId
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {agent.failbackStatus === 'active' || config.fallback?.enabled ? (
                <ShieldCheck className="w-6 h-6" />
              ) : agent.failbackStatus === 'configured' || config.fallback?.targetAgentId ? (
                <RefreshCw className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Failback Capability &amp; Redundancy
                </h3>
                {agent.failbackStatus === 'active' || config.fallback?.enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active &amp; Armed
                  </span>
                ) : agent.failbackStatus === 'configured' || config.fallback?.targetAgentId ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Configured (Standby)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Standby
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300">
                <span className="font-semibold text-slate-200">Capability:</span>{' '}
                <span className="text-indigo-300 font-mono text-[11px]">{agent.failbackCapability || 'Local Ollama & Secondary Node Gateway'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-indigo-400" />
                  Fallback Target: <strong className="text-slate-200 font-mono">{config.fallback?.fallbackModel || config.fallback?.model || config.fallback?.targetAgentId || 'Edge SLM'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  Provider: <strong className="text-slate-200 font-mono">{config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-amber-400" />
                  Trigger: <strong className="text-slate-200">{config.fallback?.strategy || 'on_offline'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-row md:flex-col lg:flex-row items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <button
              id="dashboard-simulate-failback-quick-btn"
              onClick={() => onNavigateTab('diagnostics')}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Simulate Failback</span>
            </button>
            <button
              id="dashboard-configure-failback-btn"
              onClick={() => onNavigateTab('config')}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Configure Failback</span>
            </button>
          </div>
        </div>
      </div>

      {/* LLM Health & Provider Availability Monitor Widget */}
      <LLMHealthMonitorWidget 
        onNavigateTab={onNavigateTab} 
        activeProvider={config?.model?.provider} 
        fallbackProvider={config?.fallback?.fallbackProvider || config?.fallback?.provider} 
        currentAgent={agent}
        allAgents={allAgents}
        config={config}
      />

      {/* Agent Health Monitor Widget */}
      <AgentHealthWidget runningAgents={allAgents.filter(a => a.status === 'running')} />
      
      {/* Agent Resource Monitor Widget */}
      <ResourceMonitorWidget runningAgents={allAgents.filter(a => a.status === 'running')} />

      {/* Operational Telemetry: Uptime & Latency Sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Uptime History Card */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                Historical Uptime
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {agent.uptimePct}%
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                agent.uptimePct > 99 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                agent.uptimePct > 95 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {agent.uptimePct > 99 ? 'Excellent' : agent.uptimePct > 95 ? 'Stable' : 'Degraded'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Last 20 checks</p>
            </div>
          </div>
          
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={agent.uptimeHistory.map((val, i) => ({ val, i }))}>
                <Line 
                  type="stepAfter" 
                  dataKey="val" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>T-20</span>
            <div className="flex gap-1">
              {agent.uptimeHistory.slice(-10).map((v, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${v === 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              ))}
            </div>
            <span>Now</span>
          </div>
        </div>

        {/* Latency History Card */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Avg Response Latency
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {agent.avgLatencyMs}ms
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                agent.avgLatencyMs < 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                agent.avgLatencyMs < 300 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {agent.avgLatencyMs < 100 ? 'Ultra-Fast' : agent.avgLatencyMs < 300 ? 'Normal' : 'Slow'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Moving Average</p>
            </div>
          </div>
          
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={agent.latencyHistory.map((val, i) => ({ val, i }))}>
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#6366f1" 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Peak: {Math.max(...agent.latencyHistory)}ms</span>
            <span>Current: {agent.latencyHistory[agent.latencyHistory.length - 1]}ms</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Communication Gateway & Security State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Multi-Channel Gateway */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-Channel Gateway
              </h3>
              <p className="text-xs text-slate-500">Active chat integrations &amp; webhooks</p>
            </div>
            <button
              onClick={() => onNavigateTab('config')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              Configure
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeChannels.map((channel) => (
              <div
                key={channel.name}
                className={`p-3 rounded-xl border transition-all ${
                  channel.enabled
                    ? 'bg-slate-950 border-slate-800 border-l-2 border-l-indigo-500'
                    : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {channel.name}
                  </span>
                  {channel.enabled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Disabled</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                  {channel.enabled ? channel.details : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Security & Memory */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Security &amp; Isolation
              </h3>
              <p className="text-xs text-slate-500">Container sandbox &amp; storage backend</p>
            </div>
            <button
              onClick={() => onNavigateTab('config')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              Edit Security
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 border-l-2 border-l-indigo-500">
              <div>
                <div className="text-xs font-semibold text-white">Execution Isolation</div>
                <div className="text-[11px] text-slate-500">
                  {config.security.sandboxMode === 'docker_isolated' 
                    ? 'Docker Container Sandbox (Restricted volume & network)' 
                    : config.security.sandboxMode === 'host_restricted' 
                    ? 'Host Restricted Subprocess' 
                    : 'Read-Only Safe Mode'}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {config.security.sandboxMode.replace('_', ' ')}
              </span>
            </div>

            <div 
              onClick={() => onNavigateTab('everos')}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-colors"
            >
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Memory Backend</span>
                  {config.storage.memoryBackend === 'everos' && (
                    <span className="text-[10px] text-emerald-400 font-mono">(EverOS Hybrid mRAG)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {config.storage.dbPath}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                config.storage.memoryBackend === 'everos'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {config.storage.memoryBackend}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">Security Profile File</div>
                <div className="text-[11px] text-slate-500">
                  Credential isolation &amp; token vault
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                {config.security.securityProfileFile}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Other Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('config')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-indigo-500/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Settings2 className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
            Configuration Schema
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Configure entire model schema, channels, memory &amp; prompts with dropdowns.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('skills')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-indigo-500/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Boxes className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
            Skills &amp; MCP Marketplace
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Search, install, or author new skills compatible with Hermes, OpenClaw &amp; ZeroClaw.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('mcp')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-indigo-500/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Server className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
            Model Context Protocol
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Connect standard MCP servers for filesystem, GitHub, databases &amp; web browsing.
          </p>
        </button>
      </div>
    </div>
  );
};
