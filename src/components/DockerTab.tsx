import React, { useState } from 'react';
import { 
  Container,
  Search, 
  Terminal, 
  Play, 
  Square, 
  RotateCw, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  HardDrive, 
  Cpu, 
  Activity, 
  Layers,
  FileCode,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { AgentInfo, DockerSystemInfo, AgentId } from '../types';

interface DockerTabProps {
  agents: AgentInfo[];
  selectedAgentId: AgentId;
  dockerInfo: DockerSystemInfo;
  containerLogs: string[];
  onStartAgent: (agentId: AgentId) => void;
  onStopAgent: (agentId: AgentId) => void;
  onInstallAgent: (agentId: AgentId) => void;
  onRefreshDetect: () => void;
  onOpenDiscovery: () => void;
  onAddToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const DockerTab: React.FC<DockerTabProps> = ({
  agents,
  selectedAgentId,
  dockerInfo,
  containerLogs,
  onStartAgent,
  onStopAgent,
  onInstallAgent,
  onRefreshDetect,
  onOpenDiscovery,
  onAddToast
}) => {
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [logFilter, setLogFilter] = useState('');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        onAddToast('success', 'Backend Healthy', `API responding correctly (Uptime: ${Math.round(data.uptime)}s)`);
      } else {
        onAddToast('error', 'Health Check Failed', 'Backend responded with non-OK status');
      }
    } catch (e: any) {
      onAddToast('error', 'Health Check Failed', `Could not reach backend /api/health: ${e.message}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const dockerComposeSnippet = `version: '3.8'

services:
  clawdock-orchestrator:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: clawdock-web
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data/configs:/data/configs
      - ./workspace:/workspace
    environment:
      - PORT=3000
      - PYTHONUNBUFFERED=1
      - DOCKER_HOST=unix:///var/run/docker.sock
    restart: unless-stopped
    networks:
      - claw-network

  hermes-agent:
    image: ghcr.io/nousresearch/hermes-agent:latest
    container_name: hermes-agent-core
    ports:
      - "8080:8080"
    volumes:
      - ./workspace:/workspace
      - ./data/hermes:/data
    environment:
      - HERMES_PORT=8080
    restart: unless-stopped
    networks:
      - claw-network

  zeroclaw:
    image: zeroclaw/zeroclaw:latest
    container_name: zeroclaw-daemon
    ports:
      - "8081:8081"
    volumes:
      - ./workspace:/var/zeroclaw/workspace
    environment:
      - RUST_LOG=info
      - ZEROCLAW_PORT=8081
    restart: unless-stopped
    networks:
      - claw-network

  openclaw:
    image: openclaw/openclaw:latest
    container_name: openclaw-hub
    ports:
      - "8082:8082"
    volumes:
      - ./workspace:/workspace
    environment:
      - NODE_ENV=production
      - PORT=8082
    restart: unless-stopped
    networks:
      - claw-network

  picoclaw:
    image: sipeed/picoclaw:latest
    container_name: picoclaw-edge
    ports:
      - "8083:8083"
    volumes:
      - ./workspace:/home/sipeed/.picoclaw/workspace
    restart: unless-stopped
    networks:
      - claw-network

networks:
  claw-network:
    driver: bridge`;

  const copyCompose = () => {
    navigator.clipboard.writeText(dockerComposeSnippet);
    setCopiedCompose(true);
    setTimeout(() => setCopiedCompose(false), 2000);
  };

  const filteredLogs = containerLogs.filter(line => 
    line.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Docker System Status Overview */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Container className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Docker Engine Runtime</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-indigo-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {dockerInfo.environment}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Daemon: {dockerInfo.daemonVersion} • Socket: {dockerInfo.socketPath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="docker-tab-health-btn"
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              {isCheckingHealth ? 'Checking...' : 'Health Check'}
            </button>
            <button
              id="docker-tab-discovery-btn"
              onClick={onOpenDiscovery}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Find Containers (Wildcard)
            </button>
            <button
              id="docker-tab-detect-btn"
              onClick={onRefreshDetect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              Re-scan Containers
            </button>
          </div>
        </div>

        {/* Telemetry chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Running Containers</div>
            <div className="text-lg font-bold text-indigo-400 font-mono">
              {agents.filter(a => a.status === 'running').length} / {agents.length}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Operating System</div>
            <div className="text-xs font-semibold text-slate-200 truncate mt-1">
              {dockerInfo.operatingSystem}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Container Network</div>
            <div className="text-xs font-semibold text-indigo-400 font-mono mt-1">
              bridge (claw-network)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Mounted Volume</div>
            <div className="text-xs font-semibold text-slate-200 font-mono mt-1">
              /workspace (rw)
            </div>
          </div>
        </div>
      </div>

      {/* Wildcard Container Discovery Banner */}
      <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900 border-l-4 border-l-indigo-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Search className="w-4 h-4 text-indigo-400" />
            Wildcard Host Container Discovery
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Already have existing <span className="text-indigo-300 font-mono">hermes-agent</span>, <span className="text-indigo-300 font-mono">zeroclaw</span>, <span className="text-indigo-300 font-mono">openclaw</span>, or <span className="text-indigo-300 font-mono">picoclaw</span> containers running on your Docker daemon? Run a wildcard search to detect and ask you to confirm and link them.
          </p>
        </div>
        <button
          onClick={onOpenDiscovery}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Launch Wildcard Container Search</span>
        </button>
      </div>

      {/* Agents Container Grid */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Managed Bot Agent Containers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const isCurrent = agent.id === selectedAgentId;
            return (
              <div
                key={agent.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-slate-900/90 border-l-2 border-l-indigo-500 bg-slate-900'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {agent.language}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {agent.dockerImage}
                      </div>
                    </div>

                    <div>
                      {agent.status === 'running' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-indigo-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Running
                        </span>
                      ) : agent.status === 'stopped' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Stopped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Host Local
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Port Mapping</span>
                      <span className="text-indigo-400">{agent.defaultPort}:{agent.defaultPort}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Container ID</span>
                      <span className="text-slate-300 truncate block">{agent.containerId || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-mono">
                    RAM: {agent.memoryUsageMb.toFixed(1)} MB
                  </span>

                  <div className="flex items-center gap-2">
                    {agent.status === 'running' ? (
                      <button
                        onClick={() => onStopAgent(agent.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartAgent(agent.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-indigo-400 hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start
                      </button>
                    )}

                    <button
                      onClick={() => onInstallAgent(agent.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors"
                      title="Pull latest image & recreate"
                    >
                      <RotateCw className="w-3 h-3" />
                      Re-pull
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Container Logs Console */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Container Output Logs ({currentAgent.name})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter logs..."
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto space-y-1 leading-relaxed">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => (
              <div key={idx} className="hover:bg-slate-900/40 px-1 py-0.5 rounded">
                <span className="text-slate-600 select-none mr-2">[{idx + 1}]</span>
                <span className={log.includes('Error') || log.includes('error') ? 'text-rose-400' : log.includes('WARN') ? 'text-amber-400' : 'text-slate-300'}>
                  {log}
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic py-4 text-center">
              No matching logs captured yet. Container is waiting for incoming triggers.
            </div>
          )}
        </div>
      </div>

      {/* Docker Compose File Viewer */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              docker-compose.yml Specification
            </h3>
          </div>

          <button
            onClick={copyCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {copiedCompose ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCompose ? 'Copied' : 'Copy Compose'}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {dockerComposeSnippet}
        </pre>
      </div>
    </div>
  );
};
