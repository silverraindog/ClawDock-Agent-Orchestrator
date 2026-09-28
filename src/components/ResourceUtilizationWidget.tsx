import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Cpu, Zap } from 'lucide-react';
import { AgentInfo } from '../types';

export const ResourceUtilizationWidget: React.FC<{ runningAgents: AgentInfo[] }> = ({ runningAgents }) => {
  const [data, setData] = useState<{ time: string; cpu: number; mem: number; name: string }[]>([]);

  useEffect(() => {
    const updateData = () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newData = runningAgents.map(agent => ({
        time: now,
        cpu: agent.cpuUsagePct,
        mem: agent.memoryUsageMb,
        name: agent.name
      }));
      setData(prev => [...prev, ...newData].slice(-20)); // Keep last 20 points
    };

    const interval = setInterval(updateData, 3000);
    return () => clearInterval(interval);
  }, [runningAgents]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          Resource Utilization (CPU/Memory)
        </h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
            <YAxis yAxisId="left" stroke="#6366f1" fontSize={11} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="cpu" name="CPU (%)" stroke="#6366f1" fill="#6366f1" />
            <Area yAxisId="right" type="monotone" dataKey="mem" name="Memory (MB)" stroke="#10b981" fill="#10b981" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
