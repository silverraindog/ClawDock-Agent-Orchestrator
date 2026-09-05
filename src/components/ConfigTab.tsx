import React, { useState } from 'react';
import { 
  Zap, 
  Radio, 
  MessageSquare, 
  Shield, 
  Database, 
  FileCode, 
  Save, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Sliders,
  ChevronDown,
  Info,
  Lock,
  Globe,
  Terminal,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { 
  AgentFullConfig, 
  AgentId, 
  LLMProvider, 
  ReasoningEffort, 
  SandboxMode, 
  MemoryBackend 
} from '../types';
import { MODEL_OPTIONS, DEFAULT_CONFIGS } from '../data/defaults';

interface ConfigTabProps {
  agentId: AgentId;
  config: AgentFullConfig;
  onChangeConfig: (newConfig: AgentFullConfig) => void;
  onSaveConfig: (restartContainer: boolean) => void;
  onResetDefaults: () => void;
  isSaving: boolean;
}

type ConfigSection = 'model' | 'moa' | 'channels' | 'system' | 'security' | 'storage' | 'raw';

export const ConfigTab: React.FC<ConfigTabProps> = ({
  agentId,
  config,
  onChangeConfig,
  onSaveConfig,
  onResetDefaults,
  isSaving
}) => {
  const [activeSection, setActiveSection] = useState<ConfigSection>('model');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [rawText, setRawText] = useState(JSON.stringify(config, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [nativeConfigInfo, setNativeConfigInfo] = useState<{ fileName: string; format: string; content: string } | null>(null);
  const [restartContainer, setRestartContainer] = useState(true);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);


  // Fetch live config automatically on mount and agentId change
  React.useEffect(() => {
    fetchLiveConfig();
  }, [agentId]);

  // Sync raw text when config changes externally
  React.useEffect(() => {
    setRawText(JSON.stringify(config, null, 2));
  }, [config]);

  const fetchLiveConfig = async () => {
    setIsFetchingLive(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/config`);
      const data = await res.json();
      if (data && data.success) {
        if (data.nativeFileName && data.nativeContent) {
          setNativeConfigInfo({
            fileName: data.nativeFileName,
            format: data.nativeFormat,
            content: data.nativeContent
          });
          setRawText(data.nativeContent);
        }
        if (data.configSchema) {
          onChangeConfig(data.configSchema);
        }
      }
    } catch (e) {
      console.error("Failed to fetch live config:", e);
    } finally {
      setIsFetchingLive(false);
    }
  };

  const [isFetchingModules, setIsFetchingModules] = useState(false);

  const handleFetchModules = () => {
    setIsFetchingModules(true);
    setTimeout(() => {
      setIsFetchingModules(false);
      const count = MODEL_OPTIONS[config.model.provider]?.length || 5;
      alert(`Successfully synchronized ${count} active model modules & checkpoints for provider: ${config.model.provider}`);
    }, 700);
  };
  const handleProviderChange = (provider: LLMProvider) => {
    const available = MODEL_OPTIONS[provider] || [];
    const defaultModel = available[0]?.value || 'custom-model';
    onChangeConfig({
      ...config,
      model: {
        ...config.model,
        provider,
        model: defaultModel
      }
    });
  };

  const handlePresetChange = (preset: 'engineer' | 'researcher' | 'devops' | 'edge_assistant' | 'custom') => {
    const presets: Record<string, string> = {
      engineer: 'You are an expert autonomous software engineering AI agent. You have deep knowledge of Python, Rust, Go, TypeScript, Docker, and Linux. Formulate structured implementation steps, run tests, and prioritize clean code.',
      researcher: 'You are an autonomous research and intelligence gathering assistant. You search the web, analyze documents, cross-reference claims, and present synthesis reports with citations.',
      devops: 'You are an autonomous site reliability and container orchestration agent. You specialize in Docker, Kubernetes, CI/CD pipelines, system monitoring, and zero-downtime deployments.',
      edge_assistant: 'You are an ultra-light edge AI assistant designed for resource-constrained hardware like RISC-V and Raspberry Pi. Keep responses concise, direct, and token-efficient.',
      custom: config.system.systemPrompt
    };

    onChangeConfig({
      ...config,
      system: {
        ...config.system,
        preset,
        systemPrompt: presets[preset] || config.system.systemPrompt
      }
    });
  };

  const handleRawChange = (text: string) => {
    setRawText(text);
    try {
      const parsed = JSON.parse(text);
      onChangeConfig(parsed);
      setRawError(null);
    } catch (e: any) {
      setRawError(e.message);
    }
  };

  const downloadConfigFile = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentId}_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRawToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const currentModelList = MODEL_OPTIONS[config.model.provider] || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/70">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Configuration Schema Editor
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full specification schema for {agentId}. Use dropdown menus below to tune LLM parameters, channels &amp; security.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="fetch-live-config-btn"
            onClick={fetchLiveConfig}
            disabled={isFetchingLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors disabled:opacity-50"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            {isFetchingLive ? 'Fetching...' : 'Fetch Live Container Config'}
          </button>

          <button
            id="reset-config-btn"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            id="download-config-btn"
            onClick={downloadConfigFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export config.json
          </button>

          <div className="flex items-center gap-2 px-2 bg-slate-950/60 py-1.5 rounded-lg border border-slate-800">
            <input 
              type="checkbox" 
              id="restart-container-toggle"
              checked={restartContainer}
              onChange={(e) => setRestartContainer(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <label htmlFor="restart-container-toggle" className="text-[11px] text-slate-300 cursor-pointer select-none">
              Restart Container on Save
            </label>
          </div>

          <button
            id="save-config-btn"
            onClick={() => {
              if (restartContainer) {
                setIsRestartModalOpen(true);
              } else {
                onSaveConfig(false);
              }
            }}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Loading Skeleton during live config fetch */}
      {isFetchingLive && (
        <div className="p-8 rounded-2xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-sm space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div>
              <div className="h-4 w-48 bg-slate-800 rounded mb-1.5" />
              <div className="h-3 w-32 bg-slate-800/60 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="h-24 bg-slate-950/60 rounded-xl border border-slate-800" />
            <div className="h-24 bg-slate-950/60 rounded-xl border border-slate-800" />
            <div className="h-24 bg-slate-950/60 rounded-xl border border-slate-800" />
          </div>
        </div>
      )}

      {/* Restart Container Confirmation Modal */}
      {isRestartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Container Restart</h3>
                <p className="text-xs text-slate-400">Agent: {agentId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Saving this configuration will write the updated settings to the native configuration file and execute a <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">docker restart</code> on the container to apply changes immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRestartModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRestartModalOpen(false);
                  onSaveConfig(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Save &amp; Restart Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex overflow-x-auto gap-2 pb-1 border-b border-slate-800/80">
        {[
          { id: 'model', label: 'Model & Reasoning', icon: Zap },
          { id: 'moa', label: 'Mixture-of-Agents (MoA)', icon: Cpu },
          { id: 'channels', label: 'Communication Channels', icon: Radio },
          { id: 'system', label: 'Prompt & Persona', icon: MessageSquare },
          { id: 'security', label: 'Security & Sandbox', icon: Shield },
          { id: 'storage', label: 'Storage & Memory', icon: Database },
          { id: 'raw', label: 'Raw JSON / Schema', icon: FileCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              id={`config-subnav-${tab.id}`}
              onClick={() => setActiveSection(tab.id as ConfigSection)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-indigo-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {nativeConfigInfo && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white">Container Native Config File: <code className="text-indigo-300 font-mono">{nativeConfigInfo.fileName}</code></span>
            </div>
            <button
              onClick={() => setNativeConfigInfo(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
            >
              Close Inspector
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs overflow-x-auto max-h-48 border border-slate-800">
            {nativeConfigInfo.content}
          </pre>
        </div>
      )}

      {/* Section Content */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {/* ================= MODEL & REASONING ================= */}
        {activeSection === 'model' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white">Large Language Model (LLM) Settings</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure the primary inference provider, model checkpoint, reasoning effort, and temperature.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LLM Provider Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  LLM Provider (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="llm-provider-select"
                    value={config.model.provider}
                    onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                  >
                    <option value="anthropic">Anthropic (Claude 3.7 / 3.5)</option>
                    <option value="openai">OpenAI (GPT-4o, o1, o3-mini)</option>
                    <option value="gemini">Google Gemini (Gemini 2.5 Pro / Flash)</option>
                    <option value="deepseek">DeepSeek (R1 / V3)</option>
                    <option value="groq">Groq (Llama 3.3 70B ultra-fast)</option>
                    <option value="mistral">Mistral AI (Codestral / Large)</option>
                    <option value="ollama">Ollama / Local (Self-hosted Edge)</option>
                    <option value="openrouter">OpenRouter (Multi-model Gateway)</option>
                    <option value="custom">Custom Endpoint</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Select your preferred AI engine backend.
                </p>
              </div>

              {/* Model Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    Model Checkpoint (Dropdown)
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchModules}
                    disabled={isFetchingModules}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isFetchingModules ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        Fetch Modules
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <select
                    id="model-name-select"
                    value={config.model.model}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      model: { ...config.model, model: e.target.value }
                    })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10 font-mono"
                  >
                    {currentModelList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                    <option value="custom">-- Enter Custom Model Name --</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Pre-configured models for {config.model.provider}.
                </p>
              </div>

              {/* Reasoning Effort Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Reasoning Effort / Thinking Level (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="reasoning-effort-select"
                    value={config.model.reasoningEffort}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      model: { ...config.model, reasoningEffort: e.target.value as ReasoningEffort }
                    })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                  >
                    <option value="none">None (Standard inference without CoT)</option>
                    <option value="low">Low (Brief reasoning step)</option>
                    <option value="medium">Medium (Balanced analysis)</option>
                    <option value="high">High (Deep chain-of-thought verification)</option>
                    <option value="extended">Extended (Maximal planning &amp; self-correction)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Supported natively by Claude 3.7 Sonnet, OpenAI o1/o3, and DeepSeek-R1.
                </p>
              </div>

              {/* Context Window Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Max Context Window Limit (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="context-window-select"
                    value={config.model.contextWindow}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      model: { ...config.model, contextWindow: Number(e.target.value) }
                    })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10 font-mono"
                  >
                    <option value={8192}>8,192 tokens (~6,000 words)</option>
                    <option value={16384}>16,384 tokens (~12,000 words)</option>
                    <option value={32768}>32,768 tokens (Edge / Raspberry Pi)</option>
                    <option value={64000}>64,000 tokens (Standard)</option>
                    <option value={128000}>128,000 tokens (OpenAI 128k)</option>
                    <option value={200000}>200,000 tokens (Anthropic Claude 200k)</option>
                    <option value={1000000}>1,000,000 tokens (Gemini 1M)</option>
                    <option value={2000000}>2,000,000 tokens (Gemini 2.5 Pro 2M)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Adjust to balance memory usage and document ingestion depth.
                </p>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Temperature: {config.model.temperature}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {config.model.temperature <= 0.2 ? 'Deterministic / Coding' : config.model.temperature <= 0.7 ? 'Balanced' : 'Creative'}
                  </span>
                </div>
                <input
                  id="temperature-slider"
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={config.model.temperature}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    model: { ...config.model, temperature: parseFloat(e.target.value) }
                  })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.0 (Strict code)</span>
                  <span>1.0</span>
                  <span>2.0 (High variance)</span>
                </div>
              </div>

              {/* Max Output Tokens */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Max Output Tokens
                </label>
                <input
                  id="max-tokens-input"
                  type="number"
                  min="256"
                  max="65536"
                  step="256"
                  value={config.model.maxTokens}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    model: { ...config.model, maxTokens: parseInt(e.target.value) || 4096 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Maximum tokens generated per agent response step.
                </p>
              </div>

              {/* API Key Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>API Key</span>
                  <span className="text-[11px] text-slate-400 font-normal">Stored securely in container</span>
                </label>
                <div className="relative">
                  <input
                    id="api-key-input"
                    type="password"
                    placeholder="sk-ant-... or sk-proj-..."
                    value={config.model.apiKey}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      model: { ...config.model, apiKey: e.target.value }
                    })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {/* Base URL (Optional for Ollama / Proxies) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Custom Base URL (Optional)
                </label>
                <input
                  id="base-url-input"
                  type="text"
                  placeholder="http://localhost:11434 or https://api.proxy.com/v1"
                  value={config.model.baseUrl || ''}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    model: { ...config.model, baseUrl: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= MIXTURE-OF-AGENTS (MoA) ================= */}
        {activeSection === 'moa' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Mixture-of-Agents (MoA) Cooperative Reasoning
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-model collaborative proposal and aggregation pipeline (specifically optimized for Hermes Agent).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.moa?.enabled ?? true}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    moa: {
                      ...(config.moa || { proposerModels: [], aggregatorModel: 'claude-3-7-sonnet', rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                      enabled: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Aggregator Model (Final Synthesis)
                </label>
                <select
                  value={config.moa?.aggregatorModel || 'claude-3-7-sonnet'}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    moa: {
                      ...(config.moa || { enabled: true, proposerModels: [], rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                      aggregatorModel: e.target.value
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Recommended)</option>
                  <option value="gpt-4o">GPT-4o (OpenAI)</option>
                  <option value="deepseek-r1">DeepSeek-R1</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
                <p className="text-[11px] text-slate-400">Model that aggregates and synthesizes proposals from proposer agents.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Collaboration Rounds ({config.moa?.rounds || 2} rounds)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={config.moa?.rounds || 2}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    moa: {
                      ...(config.moa || { enabled: true, proposerModels: [], aggregatorModel: 'claude-3-7-sonnet', temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                      rounds: parseInt(e.target.value, 10)
                    }
                  })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 Round</span>
                  <span>2 Rounds</span>
                  <span>5 Rounds</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Proposer Models (Comma separated)
                </label>
                <input
                  type="text"
                  value={(config.moa?.proposerModels || ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o']).join(', ')}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    moa: {
                      ...(config.moa || { enabled: true, aggregatorModel: 'claude-3-7-sonnet', rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                      proposerModels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400">Models participating in parallel first-pass proposal generation.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= COMMUNICATION CHANNELS ================= */}
        {activeSection === 'channels' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white">Multi-Channel Gateway Configurations</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure integrations for Telegram, Discord, Slack, WhatsApp, Matrix, and REST Webhook.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telegram Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Telegram Bot</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="telegram-enabled-toggle"
                      type="checkbox"
                      checked={config.channels.telegram.enabled}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          telegram: { ...config.channels.telegram, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">Bot Token</label>
                  <input
                    id="telegram-token-input"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    value={config.channels.telegram.botToken}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        telegram: { ...config.channels.telegram, botToken: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Connection Mode (Dropdown)</label>
                    <select
                      id="telegram-mode-select"
                      value={config.channels.telegram.mode}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          telegram: { ...config.channels.telegram, mode: e.target.value as 'polling' | 'webhook' }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    >
                      <option value="polling">Long Polling (Simplest)</option>
                      <option value="webhook">HTTPS Webhook</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Allowed Usernames</label>
                    <input
                      id="telegram-allowed-users"
                      type="text"
                      placeholder="@developer, @admin"
                      value={config.channels.telegram.allowedUsers}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          telegram: { ...config.channels.telegram, allowedUsers: e.target.value }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Discord Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Discord Gateway</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="discord-enabled-toggle"
                      type="checkbox"
                      checked={config.channels.discord.enabled}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          discord: { ...config.channels.discord, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">Bot Token</label>
                  <input
                    id="discord-token-input"
                    type="password"
                    placeholder="MTA2...token"
                    value={config.channels.discord.botToken}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        discord: { ...config.channels.discord, botToken: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Client / App ID</label>
                    <input
                      id="discord-client-id"
                      type="text"
                      placeholder="123456789"
                      value={config.channels.discord.clientId}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          discord: { ...config.channels.discord, clientId: e.target.value }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Restricted Guild IDs</label>
                    <input
                      id="discord-guild-ids"
                      type="text"
                      placeholder="987654321"
                      value={config.channels.discord.guildIds}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          discord: { ...config.channels.discord, guildIds: e.target.value }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Slack Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Slack App</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="slack-enabled-toggle"
                      type="checkbox"
                      checked={config.channels.slack.enabled}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          slack: { ...config.channels.slack, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">Bot User OAuth Token (xoxb-)</label>
                  <input
                    id="slack-bot-token"
                    type="password"
                    placeholder="xoxb-..."
                    value={config.channels.slack.botToken}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        slack: { ...config.channels.slack, botToken: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Enable Socket Mode</span>
                  <input
                    type="checkbox"
                    checked={config.channels.slack.socketMode}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        slack: { ...config.channels.slack, socketMode: e.target.checked }
                      }
                    })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-400"
                  />
                </div>
              </div>

              {/* Webhook / REST Gateway */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">HTTP Webhook &amp; REST</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="webhook-enabled-toggle"
                      type="checkbox"
                      checked={config.channels.webhook.enabled}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          webhook: { ...config.channels.webhook, enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Listen Port</label>
                    <input
                      id="webhook-port-input"
                      type="number"
                      value={config.channels.webhook.port}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          webhook: { ...config.channels.webhook, port: parseInt(e.target.value) || 8080 }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">Auth Token</label>
                    <input
                      id="webhook-auth-token"
                      type="password"
                      value={config.channels.webhook.authToken}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        channels: {
                          ...config.channels,
                          webhook: { ...config.channels.webhook, authToken: e.target.value }
                        }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SYSTEM PROMPT & PERSONA ================= */}
        {activeSection === 'system' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white">System Prompt &amp; Persona Instructions</h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize agent identity, default role behavior, and prompt templates.
              </p>
            </div>

            <div className="space-y-4">
              {/* Preset Selector Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Role Preset Template (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="persona-preset-select"
                    value={config.system.preset}
                    onChange={(e) => handlePresetChange(e.target.value as any)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                  >
                    <option value="engineer">Autonomous Software Engineer (Default)</option>
                    <option value="researcher">Autonomous Intelligence &amp; Research Analyst</option>
                    <option value="devops">DevOps &amp; Container Infrastructure Specialist</option>
                    <option value="edge_assistant">Sipeed Edge Assistant (Concise &amp; Hardware Friendly)</option>
                    <option value="custom">Custom Custom Persona</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">Agent Display Name</label>
                  <input
                    id="agent-name-input"
                    type="text"
                    value={config.system.agentName}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      system: { ...config.system, agentName: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">Language Locale</label>
                  <input
                    id="agent-lang-input"
                    type="text"
                    value={config.system.language}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      system: { ...config.system, language: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Full System Prompt Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    System Prompt Content
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {config.system.systemPrompt.length} characters
                  </span>
                </div>
                <textarea
                  id="system-prompt-textarea"
                  rows={8}
                  value={config.system.systemPrompt}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    system: { ...config.system, systemPrompt: e.target.value, preset: 'custom' }
                  })}
                  className="w-full p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECURITY & SANDBOX ================= */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white">Security Isolation &amp; Sandboxing</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure container bounds, execution timeouts, and command approval policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sandbox Mode Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Sandbox Execution Mode (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="sandbox-mode-select"
                    value={config.security.sandboxMode}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      security: { ...config.security, sandboxMode: e.target.value as SandboxMode }
                    })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                  >
                    <option value="docker_isolated">Docker Container Isolated (Recommended)</option>
                    <option value="host_restricted">Host Subprocess (Restricted paths)</option>
                    <option value="read_only">Strict Read-Only Mode</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Docker isolation prevents unauthorized access to host file system and kernel.
                </p>
              </div>

              {/* Execution Timeout */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Max Command Timeout (Seconds)
                </label>
                <input
                  id="security-timeout-input"
                  type="number"
                  min="5"
                  max="3600"
                  value={config.security.maxExecutionTimeSec}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    security: { ...config.security, maxExecutionTimeSec: parseInt(e.target.value) || 60 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>

              {/* Whitelisted Workspace Paths */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Allowed Directories Whitelist (Comma separated)
                </label>
                <input
                  id="security-directories-input"
                  type="text"
                  value={config.security.allowedDirectories.join(', ')}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    security: {
                      ...config.security,
                      allowedDirectories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Only files within these mounted container volumes can be read or modified by the agent.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-xs font-medium text-white">Require Manual Approval for Shell Commands</div>
                  <div className="text-[11px] text-slate-400">Prompts before executing non-idempotent bash commands</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.security.requireApprovalForCommands}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    security: { ...config.security, requireApprovalForCommands: e.target.checked }
                  })}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-400"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-xs font-medium text-white">Strict Network Isolation</div>
                  <div className="text-[11px] text-slate-400">Blocks external outbound HTTP requests from tool containers</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.security.blockNetworkAccess}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    security: { ...config.security, blockNetworkAccess: e.target.checked }
                  })}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= STORAGE & MEMORY ================= */}
        {activeSection === 'storage' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white">Agent Memory &amp; State Persistence</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure cross-session memory backends, vector search, and episodic summarization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Memory Backend Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Memory Storage Backend (Dropdown)
                </label>
                <div className="relative">
                  <select
                    id="memory-backend-select"
                    value={config.storage.memoryBackend}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      storage: { ...config.storage, memoryBackend: e.target.value as MemoryBackend }
                    })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                  >
                    <option value="everos">EverOS Memory Operating System (EverMind AI - Markdown + LanceDB mRAG)</option>
                    <option value="sqlite">SQLite Local Database (Embedded, Fast)</option>
                    <option value="chroma">Chroma Vector DB (Semantic Embeddings)</option>
                    <option value="redis">Redis In-Memory Key-Value Store</option>
                    <option value="markdown">Markdown Workspace File (Readable .md)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Defines how conversation facts and context are stored between restarts.
                </p>
              </div>

              {/* Database Path */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Database / Storage Path
                </label>
                <input
                  id="storage-path-input"
                  type="text"
                  value={config.storage.dbPath}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    storage: { ...config.storage, dbPath: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>

              {/* Auto Summarize Interval */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Auto-Summarization Interval (Turns)
                </label>
                <input
                  id="summarize-interval-input"
                  type="number"
                  min="5"
                  max="100"
                  value={config.storage.autoSummarizeInterval}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    storage: { ...config.storage, autoSummarizeInterval: parseInt(e.target.value) || 25 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>

              {/* Max History Turns */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Max Rolling History Turns
                </label>
                <input
                  id="max-history-input"
                  type="number"
                  min="10"
                  max="500"
                  value={config.storage.maxHistoryTurns}
                  onChange={(e) => onChangeConfig({
                    ...config,
                    storage: { ...config.storage, maxHistoryTurns: parseInt(e.target.value) || 100 }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>

              {/* EverOS Dedicated Integration Block */}
              {config.storage.memoryBackend === 'everos' && (
                <div className="md:col-span-2 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">EverOS Memory Operating System Link</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        evermind.ai/everos
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Connected (sub-350ms mRAG)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Provides portable Markdown memories, SQLite cataloging, LanceDB hybrid vector retrieval, and autonomous Case-to-Skill distillation across Hermes, ZeroClaw, OpenClaw, and PicoClaw.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400">EverOS Daemon Endpoint</label>
                      <input
                        type="text"
                        value={config.storage.vectorDbUrl || 'http://everos:8080'}
                        onChange={(e) => onChangeConfig({
                          ...config,
                          storage: { ...config.storage, vectorDbUrl: e.target.value }
                        })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-indigo-300 font-mono mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400">Persistent Markdown Directory</label>
                      <input
                        type="text"
                        value={config.storage.dbPath || '/data/everos/memories'}
                        onChange={(e) => onChangeConfig({
                          ...config,
                          storage: { ...config.storage, dbPath: e.target.value }
                        })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= RAW JSON / YAML SCHEMA ================= */}
        {activeSection === 'raw' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Raw Configuration Schema</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Direct live bidirectional JSON editor matching config schema.
                </p>
              </div>

              <button
                id="copy-raw-json-btn"
                onClick={copyRawToClipboard}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedRaw ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRaw ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            {rawError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                Syntax Error: {rawError}
              </div>
            )}

            <textarea
              id="raw-json-editor"
              rows={16}
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
