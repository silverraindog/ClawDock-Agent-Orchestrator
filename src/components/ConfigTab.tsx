import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Radio,
  Shield,
  Database,
  FileCode,
  Save,
  RotateCcw,
  Check,
  Sliders,
  Terminal,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Eye,
  EyeOff,
  Key,
  BookmarkCheck,
  History,
  Upload,
  Play
} from 'lucide-react';
import {
  AgentFullConfig,
  AgentId,
  LLMProvider,
  ReasoningEffort,
  SandboxMode,
  MemoryBackend,
  AgentInfo,
  LastKnownGoodConfigSnapshot
} from '../types';
import { MODEL_OPTIONS, DEFAULT_CONFIGS, DEFAULT_NATIVE_FILES } from '../data/defaults';
import { AgentFallbackSettings } from './AgentFallbackSettings';
export { AgentFallbackSettings } from './AgentFallbackSettings';
import { validateModelAgainstCatalog } from '../utils/modelValidation';
import {
  fetchAgentLiveConfig,
  fetchProxyModels,
  DEFAULT_LOCAL_MODELS,
  DEFAULT_GENERIC_MODELS,
  DEFAULT_PROVIDER_MODELS,
  ModelOptionItem
} from '../utils/apiBridge';
import { ConfigInjectionAlert, InjectionStatusInfo } from './ConfigInjectionAlert';
import { VerboseLogInspector, VerboseLogData } from './VerboseLogInspector';
import { InlineDiagnosticsEditor } from './InlineDiagnosticsEditor';
import {
  validateDeepLinkSchema,
  applySingleFix,
  validateFallbackConfiguration,
  VALID_PROVIDERS,
  VALID_SANDBOX_MODES,
  VALID_MEMORY_BACKENDS
} from '../utils/configValidator';
import {
  parseNativeConfigToSchema,
  generateHermesYaml,
  generateZeroClawToml
} from '../utils/configParser';
import {
  AgentPurpose,
  ModelCombinationSuggestion,
  suggestModelCombinations,
  suggestModelCombinationPresets,
  getSuggestedProposersForPurpose,
  getAgentDefaultPurpose,
  PURPOSE_METADATA,
  getModelKeyStatus,
  filterModelsByKeyAvailability,
  KeyContext,
  ModelKeyStatus
} from '../utils/moaSuggestions';
import { YamlEditor } from './YamlEditor';

export {
  suggestModelCombinations,
  getSuggestedProposersForPurpose,
  getAgentDefaultPurpose,
  PURPOSE_METADATA,
  getModelKeyStatus,
  filterModelsByKeyAvailability
};
export type { AgentPurpose, ModelCombinationSuggestion, KeyContext, ModelKeyStatus };

/**
 * Reactive hook to map the failover provider connection status into visual states.
 */
export const useFailoverVisualStatus = (
  status: 'untested' | 'testing' | 'connected' | 'failed'
) => {
  return React.useMemo(() => {
    switch (status) {
      case 'connected':
        return {
          label: 'Connected',
          className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
          dotColor: 'bg-emerald-400',
          icon: 'Check'
        };
      case 'failed':
        return {
          label: 'Disconnected',
          className: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
          dotColor: 'bg-rose-400',
          icon: 'AlertCircle'
        };
      case 'testing':
        return {
          label: 'Verifying...',
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/35 animate-pulse',
          dotColor: 'bg-amber-400',
          icon: 'RefreshCw'
        };
      default:
        return {
          label: 'Disconnected',
          className: 'bg-slate-800 text-slate-400 border-slate-700/85',
          dotColor: 'bg-slate-500',
          icon: 'AlertCircle'
        };
    }
  }, [status]);
};

