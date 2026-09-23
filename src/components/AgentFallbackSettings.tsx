import React, { useState } from 'react';
import { 
  Server, 
  Layers, 
  Globe, 
  Cpu, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Link2, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { AgentFullConfig, AgentId } from '../types';

export interface ProviderAliasOption {
  id: string;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  isLocal: boolean;
  category: 'local' | 'cloud' | 'custom';
  description: string;
  badge: string;
  color: string;
}

export const PROVIDER_ALIASES: ProviderAliasOption[] = [
  {
    id: 'local-ollama',
    label: 'Local Ollama (192.168.1.49 / Local LAN)',
    defaultBaseUrl: 'http://192.168.1.49:11434',
    requiresApiKey: false,
    isLocal: true,
    category: 'local',
    description: 'Direct connection to local edge server. No API keys or external credits required.',
    badge: '🟢 Zero-Key Local LAN',
    color: 'emerald'
  },
  {
    id: 'local-vllm',
    label: 'Local vLLM / SGLang / llama.cpp',
    defaultBaseUrl: 'http://127.0.0.1:8000/v1',
    requiresApiKey: false,
    isLocal: true,
    category: 'local',
    description: 'High-throughput local vLLM / llama-box OpenAI-compatible server.',
    badge: '🟢 Local OpenAI-Compat',
    color: 'teal'
  },
  {
    id: 'remote-openrouter',
    label: 'OpenRouter Gateway',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    isLocal: false,
    category: 'cloud',
    description: 'Unified gateway for DeepSeek, Meta Llama, Mistral, and Claude models.',
    badge: '🔑 OPENROUTER_API_KEY',
    color: 'indigo'
  },
  {
    id: 'remote-openai',
    label: 'OpenAI Cloud (Official)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    isLocal: false,
    category: 'cloud',
    description: 'Direct connection to OpenAI GPT-4o, o3-mini, and Codex endpoints.',
    badge: '🔑 OPENAI_API_KEY',
    color: 'sky'
  },
  {
    id: 'remote-anthropic',
    label: 'Anthropic Claude API',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    isLocal: false,
    category: 'cloud',
    description: 'Claude 3.7 Sonnet, Claude 3.5 Haiku, and Claude Opus models.',
    badge: '🔑 ANTHROPIC_API_KEY',
    color: 'amber'
  },
  {
    id: 'remote-gemini',
    label: 'Google Gemini API',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    isLocal: false,
    category: 'cloud',
    description: 'Gemini 2.5 Pro, Flash, and Thinking models.',
    badge: '🔑 GEMINI_API_KEY',
    color: 'blue'
  },
  {
    id: 'remote-groq',
    label: 'Groq Cloud LPU',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    isLocal: false,
    category: 'cloud',
    description: 'Ultra low-latency inference on LPUs.',
    badge: '🔑 GROQ_API_KEY',
    color: 'orange'
  },
  {
    id: 'custom',
    label: 'Custom Private Gateway',
    defaultBaseUrl: 'http://localhost:8080/v1',
    requiresApiKey: false,
    isLocal: true,
    category: 'custom',
    description: 'Custom proxy, reverse-tunnel, or self-hosted enterprise endpoint.',
    badge: '⚙️ Custom Endpoint',
    color: 'purple'
  }
];

export interface AgentFallbackSettingsProps {
  config: AgentFullConfig;
  onChangeConfig: (newConfig: AgentFullConfig) => void;
  agentId?: AgentId;
  className?: string;
}

export const AgentFallbackSettings: React.FC<AgentFallbackSettingsProps> = ({
  config,
  onChangeConfig,
  agentId = 'hermes-agent',
  className = ''
}) => {
  const [newProposerInput, setNewProposerInput] = useState('');
  const [selectedNewAlias, setSelectedNewAlias] = useState('local-ollama');
  const [showEndpointOverrides, setShowEndpointOverrides] = useState(false);
  const [customEndpointUrls, setCustomEndpointUrls] = useState<Record<string, string>>({
    'local-ollama': config.model.baseUrl || 'http://192.168.1.49:11434',
    'local-vllm': 'http://127.0.0.1:8000/v1',
    'remote-openrouter': 'https://openrouter.ai/api/v1',
    'remote-openai': 'https://api.openai.com/v1',
    'remote-anthropic': 'https://api.anthropic.com/v1',
    'remote-gemini': 'https://generativelanguage.googleapis.com/v1beta',
    'remote-groq': 'https://api.groq.com/openai/v1',
    'custom': 'http://localhost:8080/v1',
    ...(config.moa?.providerEndpoints || {})
  });

  const moaConfig = config.moa || {
    enabled: true,
    proposerModels: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'],
    aggregatorModel: config.model.model || 'qwen2.5-coder:14b',
    rounds: 2,
    temperatureSpread: 0.3,
    consensusThreshold: 0.85
  };

  const providerMapping: Record<string, string> = {
    ...(config.moa?.providerMapping || {}),
    ...(config.providerMapping || {})
  };

  const inferAliasForModel = (modelName: string): string => {
    if (providerMapping[modelName]) {
      return providerMapping[modelName];
    }
    const lower = modelName.toLowerCase();
    if (lower.startsWith('ollama:') || lower.includes(':latest') || lower.includes(':8b') || lower.includes(':7b') || lower.includes(':14b') || lower.includes('qwen') || lower.includes('gemma') || lower.includes('llama3')) {
      return 'local-ollama';
    }
    if (lower.startsWith('openrouter:') || lower.includes('deepseek/')) {
      return 'remote-openrouter';
    }
    if (lower.startsWith('openai:') || lower.startsWith('openai-codex:') || lower.includes('gpt-') || lower.includes('o3-')) {
      return 'remote-openai';
    }
    if (lower.startsWith('anthropic:') || lower.includes('claude-')) {
      return 'remote-anthropic';
    }
    if (lower.startsWith('gemini:') || lower.includes('gemini-')) {
      return 'remote-gemini';
    }
    if (lower.startsWith('groq:')) {
      return 'remote-groq';
    }
    return config.model.provider === 'ollama' ? 'local-ollama' : 'remote-openrouter';
  };

  const currentAggregator = moaConfig.aggregatorModel || config.model.model || 'qwen2.5-coder:14b';
  const currentProposers = moaConfig.proposerModels || ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'];

  const handleUpdateModelAlias = (modelName: string, alias: string) => {
    const nextMapping = { ...providerMapping, [modelName]: alias };
    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        providerMapping: nextMapping,
        providerEndpoints: customEndpointUrls
      },
      providerMapping: nextMapping,
      fallback: {
        ...(config.fallback || { enabled: true, strategy: 'on_offline' }),
        providerMapping: nextMapping
      }
    });
  };

  const handleUpdateAggregatorModel = (newModel: string) => {
    const inferred = inferAliasForModel(newModel);
    const nextMapping = { ...providerMapping, [newModel]: inferred };
    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        aggregatorModel: newModel,
        providerMapping: nextMapping
      },
      providerMapping: nextMapping
    });
  };

  const handleAddProposerModel = () => {
    const trimmed = newProposerInput.trim();
    if (!trimmed) return;
    if (currentProposers.includes(trimmed)) return;

    const nextProposers = [...currentProposers, trimmed];
    const nextMapping = { ...providerMapping, [trimmed]: selectedNewAlias };

    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        proposerModels: nextProposers,
        providerMapping: nextMapping
      },
      providerMapping: nextMapping
    });

    setNewProposerInput('');
  };

  const handleRemoveProposerModel = (modelToRemove: string) => {
    const nextProposers = currentProposers.filter(m => m !== modelToRemove);
    const nextMapping = { ...providerMapping };
    delete nextMapping[modelToRemove];

    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        proposerModels: nextProposers,
        providerMapping: nextMapping
      },
      providerMapping: nextMapping
    });
  };

  const handleApplyPreset = (preset: 'all-local' | 'all-openrouter' | 'hybrid' | 'auto-detect') => {
    const nextMapping: Record<string, string> = {};
    
    if (preset === 'all-local') {
      nextMapping[currentAggregator] = 'local-ollama';
      currentProposers.forEach(p => {
        nextMapping[p] = 'local-ollama';
      });
    } else if (preset === 'all-openrouter') {
      nextMapping[currentAggregator] = 'remote-openrouter';
      currentProposers.forEach(p => {
        nextMapping[p] = 'remote-openrouter';
      });
    } else if (preset === 'hybrid') {
      nextMapping[currentAggregator] = 'remote-anthropic';
      currentProposers.forEach(p => {
        nextMapping[p] = 'local-ollama';
      });
    } else if (preset === 'auto-detect') {
      nextMapping[currentAggregator] = inferAliasForModel(currentAggregator);
      currentProposers.forEach(p => {
        nextMapping[p] = inferAliasForModel(p);
      });
    }

    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        providerMapping: nextMapping,
        providerEndpoints: customEndpointUrls
      },
      providerMapping: nextMapping,
      fallback: {
        ...(config.fallback || { enabled: true, strategy: 'on_offline' }),
        providerMapping: nextMapping
      }
    });
  };

  const handleUpdateCustomEndpoint = (aliasId: string, url: string) => {
    const nextUrls = { ...customEndpointUrls, [aliasId]: url };
    setCustomEndpointUrls(nextUrls);
    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        providerEndpoints: nextUrls
      }
    });
  };

  const getResolvedUrl = (aliasId: string): string => {
    if (customEndpointUrls[aliasId]) return customEndpointUrls[aliasId];
    const found = PROVIDER_ALIASES.find(a => a.id === aliasId);
    return found?.defaultBaseUrl || 'http://localhost:8080';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Explanation */}
      <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/80 to-slate-950/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>MOA Model Provider Mapping &amp; Endpoint Fallbacks</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Explicit Routing
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explicitly bind each Mixture-of-Agents model to a specific provider alias to prevent default fallback routing to wrong cloud endpoints.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="moa-map-preset-local-btn"
              onClick={() => handleApplyPreset('all-local')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="Map Aggregator and all Proposers to local Ollama (192.168.1.49)"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>All Local LAN</span>
            </button>
            <button
              type="button"
              id="moa-map-preset-openrouter-btn"
              onClick={() => handleApplyPreset('all-openrouter')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All OpenRouter</span>
            </button>
            <button
              type="button"
              id="moa-map-preset-autodetect-btn"
              onClick={() => handleApplyPreset('auto-detect')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Detect</span>
            </button>
          </div>
        </div>

        {/* Informative Notice */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            When models like <strong className="text-slate-200">qwen2.5-coder:7b</strong> or <strong className="text-slate-200">deepseek-r1:8b</strong> lack explicit provider prefixes, Hermes can default them to OpenRouter/OpenAI. Mapping them to <strong className="text-emerald-400">local-ollama</strong> guarantees all sub-calls route to your local IP (<code className="text-indigo-300 font-mono">http://192.168.1.49:11434</code>) without triggering credit cooldowns.
          </span>
        </div>
      </div>

      {/* 1. Aggregator Model Provider Mapping Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              1. Consensus Aggregator Model Provider
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Final Synthesis Round
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Aggregator Model Name Input */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Model Identifier</label>
            <input
              type="text"
              value={currentAggregator}
              onChange={(e) => handleUpdateAggregatorModel(e.target.value)}
              placeholder="e.g. qwen2.5-coder:14b or hermes3:8b"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Arrow */}
          <div className="hidden md:flex md:col-span-1 items-center justify-center pt-5">
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>

          {/* Provider Alias Selector */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Bound Provider Alias &amp; Endpoint</label>
            <select
              value={inferAliasForModel(currentAggregator)}
              onChange={(e) => handleUpdateModelAlias(currentAggregator, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            >
              {PROVIDER_ALIASES.map(alias => (
                <option key={`agg-${alias.id}`} value={alias.id}>
                  {alias.label} ({alias.badge})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Route Summary for Aggregator */}
        {(() => {
          const aliasKey = inferAliasForModel(currentAggregator);
          const aliasDef = PROVIDER_ALIASES.find(a => a.id === aliasKey);
          const resolvedUrl = getResolvedUrl(aliasKey);
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Resolved Endpoint:</span>
                <code className="text-indigo-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {resolvedUrl}
                </code>
              </div>
              <div>
                {aliasDef?.isLocal ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Local Zero-Key (No External Credit Risk)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Requires Validated Cloud Key ({aliasDef?.badge})
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Proposer Reference Models Provider Mapping */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              2. Proposer Reference Models Mapping Matrix ({currentProposers.length} Active)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Draft Generation Round
          </span>
        </div>

        {/* Proposers List */}
        <div className="space-y-2.5">
          {currentProposers.map((proposerModel, index) => {
            const aliasKey = inferAliasForModel(proposerModel);
            const aliasDef = PROVIDER_ALIASES.find(a => a.id === aliasKey);
            const resolvedUrl = getResolvedUrl(aliasKey);

            return (
              <div 
                key={`proposer-${proposerModel}-${index}`}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-colors space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Model Name & Index */}
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-100 truncate">
                      {proposerModel}
                    </span>
                  </div>

                  {/* Provider Alias Selector */}
                  <div className="md:col-span-7">
                    <select
                      value={aliasKey}
                      onChange={(e) => handleUpdateModelAlias(proposerModel, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {PROVIDER_ALIASES.map(alias => (
                        <option key={`prop-${proposerModel}-${alias.id}`} value={alias.id}>
                          {alias.label} — {alias.badge}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveProposerModel(proposerModel)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove proposer model"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-line Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-500">Route:</span>
                    <span className="text-slate-300">{resolvedUrl}</span>
                  </div>
                  <div>
                    {aliasDef?.isLocal ? (
                      <span className="text-emerald-400 font-medium">🟢 LAN Local (Ollama)</span>
                    ) : (
                      <span className="text-amber-400 font-medium">☁️ Remote Cloud ({aliasDef?.id})</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Proposer Model Row */}
        <div className="pt-2 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-5">
              <input
                type="text"
                value={newProposerInput}
                onChange={(e) => setNewProposerInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddProposerModel(); }}
                placeholder="Add proposer model (e.g. gemma4-soul:latest)..."
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-5">
              <select
                value={selectedNewAlias}
                onChange={(e) => setSelectedNewAlias(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                {PROVIDER_ALIASES.map(alias => (
                  <option key={`new-alias-${alias.id}`} value={alias.id}>
                    {alias.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                id="moa-add-proposer-btn"
                onClick={handleAddProposerModel}
                disabled={!newProposerInput.trim()}
                className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Model</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Custom Provider Endpoint Overrides (Collapsible) */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
        <button
          type="button"
          onClick={() => setShowEndpointOverrides(!showEndpointOverrides)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Customize Provider Alias Endpoint URLs</span>
          </span>
          <span className="text-[11px] text-indigo-400 font-mono">
            {showEndpointOverrides ? 'Hide Overrides ▲' : 'Show Overrides ▼'}
          </span>
        </button>

        {showEndpointOverrides && (
          <div className="space-y-3 pt-3 border-t border-slate-800 animate-fadeIn">
            <p className="text-[11px] text-slate-400">
              Configure custom IP addresses, port forwardings, or reverse proxy endpoints for each provider alias:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROVIDER_ALIASES.map(alias => (
                <div key={`custom-url-${alias.id}`} className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{alias.label}</span>
                    <span className="text-slate-500">{alias.id}</span>
                  </label>
                  <input
                    type="text"
                    value={customEndpointUrls[alias.id] || alias.defaultBaseUrl}
                    onChange={(e) => handleUpdateCustomEndpoint(alias.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentFallbackSettings;
