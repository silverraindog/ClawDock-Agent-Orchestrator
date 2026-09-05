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
  Sparkles
} from 'lucide-react';
import { AgentFullConfig, AgentInfo, DockerSystemInfo, SkillItem, MCPServerConfig } from '../types';

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
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  agent,
  config,
  dockerInfo,
  skills,
  mcpServers,
  onNavigateTab,
  onInstallAgent,
  onDetectAgent,
  onOpenDiscovery
}) => {
  const activeSkillsCount = skills.filter(s => s.installed).length;
  const activeMcpCount = mcpServers.filter(m => m.enabled).length;

  const activeChannels = [
    { name: 'Telegram', enabled: config.channels.telegram.enabled, details: config.channels.telegram.allowedUsers },
    { name: 'Discord', enabled: config.channels.discord.enabled, details: config.channels.discord.guildIds ? 'Configured' : 'No guild' },
    { name: 'Slack', enabled: config.channels.slack.enabled, details: config.channels.slack.socketMode ? 'Socket Mode' : 'HTTP' },
    { name: 'WhatsApp', enabled: config.channels.whatsapp.enabled, details: config.channels.whatsapp.sessionId },
    { name: 'Matrix', enabled: config.channels.matrix.enabled, details: config.channels.matrix.homeserver },
    { name: 'Webhook', enabled: config.channels.webhook.enabled, details: `Port ${config.channels.webhook.port}` },
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

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">Episodic Memory Database</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {config.storage.dbPath}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
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
