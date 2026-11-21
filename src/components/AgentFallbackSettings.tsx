import React, { useState, useEffect } from 'react';
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
  HardDrive,
  Search,
  Database
} from 'lucide-react';
import { AgentFullConfig, AgentId } from '../types';
import { fetchProxyModels } from '../utils/apiBridge';

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
  const [liveModelsMap, setLiveModelsMap] = useState<Record<string, Array<{ value: string; label: string; tag?: string }>>>({});
  const [loadingAlias, setLoadingAlias] = useState<Record<string, boolean>>({});

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

  const getResolvedUrl = (aliasId: string): string => {
    if (customEndpointUrls[aliasId]) return customEndpointUrls[aliasId];
    const found = PROVIDER_ALIASES.find(a => a.id === aliasId);
    return found?.defaultBaseUrl || 'http://localhost:8080';
  };

  const queryLiveModelsForAlias = async (aliasId: string) => {
    setLoadingAlias(prev => ({ ...prev, [aliasId]: true }));
    try {
      const url = getResolvedUrl(aliasId);
      const res = await fetchProxyModels(url, aliasId, config.model.apiKey, agentId);
      if (res.success && res.models.length > 0) {
        setLiveModelsMap(prev => ({ ...prev, [aliasId]: res.models }));
      }
    } catch (err) {
      console.error('Failed to query live models for alias:', aliasId, err);
    } finally {
      setLoadingAlias(prev => ({ ...prev, [aliasId]: false }));
    }
  };

  useEffect(() => {
    // Initial fetch for default local-ollama
    queryLiveModelsForAlias('local-ollama');
  }, []);

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
    if (lower.startsWith('openai:') || lower.includes('gpt-') || lower.includes('o3-')) {
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
  const currentProposers = moaConfig.proposerModels && moaConfig.proposerModels.length > 0
    ? moaConfig.proposerModels
    : ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'];

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

  const handleAddProposerModel = (modelVal?: string, aliasVal?: string) => {
    const trimmed = (modelVal !== undefined ? modelVal : newProposerInput).trim();
    if (!trimmed) return;
    if (currentProposers.includes(trimmed)) return;

    const targetAlias = aliasVal || selectedNewAlias;
    const nextProposers = [...currentProposers, trimmed];
    const nextMapping = { ...providerMapping, [trimmed]: targetAlias };

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

  const handleApplyPreset = (preset: 'all-local' | 'all-openrouter' | 'hybrid' | 'auto-detect' | 'recommended-moe') => {
    const nextMapping: Record<string, string> = {};
    let nextProposers = currentProposers;
    let nextAggregator = currentAggregator;

    if (preset === 'all-local') {
      nextMapping[currentAggregator] = 'local-ollama';
      currentProposers.forEach(p => { nextMapping[p] = 'local-ollama'; });
    } else if (preset === 'all-openrouter') {
      nextMapping[currentAggregator] = 'remote-openrouter';
      currentProposers.forEach(p => { nextMapping[p] = 'remote-openrouter'; });
    } else if (preset === 'hybrid') {
      nextMapping[currentAggregator] = 'remote-anthropic';
      currentProposers.forEach(p => { nextMapping[p] = 'local-ollama'; });
    } else if (preset === 'recommended-moe') {
      nextAggregator = 'qwen2.5-coder:14b';
      nextProposers = ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'];
      nextMapping[nextAggregator] = 'local-ollama';
      nextProposers.forEach(p => { nextMapping[p] = 'local-ollama'; });
    } else if (preset === 'auto-detect') {
      nextMapping[currentAggregator] = inferAliasForModel(currentAggregator);
      currentProposers.forEach(p => { nextMapping[p] = inferAliasForModel(p); });
    }

    onChangeConfig({
      ...config,
      moa: {
        ...moaConfig,
        aggregatorModel: nextAggregator,
        proposerModels: nextProposers,
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
                <span>Mixture of Agents (MoE / MoA) Live Model Matrix &amp; Provider Mapping</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Query &amp; Mixed Providers
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Query live models directly from your chosen provider. Mix local LAN Ollama, OpenRouter, Anthropic, and OpenAI models that work well together in consensus.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="moa-map-preset-recommended-btn"
              onClick={() => handleApplyPreset('recommended-moe')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer shadow"
              title="Load tested MoE trio (Qwen Coder 7B, DeepSeek R1 8B, Gemma Soul) synced to Local Ollama"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Recommended MoE Trio</span>
            </button>
            <button
              type="button"
              id="moa-map-preset-local-btn"
              onClick={() => handleApplyPreset('all-local')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>All Local LAN</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Aggregator Model Provider Mapping Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              1. Consensus Aggregator Model &amp; Provider
            </h4>
          </div>
          <button
            type="button"
            onClick={() => {
              const currentAlias = inferAliasForModel(currentAggregator);
              queryLiveModelsForAlias(currentAlias);
            }}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAlias[inferAliasForModel(currentAggregator)] ? 'animate-spin' : ''}`} />
            <span>Query Live Models</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Provider Alias Selector first */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-medium text-slate-400">1. Select Provider</label>
            <select
              value={inferAliasForModel(currentAggregator)}
              onChange={(e) => {
                const newAlias = e.target.value;
                handleUpdateModelAlias(currentAggregator, newAlias);
                queryLiveModelsForAlias(newAlias);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            >
              {PROVIDER_ALIASES.map(alias => (
                <option key={`agg-alias-${alias.id}`} value={alias.id}>
                  {alias.label} ({alias.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Aggregator Model Dropdown / Input */}
          <div className="md:col-span-7 space-y-1">
            <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>2. Select Live Model or Type Identifier</span>
              <span className="text-[10px] text-indigo-300 font-mono">Synthesis Round</span>
            </label>
            <div className="flex gap-2">
              <select
                value={currentAggregator}
                onChange={(e) => handleUpdateAggregatorModel(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={currentAggregator}>{currentAggregator} (Current)</option>
                {(liveModelsMap[inferAliasForModel(currentAggregator)] || []).map(m => (
                  <option key={`live-agg-${m.value}`} value={m.value}>
                    {m.label} {m.tag ? `[${m.tag}]` : ''}
                  </option>
                ))}
                <option value="qwen2.5-coder:14b">qwen2.5-coder:14b (Recommended Synthesis)</option>
                <option value="claude-3-7-sonnet">claude-3-7-sonnet (Cloud Synthesis)</option>
                <option value="gpt-4o">gpt-4o (OpenAI Synthesis)</option>
              </select>
              <input
                type="text"
                value={currentAggregator}
                onChange={(e) => handleUpdateAggregatorModel(e.target.value)}
                placeholder="Custom model..."
                className="w-36 px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Proposer Reference Models Provider Mapping Matrix */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              2. Proposer Reference Models Mapping Matrix ({currentProposers.length} Active)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Diverse Draft Generation Round (Mixed Providers Supported)
          </span>
        </div>

        {/* Proposers List */}
        <div className="space-y-3">
          {currentProposers.map((proposerModel, index) => {
            const aliasKey = inferAliasForModel(proposerModel);
            const aliasDef = PROVIDER_ALIASES.find(a => a.id === aliasKey);
            const resolvedUrl = getResolvedUrl(aliasKey);
            const liveOptions = liveModelsMap[aliasKey] || [];

            return (
              <div 
                key={`proposer-${proposerModel}-${index}`}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-colors space-y-2.5"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Index */}
                  <div className="md:col-span-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                  </div>

                  {/* Provider Alias Selector (Mixed Provider per Proposer) */}
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-mono text-slate-400 mb-1 block">Provider</label>
                    <select
                      value={aliasKey}
                      onChange={(e) => {
                        const newAlias = e.target.value;
                        handleUpdateModelAlias(proposerModel, newAlias);
                        queryLiveModelsForAlias(newAlias);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {PROVIDER_ALIASES.map(alias => (
                        <option key={`prop-${proposerModel}-${alias.id}`} value={alias.id}>
                          {alias.label} ({alias.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selector / Identifier */}
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                      <span>Model Identifier</span>
                      <button
                        type="button"
                        onClick={() => queryLiveModelsForAlias(aliasKey)}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Query Live
                      </button>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={proposerModel}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          const nextProposers = currentProposers.map((m, idx) => idx === index ? nextVal : m);
                          const nextMapping = { ...providerMapping };
                          delete nextMapping[proposerModel];
                          nextMapping[nextVal] = aliasKey;
                          onChangeConfig({
                            ...config,
                            moa: { ...moaConfig, proposerModels: nextProposers, providerMapping: nextMapping },
                            providerMapping: nextMapping
                          });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value={proposerModel}>{proposerModel}</option>
                        {liveOptions.map(m => (
                          <option key={`live-prop-${m.value}`} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                        <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                        <option value="deepseek-r1:8b">deepseek-r1:8b</option>
                        <option value="gemma4-soul:latest">gemma4-soul:latest</option>
                        <option value="claude-3-7-sonnet">claude-3-7-sonnet</option>
                      </select>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-end pt-4">
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-700/40 font-mono">
                  <div>Endpoint: <span className="text-indigo-300">{resolvedUrl}</span></div>
                  <div>
                    {aliasDef?.isLocal ? (
                      <span className="text-emerald-400">🟢 Zero-Key LAN Ollama</span>
                    ) : (
                      <span className="text-amber-400">🔑 Cloud Gateway ({aliasDef?.id})</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Proposer Model Row */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Compatible Proposer Model (Query Live Provider Catalog)</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-4">
              <select
                value={selectedNewAlias}
                onChange={(e) => {
                  const newAlias = e.target.value;
                  setSelectedNewAlias(newAlias);
                  queryLiveModelsForAlias(newAlias);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                {PROVIDER_ALIASES.map(alias => (
                  <option key={`new-alias-${alias.id}`} value={alias.id}>
                    {alias.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6">
              <div className="flex gap-2">
                <select
                  value={newProposerInput}
                  onChange={(e) => setNewProposerInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select live model or type below...</option>
                  {(liveModelsMap[selectedNewAlias] || []).map(m => (
                    <option key={`add-live-${m.value}`} value={m.value}>
                      {m.label} {m.tag ? `[${m.tag}]` : ''}
                    </option>
                  ))}
                  <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Recommended Coder)</option>
                  <option value="deepseek-r1:8b">deepseek-r1:8b (Recommended Reasoner)</option>
                  <option value="gemma4-soul:latest">gemma4-soul:latest (Recommended Persona)</option>
                  <option value="claude-3-7-sonnet">claude-3-7-sonnet (Cloud Proposer)</option>
                </select>
                <input
                  type="text"
                  value={newProposerInput}
                  onChange={(e) => setNewProposerInput(e.target.value)}
                  placeholder="model name..."
                  className="w-36 px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                id="moa-add-proposer-btn"
                onClick={() => handleAddProposerModel()}
                disabled={!newProposerInput.trim()}
                className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Proposer</span>
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
            <span>Customize Provider Alias Endpoint URLs &amp; LAN IPs</span>
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
