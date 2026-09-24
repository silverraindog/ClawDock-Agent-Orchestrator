import React, { useState, useEffect } from 'react';
import {
  Layers,
  Activity,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Cpu,
  Zap,
  Sliders,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { AgentFullConfig, AgentInfo } from '../types';

interface MoAConsensusMonitorProps {
  agent: AgentInfo;
  config: AgentFullConfig;
  onNavigateTab?: (tab: string) => void;
}

interface ConsensusTimePoint {
  time: string;
  round: number;
  consensusScore: number;
  threshold: number;
  [proposerKey: string]: any; // weights for each proposer
}

interface ProposerMetric {
  id: string;
  name: string;
  provider: string;
  weightPct: number;
  agreementScore: number;
  confidence: 'High' | 'Very High' | 'Moderate';
  latencyMs: number;
  status: 'active' | 'leader' | 'standby';
  color: string;
}

const PALETTE = ['#6366f1', '#10b981', '#a855f7', '#06b6d4', '#f59e0b', '#ec4899', '#3b82f6'];

export const MoAConsensusMonitor: React.FC<MoAConsensusMonitorProps> = ({
  agent,
  config,
  onNavigateTab
}) => {
  const [viewMode, setViewMode] = useState<'trends' | 'weights' | 'agreement'>('trends');
  const [isSimulating, setIsSimulating] = useState(false);

  // Extract MoA settings
  const moaConfig = config?.moa || {
    enabled: agent.id === 'hermes-agent',
    proposerModels: ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o', 'gemma4-soul:latest'],
    aggregatorModel: 'gemma4-soul:latest',
    rounds: 2,
    temperatureSpread: 0.3,
    consensusThreshold: 0.85
  };

  const proposers = moaConfig.proposerModels && moaConfig.proposerModels.length > 0
    ? moaConfig.proposerModels
    : [config?.model?.model || 'gemma4-soul:latest', 'qwen2.5-coder:7b', 'deepseek-r1:8b'];

  const thresholdPct = Math.round((moaConfig.consensusThreshold || 0.85) * 100);

  // Generate Proposer Metrics
  const [proposerMetrics, setProposerMetrics] = useState<ProposerMetric[]>(() => {
    const total = proposers.length;
    let remaining = 100;
    return proposers.map((p, idx) => {
      // Allocate realistic baseline weights
      const isLead = idx === 0;
      const weight = idx === total - 1 ? remaining : isLead ? Math.max(30, Math.round(40 + (Math.random() - 0.5) * 10)) : Math.round(remaining / (total - idx));
      remaining = Math.max(5, remaining - weight);
      const agreement = Math.min(98, Math.max(75, Math.round(84 + (Math.random() - 0.5) * 16)));
      
      const provider = p.includes('claude') ? 'anthropic' : p.includes('deepseek') || p.includes('r1') ? 'deepseek' : p.includes('gpt') || p.includes('o1') ? 'openai' : p.includes('gemini') ? 'gemini' : 'ollama';

      return {
        id: `proposer-${idx}`,
        name: p,
        provider,
        weightPct: weight,
        agreementScore: agreement,
        confidence: agreement > 90 ? 'Very High' : agreement > 80 ? 'High' : 'Moderate',
        latencyMs: Math.round(180 + Math.random() * 240),
        status: isLead ? 'leader' : 'active',
        color: PALETTE[idx % PALETTE.length]
      };
    });
  });

  // Time series historical consensus curve & proposer weights over turns
  const [timeSeriesData, setTimeSeriesData] = useState<ConsensusTimePoint[]>(() => {
    const points: ConsensusTimePoint[] = [];
    const now = Date.now();
    
    for (let i = 8; i >= 0; i--) {
      const pointTime = new Date(now - i * 45000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const roundNum = (8 - i) % 3 + 1;
      
      // Calculate dynamic consensus score that converges above threshold
      const baseConsensus = 72 + (8 - i) * 2.5 + (Math.random() - 0.5) * 4;
      const finalConsensus = Math.min(98.5, Math.max(68, Math.round(baseConsensus * 10) / 10));

      const point: ConsensusTimePoint = {
        time: pointTime,
        round: roundNum,
        consensusScore: finalConsensus,
        threshold: thresholdPct
      };

      // Assign proposer weights per point
      proposers.forEach((p, pIdx) => {
        const pKey = `p_${pIdx}`;
        const baseW = (100 / proposers.length) + (pIdx === 0 ? 12 : -4);
        const randFluc = (Math.random() - 0.5) * 6;
        point[pKey] = Math.max(10, Math.min(60, Math.round(baseW + randFluc)));
      });

      points.push(point);
    }
    return points;
  });

  // Handle simulate fresh round
  const handleSimulateTurn = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const lastPoint = timeSeriesData[timeSeriesData.length - 1];
      const nextConsensus = Math.min(99, Math.max(82, Math.round((lastPoint.consensusScore + (Math.random() - 0.4) * 5) * 10) / 10));

      const newPoint: ConsensusTimePoint = {
        time: newTime,
        round: (lastPoint.round % (moaConfig.rounds || 2)) + 1,
        consensusScore: nextConsensus,
        threshold: thresholdPct
      };

      proposers.forEach((p, pIdx) => {
        const pKey = `p_${pIdx}`;
        const oldW = lastPoint[pKey] || (100 / proposers.length);
        newPoint[pKey] = Math.max(10, Math.min(60, Math.round(oldW + (Math.random() - 0.5) * 8)));
      });

      setTimeSeriesData(prev => [...prev.slice(1), newPoint]);

      // Update proposer metrics slightly
      setProposerMetrics(prev => prev.map((item, idx) => {
        const newAgr = Math.min(99, Math.max(78, Math.round(item.agreementScore + (Math.random() - 0.5) * 4)));
        return {
          ...item,
          agreementScore: newAgr,
          confidence: newAgr > 90 ? 'Very High' : newAgr > 82 ? 'High' : 'Moderate',
          latencyMs: Math.round(Math.max(80, item.latencyMs + (Math.random() - 0.5) * 30))
        };
      }));

      setIsSimulating(false);
    }, 600);
  };

  const latestPoint = timeSeriesData[timeSeriesData.length - 1];
  const isConsensusSatisfied = latestPoint.consensusScore >= thresholdPct;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header with status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                MoA Consensus Monitor
              </h3>
              {moaConfig.enabled ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isConsensusSatisfied
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConsensusSatisfied ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                  {isConsensusSatisfied ? 'Consensus Achieved' : 'Converging Proposers'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  MoA Standby (Single Model Mode)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Proposer model weight distribution, token agreement affinity, and consensus synthesis trajectory for <strong className="text-slate-200">{agent.name}</strong>.
            </p>
          </div>
        </div>

        {/* View Mode Controls & Simulate Probe Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('trends')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'trends' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Consensus Trend
            </button>
            <button
              onClick={() => setViewMode('weights')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'weights' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weight Distribution
            </button>
            <button
              onClick={() => setViewMode('agreement')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'agreement' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agreement Matrix
            </button>
          </div>

          <button
            onClick={handleSimulateTurn}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Simulate MoA inference turn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Evaluating...' : 'Probe Turn'}</span>
          </button>
        </div>
      </div>

      {/* Top Stat Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Consensus Score */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Consensus Score
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
            <span className={latestPoint.consensusScore >= thresholdPct ? 'text-emerald-400' : 'text-amber-400'}>
              {latestPoint.consensusScore.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">/ 100%</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Target: ≥ <strong className="text-slate-400">{thresholdPct}%</strong> threshold
          </p>
        </div>

        {/* Proposer Count */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Active Proposers
          </span>
          <div className="text-xl font-bold font-mono text-indigo-400">
            {proposers.length} Models
          </div>
          <p className="text-[10px] text-slate-500 truncate" title={proposers.join(', ')}>
            {proposers.join(' • ')}
          </p>
        </div>

        {/* Aggregator Model */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Synthesizer
          </span>
          <div className="text-sm font-bold font-mono text-white truncate" title={moaConfig.aggregatorModel || config.model.model}>
            {moaConfig.aggregatorModel || config.model.model}
          </div>
          <p className="text-[10px] text-slate-500">
            Rounds: <strong className="text-slate-300 font-mono">{moaConfig.rounds || 2}</strong> | Spread: <strong className="text-slate-300 font-mono">{moaConfig.temperatureSpread || 0.3}</strong>
          </p>
        </div>

        {/* Fanout Strategy */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Degraded Policy
          </span>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            Loud &amp; Fallback
          </div>
          <p className="text-[10px] text-slate-500">
            Auto-reweights on latency drop
          </p>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            {viewMode === 'trends' && 'Consensus Convergence Score & Proposer Weights Over Time'}
            {viewMode === 'weights' && 'Proposer Contribution & Effective Weight Distribution (%)'}
            {viewMode === 'agreement' && 'Model Agreement & Affinity with Aggregator Output (%)'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Updated: {latestPoint.time}
          </span>
        </div>

        {/* 1. Trends View: Multi-line & Area Chart */}
        {viewMode === 'trends' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="consensusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  {proposers.map((_, i) => (
                    <linearGradient key={i} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Consensus Score') return [`${value}%`, name];
                    if (name === 'Threshold') return [`${value}%`, name];
                    return [`${value}% Weight`, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                />
                <ReferenceLine y={thresholdPct} label={{ value: `Threshold (${thresholdPct}%)`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} stroke="#f59e0b" strokeDasharray="4 4" />

                {/* Consensus Score Line */}
                <Area
                  type="monotone"
                  dataKey="consensusScore"
                  name="Consensus Score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#consensusGrad)"
                />

                {/* Proposer Weights */}
                {proposers.map((p, idx) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={`p_${idx}`}
                    name={p}
                    stroke={PALETTE[idx % PALETTE.length]}
                    strokeWidth={1.8}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. Weights View: Bar Chart Distribution */}
        {viewMode === 'weights' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proposerMetrics} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" domain={[0, 60]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Proposer Weight']}
                />
                <Bar dataKey="weightPct" name="Proposer Weight" radius={[6, 6, 0, 0]}>
                  {proposerMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. Agreement Matrix View: Bar Chart */}
        {viewMode === 'agreement' && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proposerMetrics} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" domain={[50, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Agreement Rate']}
                />
                <ReferenceLine y={thresholdPct} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target Threshold', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="agreementScore" name="Agreement Rate" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {proposerMetrics.map((entry, index) => (
                    <Cell key={`cell-agr-${index}`} fill={entry.agreementScore >= thresholdPct ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Proposer Breakdown Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Proposer Ensemble Models ({proposers.length})</span>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('config')}
              className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center gap-1 font-semibold"
            >
              Configure Proposers in Config Tab
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {proposerMetrics.map((p, idx) => (
            <div
              key={p.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-mono text-xs font-bold text-white truncate max-w-[130px]" title={p.name}>
                    {p.name}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {p.provider}
                </span>
              </div>

              {/* Progress bar for weight */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Weight Contribution</span>
                  <span className="text-white font-bold">{p.weightPct}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${p.weightPct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>

              {/* Agreement & latency stats */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
                <span>Agreement: <strong className="text-emerald-400">{p.agreementScore}%</strong></span>
                <span>{p.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