export interface ConfigTabProps {
  agentId: AgentId;
  config: AgentFullConfig;
  onChangeConfig: (newConfig: AgentFullConfig) => void;
  onSaveConfig: (restartContainer?: boolean, manualNativeContent?: string, skipConfirm?: boolean) => void | Promise<void>;
  onResetDefaults: () => void;
  isSaving?: boolean;
  onInjectConfig?: (agentId: AgentId) => Promise<void> | void;
  injectionStatus?: InjectionStatusInfo | null;
  onDismissInjectionStatus?: () => void;
  externalVerboseLog?: VerboseLogData | null;
  onExecuteCommand?: (command: string) => Promise<void> | void;
  allConfigs?: Record<AgentId, AgentFullConfig>;
  allAgents?: AgentInfo[];
  onUpdateAgentConfig?: (agentId: AgentId, newCfg: AgentFullConfig) => void;
  lastKnownGoodSnapshot?: LastKnownGoodConfigSnapshot | null;
  onRestoreLastKnownGood?: (agentId?: AgentId) => void;
  onSaveLastKnownGoodCheckpoint?: (agentId?: AgentId, note?: string) => void;
  checkpointHistory?: LastKnownGoodConfigSnapshot[];
  onRestoreSpecificCheckpoint?: (snapshot: LastKnownGoodConfigSnapshot) => void;
  onDeleteCheckpoint?: (checkpointId: string) => void;
  onTestConnection?: (provider?: string, apiKey?: string, baseUrl?: string) => Promise<any>;
  handleTestConnection?: (provider?: string, apiKey?: string, baseUrl?: string) => Promise<any>;
  connectionStatus?: { status: string; message: string } | null;
}

type ConfigSubTab = 'model' | 'moa' | 'channels' | 'system' | 'native' | 'checkpoints';

export const ConfigTab: React.FC<ConfigTabProps> = ({
  agentId,
  config,
  onChangeConfig,
  onSaveConfig,
  onResetDefaults,
  isSaving = false,
  onInjectConfig,
  injectionStatus = null,
  onDismissInjectionStatus,
  externalVerboseLog = null,
  onExecuteCommand,
  allAgents = [],
  lastKnownGoodSnapshot = null,
  onRestoreLastKnownGood,
  onSaveLastKnownGoodCheckpoint,
  checkpointHistory = [],
  onRestoreSpecificCheckpoint,
  onDeleteCheckpoint,
  onTestConnection,
  handleTestConnection,
  connectionStatus = null
}) => {
  const safeConfig: AgentFullConfig = config || DEFAULT_CONFIGS[agentId] || DEFAULT_CONFIGS['hermes-agent'];
  const activeAgent = allAgents.find(a => a.id === agentId);
  const nativeMeta = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
  const nativeFormat = (nativeMeta?.format === 'toml' ? 'toml' : nativeMeta?.format === 'json' ? 'json' : 'yaml') as 'yaml' | 'toml' | 'json';

  const [subTab, setSubTab] = useState<ConfigSubTab>('model');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showVerboseLog, setShowVerboseLog] = useState(false);
  const [probedModels, setProbedModels] = useState<ModelOptionItem[]>([]);
  const [isProbingModels, setIsProbingModels] = useState(false);
  const [modelAdvisory, setModelAdvisory] = useState<string | null>(null);
  const [customEnvKey, setCustomEnvKey] = useState('');
  const [customEnvVal, setCustomEnvVal] = useState('');
  const [cliCommandInput, setCliCommandInput] = useState('');

  const buildNativeText = (cfg: AgentFullConfig): string => {
    if (agentId === 'hermes-agent') return generateHermesYaml(cfg);
    if (agentId === 'zeroclaw') return generateZeroClawToml(cfg);
    return JSON.stringify(cfg, null, 2);
  };

  const [nativeContent, setNativeContent] = useState<string>(() => buildNativeText(safeConfig));

  useEffect(() => {
    setNativeContent(buildNativeText(safeConfig));
  }, [agentId, safeConfig.model?.model, safeConfig.model?.provider, safeConfig.model?.baseUrl]);

  const diagnostics = useMemo(() => {
    return validateDeepLinkSchema(nativeContent, safeConfig, nativeFormat, agentId);
  }, [nativeContent, safeConfig, nativeFormat, agentId]);

  const fallbackValidation = useMemo(() => {
    return validateFallbackConfiguration(safeConfig);
  }, [safeConfig]);

  const availableModels: ModelOptionItem[] = useMemo(() => {
    if (probedModels.length > 0) return probedModels;
    const prov = safeConfig.model?.provider || 'ollama';
    return DEFAULT_PROVIDER_MODELS[prov] || MODEL_OPTIONS[prov] || DEFAULT_LOCAL_MODELS || DEFAULT_GENERIC_MODELS;
  }, [probedModels, safeConfig.model?.provider]);

  const moaPresets = useMemo(() => {
    const purpose = getAgentDefaultPurpose(agentId);
    return suggestModelCombinationPresets(purpose, {
      provider: safeConfig.model?.provider,
      keyContext: {
        primaryProvider: safeConfig.model?.provider,
        primaryApiKey: safeConfig.model?.apiKey,
        fallbackProvider: safeConfig.fallback?.provider || safeConfig.fallback?.fallbackProvider,
        fallbackApiKey: safeConfig.fallback?.apiKey,
        fallbackEnabled: safeConfig.fallback?.enabled
      }
    });
  }, [agentId, safeConfig.model?.provider, safeConfig.model?.apiKey, safeConfig.fallback]);

  const updateModelField = <K extends keyof AgentFullConfig['model']>(
    field: K,
    value: AgentFullConfig['model'][K]
  ) => {
    onChangeConfig({
      ...safeConfig,
      model: {
        ...safeConfig.model,
        [field]: value
      }
    });
  };

  const handleProbeLiveModels = async () => {
    setIsProbingModels(true);
    try {
      const res = await fetchProxyModels(
        safeConfig.model?.baseUrl,
        safeConfig.model?.provider,
        safeConfig.model?.apiKey,
        agentId
      );
      if (res.models && res.models.length > 0) {
        setProbedModels(res.models);
      }
      const valRes = await validateModelAgainstCatalog(
        safeConfig.model?.model || '',
        safeConfig.model?.baseUrl,
        safeConfig.model?.provider
      );
      setModelAdvisory(valRes.message || null);
    } finally {
      setIsProbingModels(false);
    }
  };

  const handleSyncFromLiveFile = async () => {
    const live = await fetchAgentLiveConfig(agentId);
    if (live.success && live.nativeContent) {
      setNativeContent(live.nativeContent);
    }
    if (live.success && live.configSchema) {
      onChangeConfig(live.configSchema);
    }
  };

  const testConnFn = onTestConnection || handleTestConnection;

  const subTabs: { id: ConfigSubTab; label: string; icon: React.ComponentType<any>; badge?: number }[] = [
    { id: 'model', label: 'Model & Providers', icon: Zap },
    { id: 'moa', label: 'MoA & Failover', icon: Layers },
    { id: 'channels', label: 'Channels', icon: Radio },
    { id: 'system', label: 'System & Security', icon: Shield },
    {
      id: 'native',
      label: `Native (${nativeMeta?.fileName || 'config'})`,
      icon: FileCode,
      badge: diagnostics.issues.length > 0 ? diagnostics.issues.length : undefined
    },
    {
      id: 'checkpoints',
      label: 'Checkpoints',
      icon: History,
      badge: checkpointHistory.length > 0 ? checkpointHistory.length : undefined
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {activeAgent?.name || agentId} Configuration
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
              {nativeMeta?.fileName || 'config.yaml'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure LLM provider, Mixture-of-Agents routing, chat channels, sandbox security, and native files.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onInjectConfig && (
            <button
              type="button"
              onClick={() => onInjectConfig(agentId)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Inject from Container</span>
            </button>
          )}

          {onSaveLastKnownGoodCheckpoint && (
            <button
              type="button"
              onClick={() => onSaveLastKnownGoodCheckpoint(agentId, 'Pinned from ConfigTab')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Pin Checkpoint</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveConfig(false, subTab === 'native' ? nativeContent : undefined)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-indigo-500/40 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save File</span>
          </button>

          <button
            type="button"
            id="save-and-apply-config-btn"
            onClick={() => onSaveConfig(true, subTab === 'native' ? nativeContent : undefined)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save & Apply to Agent'}</span>
          </button>
        </div>
      </div>

      {/* Injection Alert & Optional Verbose Log Toggle */}
      {injectionStatus && onDismissInjectionStatus && (
        <div className="space-y-2">
          <ConfigInjectionAlert
            info={injectionStatus}
            currentAgentId={agentId}
            onDismiss={onDismissInjectionStatus}
            onRetry={onInjectConfig}
            onRestoreLastKnownGood={onRestoreLastKnownGood}
            hasLastKnownGood={Boolean(lastKnownGoodSnapshot)}
          />
          {externalVerboseLog && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowVerboseLog(v => !v)}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {showVerboseLog ? 'Hide Verbose Execution Log' : 'Inspect Verbose Execution Log'}
              </button>
            </div>
          )}
          {showVerboseLog && externalVerboseLog && (
            <VerboseLogInspector
              data={externalVerboseLog}
              onClose={() => setShowVerboseLog(false)}
            />
          )}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-800 pb-3">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. MODEL & PROVIDERS */}
      {subTab === 'model' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Primary Model & Provider Endpoint
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProbeLiveModels}
                  disabled={isProbingModels}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProbingModels ? 'animate-spin' : ''}`} />
                  <span>Probe Models</span>
                </button>
                {testConnFn && (
                  <button
                    type="button"
                    onClick={() =>
                      testConnFn(
                        safeConfig.model.provider,
                        safeConfig.model.apiKey,
                        safeConfig.model.baseUrl
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Test Connection</span>
                  </button>
                )}
              </div>
            </div>

            {connectionStatus && connectionStatus.status !== 'disconnected' && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  connectionStatus.status === 'connected'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : connectionStatus.status === 'testing'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}
              >
                {connectionStatus.status === 'connected' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{connectionStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  LLM Provider
                </label>
                <select
                  value={safeConfig.model.provider}
                  onChange={e => {
                    const nextProv = e.target.value as LLMProvider;
                    const defaultModels = DEFAULT_PROVIDER_MODELS[nextProv] || [];
                    const firstModel = defaultModels[0]?.value || safeConfig.model.model;
                    onChangeConfig({
                      ...safeConfig,
                      model: {
                        ...safeConfig.model,
                        provider: nextProv,
                        model: firstModel
                      }
                    });
                    setProbedModels([]);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {VALID_PROVIDERS.map(p => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Model Preset
                </label>
                <select
                  value={
                    availableModels.some(m => m.value === safeConfig.model.model)
                      ? safeConfig.model.model
                      : '__custom__'
                  }
                  onChange={e => {
                    if (e.target.value !== '__custom__') {
                      updateModelField('model', e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableModels.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                  <option value="__custom__">Custom Model Identifier...</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Active Model Identifier
                </label>
                <input
                  type="text"
                  value={safeConfig.model.model}
                  onChange={e => updateModelField('model', e.target.value)}
                  placeholder="e.g. gemma4-soul:latest or claude-3-7-sonnet"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                {modelAdvisory && (
                  <p className="text-[11px] text-slate-400 mt-1">{modelAdvisory}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Base URL / Endpoint
                </label>
                <input
                  type="text"
                  value={safeConfig.model.baseUrl || ''}
                  onChange={e => updateModelField('baseUrl', e.target.value)}
                  placeholder="http://192.168.1.49:11434"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={safeConfig.model.apiKey || ''}
                    onChange={e => updateModelField('apiKey', e.target.value)}
                    placeholder="ollama or env:API_KEY"
                    className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(s => !s)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sampling & Inference Parameters */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Inference Hyperparameters</h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Temperature</span>
                <span className="font-mono text-indigo-300">{safeConfig.model.temperature}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={safeConfig.model.temperature}
                onChange={e => updateModelField('temperature', parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Top P</span>
                <span className="font-mono text-indigo-300">{safeConfig.model.topP}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={safeConfig.model.topP}
                onChange={e => updateModelField('topP', parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reasoning Effort
              </label>
              <select
                value={safeConfig.model.reasoningEffort}
                onChange={e => updateModelField('reasoningEffort', e.target.value as ReasoningEffort)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {(['none', 'low', 'medium', 'high', 'extended'] as ReasoningEffort[]).map(r => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={safeConfig.model.maxTokens}
                  onChange={e => updateModelField('maxTokens', parseInt(e.target.value, 10) || 4096)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Context Window</label>
                <input
                  type="number"
                  value={safeConfig.model.contextWindow}
                  onChange={e => updateModelField('contextWindow', parseInt(e.target.value, 10) || 128000)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>
            </div>

            {onExecuteCommand && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Container CLI Exec</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cliCommandInput}
                    onChange={e => setCliCommandInput(e.target.value)}
                    placeholder="e.g. hermes config"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (cliCommandInput.trim()) {
                        onExecuteCommand(cliCommandInput.trim());
                        setCliCommandInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Run
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MOA & FAILOVER */}
      {subTab === 'moa' && (
        <div className="space-y-6">
          {!fallbackValidation.isValid || fallbackValidation.warnings.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              {[...fallbackValidation.errors, ...fallbackValidation.warnings].map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Quick Purpose MoA Combination Suggestions */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Recommended Mixture-of-Agents Presets
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {moaPresets.slice(0, 3).map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChangeConfig({
                      ...safeConfig,
                      moa: {
                        ...safeConfig.moa,
                        enabled: true,
                        proposerModels: preset.proposers,
                        aggregatorModel: preset.aggregator,
                        rounds: preset.rounds
                      }
                    });
                  }}
                  className="text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono">
                      {preset.rounds}R
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
                  <div className="text-[10px] font-mono text-emerald-400 truncate">
                    Agg: {preset.aggregator}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <AgentFallbackSettings
            config={safeConfig}
            onChangeConfig={onChangeConfig}
            agentId={agentId}
          />
        </div>
      )}

      {/* 3. CHANNELS */}
      {subTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Telegram */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Telegram Bot</h4>
              <input
                type="checkbox"
                checked={safeConfig.channels.telegram.enabled}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      telegram: { ...safeConfig.channels.telegram, enabled: e.target.checked }
                    }
                  })
                }
                className="h-4 w-4 accent-indigo-500"
              />
            </div>
            <input
              type="text"
              value={safeConfig.channels.telegram.botToken}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    telegram: { ...safeConfig.channels.telegram, botToken: e.target.value }
                  }
                })
              }
              placeholder="Bot Token (e.g. env:TELEGRAM_BOT_TOKEN)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
            <input
              type="text"
              value={safeConfig.channels.telegram.allowedUsers}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    telegram: { ...safeConfig.channels.telegram, allowedUsers: e.target.value }
                  }
                })
              }
              placeholder="Allowed users (@admin, @dev)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          {/* Discord */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Discord Gateway</h4>
              <input
                type="checkbox"
                checked={safeConfig.channels.discord.enabled}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      discord: { ...safeConfig.channels.discord, enabled: e.target.checked }
                    }
                  })
                }
                className="h-4 w-4 accent-indigo-500"
              />
            </div>
            <input
              type="text"
              value={safeConfig.channels.discord.botToken}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    discord: { ...safeConfig.channels.discord, botToken: e.target.value }
                  }
                })
              }
              placeholder="Discord Bot Token"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
            <input
              type="text"
              value={safeConfig.channels.discord.guildIds}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    discord: { ...safeConfig.channels.discord, guildIds: e.target.value }
                  }
                })
              }
              placeholder="Guild IDs"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          {/* Slack */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Slack App</h4>
              <input
                type="checkbox"
                checked={safeConfig.channels.slack.enabled}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      slack: { ...safeConfig.channels.slack, enabled: e.target.checked }
                    }
                  })
                }
                className="h-4 w-4 accent-indigo-500"
              />
            </div>
            <input
              type="text"
              value={safeConfig.channels.slack.botToken}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    slack: { ...safeConfig.channels.slack, botToken: e.target.value }
                  }
                })
              }
              placeholder="Slack Bot Token"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
            <input
              type="text"
              value={safeConfig.channels.slack.appToken}
              onChange={e =>
                onChangeConfig({
                  ...safeConfig,
                  channels: {
                    ...safeConfig.channels,
                    slack: { ...safeConfig.channels.slack, appToken: e.target.value }
                  }
                })
              }
              placeholder="Slack App Token"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          {/* Webhook */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">HTTP Webhook Server</h4>
              <input
                type="checkbox"
                checked={safeConfig.channels.webhook.enabled}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      webhook: { ...safeConfig.channels.webhook, enabled: e.target.checked }
                    }
                  })
                }
                className="h-4 w-4 accent-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={safeConfig.channels.webhook.port}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      webhook: { ...safeConfig.channels.webhook, port: parseInt(e.target.value, 10) || 8080 }
                    }
                  })
                }
                placeholder="Port"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
              />
              <input
                type="text"
                value={safeConfig.channels.webhook.authToken}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    channels: {
                      ...safeConfig.channels,
                      webhook: { ...safeConfig.channels.webhook, authToken: e.target.value }
                    }
                  })
                }
                placeholder="Bearer Auth Token"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. SYSTEM, SECURITY, STORAGE & ENV */}
      {subTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Persona & System Prompt</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={safeConfig.system.agentName}
                  onChange={e =>
                    onChangeConfig({
                      ...safeConfig,
                      system: { ...safeConfig.system, agentName: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Persona Preset</label>
                <select
                  value={safeConfig.system.preset}
                  onChange={e =>
                    onChangeConfig({
                      ...safeConfig,
                      system: { ...safeConfig.system, preset: e.target.value as any }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="engineer">Engineer</option>
                  <option value="researcher">Researcher</option>
                  <option value="devops">DevOps</option>
                  <option value="edge_assistant">Edge Assistant</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">System Instructions</label>
              <textarea
                rows={5}
                value={safeConfig.system.systemPrompt}
                onChange={e =>
                  onChangeConfig({
                    ...safeConfig,
                    system: { ...safeConfig.system, systemPrompt: e.target.value }
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Sandbox Security & Memory Storage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sandbox Mode</label>
                <select
                  value={safeConfig.security.sandboxMode}
                  onChange={e =>
                    onChangeConfig({
                      ...safeConfig,
                      security: { ...safeConfig.security, sandboxMode: e.target.value as SandboxMode }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {VALID_SANDBOX_MODES.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Memory Backend</label>
                <select
                  value={safeConfig.storage.memoryBackend}
                  onChange={e =>
                    onChangeConfig({
                      ...safeConfig,
                      storage: { ...safeConfig.storage, memoryBackend: e.target.value as MemoryBackend }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {VALID_MEMORY_BACKENDS.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Environment Variables</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {Object.entries(safeConfig.customEnv || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-indigo-300 flex-1 truncate">
                      {k}={v}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextEnv = { ...(safeConfig.customEnv || {}) };
                        delete nextEnv[k];
                        onChangeConfig({ ...safeConfig, customEnv: nextEnv });
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEnvKey}
                  onChange={e => setCustomEnvKey(e.target.value)}
                  placeholder="VAR_NAME"
                  className="w-1/3 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
                <input
                  type="text"
                  value={customEnvVal}
                  onChange={e => setCustomEnvVal(e.target.value)}
                  placeholder="value"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customEnvKey.trim()) {
                      onChangeConfig({
                        ...safeConfig,
                        customEnv: { ...(safeConfig.customEnv || {}), [customEnvKey.trim()]: customEnvVal }
                      });
                      setCustomEnvKey('');
                      setCustomEnvVal('');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. NATIVE CONFIG & DIAGNOSTICS */}
      {subTab === 'native' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-400">
              Live editing <code className="text-indigo-300 font-mono">{nativeMeta?.fileName}</code> ({nativeFormat.toUpperCase()})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFromLiveFile}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 cursor-pointer"
              >
                Pull From Disk
              </button>
              <button
                type="button"
                onClick={() => setNativeContent(buildNativeText(safeConfig))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 border border-slate-700 cursor-pointer"
              >
                Regenerate from UI
              </button>
            </div>
          </div>

          {nativeFormat === 'yaml' && (
            <YamlEditor
              initialYaml={nativeContent}
              onChange={val => setNativeContent(val)}
              height="320px"
            />
          )}

          <InlineDiagnosticsEditor
            content={nativeContent}
            onChangeContent={setNativeContent}
            format={nativeFormat}
            rawMode="native"
            fileName={nativeMeta?.fileName || 'config'}
            issues={diagnostics.issues}
            lineIssuesMap={diagnostics.lineIssuesMap}
            schemaConfig={safeConfig}
            syntaxDetail={diagnostics.syntaxDetail}
            onApplyFix={issue => {
              const fixed = applySingleFix(nativeContent, issue, safeConfig, nativeFormat);
              setNativeContent(fixed);
            }}
            onAutoFixSyntax={() => setNativeContent(buildNativeText(safeConfig))}
            onSyncNativeToSchema={() => {
              const parsed = parseNativeConfigToSchema(agentId, nativeContent, nativeFormat);
              if (parsed.model) {
                onChangeConfig({
                  ...safeConfig,
                  model: {
                    ...safeConfig.model,
                    ...Object.fromEntries(
                      Object.entries(parsed.model).filter(([, v]) => v !== undefined && v !== '')
                    )
                  }
                });
              }
            }}
            rawError={diagnostics.syntaxDetail?.primaryError || null}
            lastKnownGoodSnapshot={lastKnownGoodSnapshot}
            onRestoreLastKnownGood={() => onRestoreLastKnownGood?.(agentId)}
          />
        </div>
      )}

      {/* 6. CHECKPOINTS & LAST KNOWN GOOD */}
      {subTab === 'checkpoints' && (
        <div className="space-y-4">
          {lastKnownGoodSnapshot && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Last Known Good Configuration Baseline
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Model: <code className="font-mono text-white">{lastKnownGoodSnapshot.model}</code> ({lastKnownGoodSnapshot.provider}) • {lastKnownGoodSnapshot.displayTime}
                </div>
              </div>
              {onRestoreLastKnownGood && (
                <button
                  type="button"
                  onClick={() => onRestoreLastKnownGood(agentId)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Restore Baseline
                </button>
              )}
            </div>
          )}

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Saved Configuration Checkpoints ({checkpointHistory.length})</h3>
            {checkpointHistory.length === 0 ? (
              <p className="text-xs text-slate-400">
                No checkpoints captured yet. Save a configuration or click "Pin Checkpoint" above.
              </p>
            ) : (
              <div className="space-y-2">
                {checkpointHistory.map((ckpt, idx) => (
                  <div
                    key={ckpt.id || idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {ckpt.model} <span className="text-slate-400 font-mono">({ckpt.provider})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {ckpt.displayTime} • {ckpt.note || 'Checkpoint snapshot'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onRestoreSpecificCheckpoint && (
                        <button
                          type="button"
                          onClick={() => onRestoreSpecificCheckpoint(ckpt)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-pointer"
                        >
                          Restore
                        </button>
                      )}
                      {onDeleteCheckpoint && ckpt.id && (
                        <button
                          type="button"
                          onClick={() => onDeleteCheckpoint(ckpt.id!)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigTab;
