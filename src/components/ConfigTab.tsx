import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Code2,
  Columns,
  X,
  Search,
  Activity,
  ArrowUpDown,
  CheckSquare,
  Square,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Sparkles,
  Plus,
  Trash2,
  Lightbulb,
  Layers,
  Brain,
  Target,
  Bot,
  ShieldAlert,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { 
  AgentFullConfig, 
  AgentId, 
  LLMProvider, 
  ReasoningEffort, 
  SandboxMode, 
  MemoryBackend,
  AgentInfo
} from '../types';
import { MODEL_OPTIONS, DEFAULT_CONFIGS, DEFAULT_NATIVE_FILES, INITIAL_AGENTS } from '../data/defaults';
import { AgentFallbackSettings } from './AgentFallbackSettings';
export { AgentFallbackSettings } from './AgentFallbackSettings';
import { 
  fetchAgentLiveConfig, 
  saveAgentConfigToBackend, 
  fetchModelsWithFallback, 
  testLLMConnection,
  benchmarkLLMProvider,
  logApiFailure, 
  DEFAULT_LOCAL_MODELS, 
  DEFAULT_GENERIC_MODELS,
  DEFAULT_PROVIDER_MODELS 
} from '../utils/apiBridge';
import { ConfigInjectionAlert, InjectionStatusInfo } from './ConfigInjectionAlert';
import { VerboseLogInspector, VerboseLogData } from './VerboseLogInspector';
import { InlineDiagnosticsEditor } from './InlineDiagnosticsEditor';
import { 
  validateAgentConfig, 
  validateDeepLinkSchema, 
  DeepSchemaIssue, 
  applySingleFix,
  validateFallbackConfiguration,
  VALID_PROVIDERS
} from '../utils/configValidator';
import { parseNativeConfigToSchema } from '../utils/configParser';
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
import { validateYamlConfig } from '../utils/yamlValidator';
import * as YAML from 'js-yaml';

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
 * Reactive hook to map the failover provider connection status into
 * beautifully designed visual states (connected / disconnected / testing / untested).
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

interface FailoverStatusBadgeProps {
  status: 'untested' | 'testing' | 'connected' | 'failed';
}

export const FailoverStatusBadge: React.FC<FailoverStatusBadgeProps> = ({ status }) => {
  const visual = useFailoverVisualStatus(status);

  return (
    <span 
      id="failover-status-badge" 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${visual.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${visual.dotColor} ${status === 'testing' ? 'animate-ping' : ''}`} />
      <span>{visual.label}</span>
    </span>
  );
};

interface ConfigTabProps {
  agentId: AgentId;
  config: AgentFullConfig;
  onChangeConfig: (newConfig: AgentFullConfig) => void;
  onSaveConfig: (restartContainer: boolean) => void;
  onResetDefaults: () => void;
  isSaving: boolean;
  onInjectConfig?: (agentId: AgentId) => Promise<void>;
  injectionStatus?: InjectionStatusInfo | null;
  onDismissInjectionStatus?: () => void;
  externalVerboseLog?: VerboseLogData | null;
  allConfigs?: Record<string, AgentFullConfig>;
  allAgents?: AgentInfo[];
  onUpdateAgentConfig?: (id: AgentId, newCfg: AgentFullConfig) => void;
  onExecuteCommand?: (command: string) => Promise<void>;
}

type ConfigSection = 'model' | 'moa' | 'channels' | 'system' | 'security' | 'storage' | 'fallback' | 'raw';

export interface MoASynergyRecommendation {
  id: string;
  title: string;
  category: 'Local / Edge' | 'Cloud Frontier' | 'Hybrid';
  badgeColor: string;
  proposers: string[];
  aggregator: string;
  rounds: number;
  description: string;
  synergyReason: string;
}

export const MOA_SYNERGY_RECOMMENDATIONS: MoASynergyRecommendation[] = [
  {
    id: 'local-coding-logic',
    title: 'Local Code & Logic Trio',
    category: 'Local / Edge',
    badgeColor: 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300',
    proposers: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'],
    aggregator: 'qwen2.5-coder:14b',
    rounds: 2,
    description: 'Specialized edge ensemble combining code AST syntax, reasoning reflection, and natural language cohesion.',
    synergyReason: 'Qwen excels at syntactic code generation and API structure; DeepSeek-R1 catches logical bugs and edge cases via chain-of-thought verification; Gemma provides fluent documentation and clean conversational synthesis.'
  },
  {
    id: 'fast-edge-consensus',
    title: 'Fast Low-Latency Consensus',
    category: 'Local / Edge',
    badgeColor: 'border-cyan-500/30 bg-cyan-950/60 text-cyan-300',
    proposers: ['qwen2.5-coder:7b', 'mistral-nemo:12b', 'llama3.3:8b'],
    aggregator: 'qwen2.5-coder:7b',
    rounds: 1,
    description: 'High-throughput 7B-12B ensemble with low VRAM footprint for sub-second parallel passes.',
    synergyReason: 'Three architecturally distinct lightweight models run in parallel with negligible memory contention, preventing single-model hallucinations without increasing generation latency.'
  },
  {
    id: 'deep-reasoning-audit',
    title: 'Deep Reasoning & Math Audit',
    category: 'Local / Edge',
    badgeColor: 'border-amber-500/30 bg-amber-950/60 text-amber-300',
    proposers: ['deepseek-r1:8b', 'qwen2.5-coder:14b', 'llama3.3:70b'],
    aggregator: 'deepseek-r1:8b',
    rounds: 3,
    description: 'Heavy multi-step verification for complex algorithms, math calculations, and architecture designs.',
    synergyReason: 'DeepSeek-R1 enforces rigorous mathematical proofs, Qwen provides programmatic validation, and Llama 70B contributes broad semantic knowledge across 3 consensus rounds.'
  },
  {
    id: 'cloud-frontier-diversity',
    title: 'Frontier Multi-Lab Triangulation',
    category: 'Cloud Frontier',
    badgeColor: 'border-purple-500/30 bg-purple-950/60 text-purple-300',
    proposers: ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'],
    aggregator: 'claude-3-7-sonnet',
    rounds: 2,
    description: 'Multi-provider frontier consensus cross-checking Anthropic, DeepSeek, and OpenAI foundation weights.',
    synergyReason: 'Combines Claude’s nuanced code refactoring and prose, DeepSeek’s relentless algorithmic rigor, and GPT-4o’s broad world knowledge. Eliminates single-lab bias completely.'
  },
  {
    id: 'hybrid-edge-cloud',
    title: 'Hybrid Edge-Draft + Cloud Audit',
    category: 'Hybrid',
    badgeColor: 'border-indigo-500/30 bg-indigo-950/60 text-indigo-300',
    proposers: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'claude-3-7-sonnet'],
    aggregator: 'claude-3-7-sonnet',
    rounds: 2,
    description: 'Local edge drafting combined with cloud frontier verification for optimal speed and cost efficiency.',
    synergyReason: 'Local models generate immediate solution drafts privately and at zero token cost, while Claude audits the proposed solutions and synthesizes the optimal final artifact.'
  }
];

export const ConfigTab: React.FC<ConfigTabProps> = ({
  agentId,
  config,
  onChangeConfig,
  onSaveConfig,
  onResetDefaults,
  isSaving,
  onInjectConfig,
  injectionStatus,
  onDismissInjectionStatus,
  externalVerboseLog,
  allConfigs,
  allAgents,
  onUpdateAgentConfig,
  onExecuteCommand
}) => {
  const [rawYaml, setRawYaml] = useState(() => YAML.dump(config));
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ConfigSection>('model');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [rawText, setRawText] = useState(JSON.stringify(config, null, 2));
  const [rawMode, setRawMode] = useState<'schema' | 'native'>('native');
  const [rawError, setRawError] = useState<string | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [activeLogInspection, setActiveLogInspection] = useState<VerboseLogData | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [showFallbackApiKey, setShowFallbackApiKey] = useState(false);
  const [filterMoaOnlyAvailable, setFilterMoaOnlyAvailable] = useState(false);

  // Model Connectivity live state
  const [modelConnectivityStatus, setModelConnectivityStatus] = useState<'checking' | 'available' | 'unreachable'>('checking');
  const [modelConnectivityLatency, setModelConnectivityLatency] = useState<number | null>(null);
  const [connectivityErrorReason, setConnectivityErrorReason] = useState<string>('');
  const [isRevalidatingPrimary, setIsRevalidatingPrimary] = useState<boolean>(false);
  const [primaryRevalidationMessage, setPrimaryRevalidationMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const currentAgent = allAgents?.find(a => a.id === agentId);

  // Dedicated check for whether the agent is running on its fallback configuration
  // Fallback is only actively running when fallback is enabled AND the primary provider is unreachable/degraded
  const isRunningOnFallback = Boolean(
    config.fallback?.enabled && modelConnectivityStatus === 'unreachable'
  );

  const handleRevalidatePrimaryProvider = async () => {
    setIsRevalidatingPrimary(true);
    setModelConnectivityStatus('checking');
    setPrimaryRevalidationMessage(null);
    const start = performance.now();
    try {
      const result = await testLLMConnection(
        config.model.provider,
        config.model.apiKey || '',
        config.model.baseUrl || ''
      );
      const elapsed = Math.round(performance.now() - start);
      if (result.success) {
        setModelConnectivityStatus('available');
        setModelConnectivityLatency(elapsed > 0 ? elapsed : 12);
        setConnectivityErrorReason('');
        setPrimaryRevalidationMessage({
          type: 'success',
          text: `Primary provider (${config.model.provider.toUpperCase()}) re-validated successfully (${elapsed}ms). Primary routing restored.`
        });
      } else {
        setModelConnectivityStatus('unreachable');
        setModelConnectivityLatency(elapsed > 0 ? elapsed : 24);
        setConnectivityErrorReason(result.message || 'Primary provider connection failed.');
        setPrimaryRevalidationMessage({
          type: 'error',
          text: `Primary re-validation failed: ${result.message || 'Provider unreachable.'}`
        });
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setModelConnectivityStatus('unreachable');
      setModelConnectivityLatency(elapsed > 0 ? elapsed : 35);
      setConnectivityErrorReason(err.message || 'Connection failed.');
      setPrimaryRevalidationMessage({
        type: 'error',
        text: `Re-validation error: ${err.message || 'Endpoint connection failed'}`
      });
    } finally {
      setIsRevalidatingPrimary(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkModelConnectivity = async () => {
      setModelConnectivityStatus('checking');
      setConnectivityErrorReason('');
      const start = performance.now();
      try {
        const result = await testLLMConnection(
          config.model.provider,
          config.model.apiKey || '',
          config.model.baseUrl || ''
        );
        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          if (result.success) {
            setModelConnectivityStatus('available');
            setModelConnectivityLatency(elapsed > 0 ? elapsed : 12);
            setConnectivityErrorReason('');
          } else {
            setModelConnectivityStatus('unreachable');
            setModelConnectivityLatency(elapsed > 0 ? elapsed : 24);
            setConnectivityErrorReason(result.message || 'Connection refused or timeout at endpoint.');
          }
        }
      } catch (err: any) {
        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          setModelConnectivityStatus('unreachable');
          setModelConnectivityLatency(elapsed > 0 ? elapsed : 35);
          const msg = err.message || '';
          if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
            setConnectivityErrorReason('Connection timeout: Server took too long to respond.');
          } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
            setConnectivityErrorReason('DNS failure: Unable to resolve hostname for endpoint base URL.');
          } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            setConnectivityErrorReason('Network error or CORS restriction: Unable to reach base URL.');
          } else {
            setConnectivityErrorReason(msg || 'Unreachable: Endpoint refused connection or timed out.');
          }
        }
      }
    };

    checkModelConnectivity();

    // 30-second automated polling mechanism
    const pollInterval = setInterval(() => {
      checkModelConnectivity();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [agentId, config.model?.provider, config.model?.baseUrl, config.model?.apiKey]);

  // Split-screen multi-agent comparison & edit state
  const [isSplitScreenCompareOpen, setIsSplitScreenCompareOpen] = useState(false);
  const initialSecId = agentId === 'zeroclaw' ? 'hermes-agent' : 'zeroclaw';
  const [secondaryAgentId, setSecondaryAgentId] = useState<AgentId>(initialSecId);
  const [secondaryConfig, setSecondaryConfig] = useState<AgentFullConfig>(() => {
    return (allConfigs && allConfigs[initialSecId]) || DEFAULT_CONFIGS[initialSecId] || DEFAULT_CONFIGS['hermes-agent'];
  });
  
  // Default native config info initialized from DEFAULT_NATIVE_FILES
  const [nativeConfigInfo, setNativeConfigInfo] = useState<{ fileName: string; format: string; content: string }>(() => {
    return DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
  });

  const [persistenceRawData, setPersistenceRawData] = useState<string>('');
  const [isPersistenceLoading, setIsPersistenceLoading] = useState(false);

  const fetchPersistenceDiagnostic = async () => {
    setIsPersistenceLoading(true);
    try {
      const res = await fetch('/api/persistence');
      if (res.ok) {
        const data = await res.json();
        setPersistenceRawData(JSON.stringify(data, null, 2));
      } else {
        setPersistenceRawData(`Error: HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      setPersistenceRawData(`Error fetching persistence.json: ${err.message || err}`);
    } finally {
      setIsPersistenceLoading(false);
    }
  };
  
  const [restartContainer, setRestartContainer] = useState(true);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  // Sync external verbose logs (e.g. from container exec injection in App.tsx)
  React.useEffect(() => {
    if (externalVerboseLog) {
      setActiveLogInspection(externalVerboseLog);
      setIsInspectorOpen(true);
    }
  }, [externalVerboseLog]);

  // Fetch live config automatically on mount and agentId change
  React.useEffect(() => {
    const fallback = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
    setNativeConfigInfo(fallback);
    fetchLiveConfig(false);
  }, [agentId]);

  // Sync raw text when config or mode changes
  React.useEffect(() => {
    if (rawMode === 'schema') {
      setRawText(JSON.stringify(config, null, 2));
    } else {
      setRawText(nativeConfigInfo?.content || DEFAULT_NATIVE_FILES[agentId]?.content || JSON.stringify(config, null, 2));
    }
  }, [config, rawMode, nativeConfigInfo, agentId]);

  // Deep-Link schema validation between native content and JSON schema
  const deepValidation = React.useMemo(() => {
    const format = (nativeConfigInfo?.format || 'yaml') as 'yaml' | 'toml' | 'json';
    const content = rawMode === 'native' ? rawText : (nativeConfigInfo?.content || '');
    return validateDeepLinkSchema(agentId, content, config, format);
  }, [agentId, rawText, rawMode, nativeConfigInfo, config]);

  // Failback & Fallback schema validation status
  const fallbackValidation = React.useMemo(() => {
    return validateFallbackConfiguration(config.fallback, agentId);
  }, [config.fallback, agentId]);

  const handleSyncNativeToSchema = () => {
    try {
      const format = (nativeConfigInfo?.format || 'yaml') as 'yaml' | 'toml' | 'json';
      const content = rawMode === 'native' ? rawText : (nativeConfigInfo?.content || '');
      const parsed = parseNativeConfigToSchema(agentId, content, format);
      if (parsed && Object.keys(parsed).length > 0) {
        onChangeConfig({
          ...config,
          ...parsed,
          model: {
            ...config.model,
            ...(parsed.model || {})
          }
        });
        setRawError(null);
      }
    } catch (err: any) {
      setRawError(`Sync failed: ${err.message}`);
    }
  };

  const handleAutoFixSyntax = () => {
    let fixed = rawText;
    // Replace tab characters with 2 spaces
    fixed = fixed.replace(/\t/g, '  ');
    // Remove trailing whitespace on each line
    fixed = fixed.split('\n').map(l => l.trimEnd()).join('\n');
    setRawText(fixed);
    if (rawMode === 'native') {
      setNativeConfigInfo(prev => ({ ...prev, content: fixed }));
    }
  };

  const handleApplySingleFix = (issue: DeepSchemaIssue) => {
    const fixedContent = applySingleFix(rawText, issue);
    setRawText(fixedContent);
    if (rawMode === 'native') {
      setNativeConfigInfo(prev => ({ ...prev, content: fixedContent }));
    } else {
      try {
        const parsed = JSON.parse(fixedContent);
        onChangeConfig(parsed);
      } catch {
        // Handled by validation
      }
    }
  };

  const fetchLiveConfig = async (isManualClick: boolean = false) => {
    setIsFetchingLive(true);
    try {
      const data = await fetchAgentLiveConfig(agentId);
      if (data) {
        setNativeConfigInfo({
          fileName: data.fileName,
          format: data.format,
          content: data.content
        });
        if (data.configSchema) {
          onChangeConfig(data.configSchema);
        }

        const logData: VerboseLogData = {
          action: 'Fetch Live Container Config',
          agentId,
          logs: data.verboseLogs,
          rawJson: data.rawJson,
          timestamp: data.timestamp,
          source: data.source,
          filePath: data.filePath,
          status: data.isLive ? 'success' : 'warning'
        };

        setActiveLogInspection(logData);

        if (isManualClick) {
          setIsInspectorOpen(true);
          console.group(`%c[ClawDock Live Container Config Manual Fetch] Agent: ${agentId}`, 'color: #818cf8; font-weight: bold; font-size: 12px;');
          console.log('Verbose logs:\n' + data.verboseLogs.join('\n'));
          console.log('Raw JSON Payload:', data.rawJson);
          console.groupEnd();
        }
      }
    } catch (e: any) {
      const fallback = DEFAULT_NATIVE_FILES[agentId] || DEFAULT_NATIVE_FILES['hermes-agent'];
      setNativeConfigInfo(fallback);
      const errLog: VerboseLogData = {
        action: 'Fetch Live Container Config (Failed)',
        agentId,
        logs: [
          `[${new Date().toLocaleTimeString()}] [ERROR] Fetch failed: ${e?.message || e}`,
          `[${new Date().toLocaleTimeString()}] [FALLBACK] Restored template from ${fallback.fileName}.`
        ],
        rawJson: { error: e?.message || String(e) },
        timestamp: new Date().toLocaleTimeString(),
        source: 'fallback',
        filePath: fallback.fileName,
        status: 'error'
      };
      setActiveLogInspection(errLog);
      if (isManualClick) setIsInspectorOpen(true);
    } finally {
      setIsFetchingLive(false);
    }
  };

  const [isFetchingModules, setIsFetchingModules] = useState(false);
  const [fetchedModelsMap, setFetchedModelsMap] = useState<Record<string, { value: string; label: string; tag?: string }[]>>({});
  const [providerLiveStatus, setProviderLiveStatus] = useState<Record<string, { isLive: boolean; source: string; count: number }>>({});
  const [onlyLiveFilter, setOnlyLiveFilter] = useState<boolean>(false);

  const [isFetchingFallbackModels, setIsFetchingFallbackModels] = useState(false);
  const [isTestingFallbackConnection, setIsTestingFallbackConnection] = useState(false);
  const [fallbackConnectionStatus, setFallbackConnectionStatus] = useState<{
    status: 'untested' | 'testing' | 'connected' | 'failed';
    message?: string;
  }>({ status: 'untested' });
  const [showSaveValidationWarning, setShowSaveValidationWarning] = useState<boolean>(false);
  const [pendingRestartParam, setPendingRestartParam] = useState<boolean | null>(null);
  const [fallbackFetchedModelsMap, setFallbackFetchedModelsMap] = useState<Record<string, { value: string; label: string; tag?: string }[]>>({});
  const [fallbackProviderLiveStatus, setFallbackProviderLiveStatus] = useState<Record<string, { isLive: boolean; source: string; count: number }>>({});
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [secondaryModel, setSecondaryModel] = useState<string>('qwen2.5-coder:7b');
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [modelSearchQuery, setModelSearchQuery] = useState<string>('');
  const [sortByContext, setSortByContext] = useState<boolean>(false);
  const [bulkSelectMode, setBulkSelectMode] = useState<boolean>(false);
  const [selectedModelsForBulk, setSelectedModelsForBulk] = useState<string[]>([]);
  const [pingLatencyMs, setPingLatencyMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [copiedModelSpec, setCopiedModelSpec] = useState<boolean>(false);
  const [secondaryTemperature, setSecondaryTemperature] = useState<number>(0.7);
  const [secondaryContextWindow, setSecondaryContextWindow] = useState<number>(128000);
  const [secondaryProvider, setSecondaryProvider] = useState<LLMProvider>('ollama');
  const [appliedMoaPreset, setAppliedMoaPreset] = useState<string | null>(null);
  const [showRawMoaInput, setShowRawMoaInput] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);
  const [proxyModelsEnabled, setProxyModelsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('proxyModelsEnabled') !== 'false';
  });
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkLatency, setBenchmarkLatency] = useState<number | null>(null);
  const [benchmarkMessage, setBenchmarkMessage] = useState<string>('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [isFallbackModelDropdownOpen, setIsFallbackModelDropdownOpen] = useState<boolean>(false);
  const [fallbackModelSearchQuery, setFallbackModelSearchQuery] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<AgentPurpose>(() => getAgentDefaultPurpose(agentId));

  useEffect(() => {
    setSelectedPurpose(getAgentDefaultPurpose(agentId));
  }, [agentId]);

  const getContextSizeVal = (modelValue: string, label: string): number => {
    const str = (modelValue + ' ' + label).toLowerCase();
    if (str.includes('200k') || str.includes('claude-3-7') || str.includes('claude-3-5')) return 200000;
    if (str.includes('128k') || str.includes('coder') || str.includes('gpt-4o') || str.includes('o1') || str.includes('o3')) return 128000;
    if (str.includes('65k') || str.includes('gemma4') || str.includes('soul')) return 65536;
    if (str.includes('32k') || str.includes('deepseek')) return 32768;
    return 16384;
  };

  const handlePingEndpoint = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      const elapsed = Math.round(performance.now() - start);
      setPingLatencyMs(elapsed > 0 ? elapsed : 14);
    } catch {
      const elapsed = Math.round(performance.now() - start);
      setPingLatencyMs(elapsed > 0 ? elapsed : 32);
    } finally {
      setIsPinging(false);
    }
  };

  const handleBenchmarkProvider = async () => {
    setIsBenchmarking(true);
    setBenchmarkLatency(null);
    setBenchmarkMessage('');
    try {
      const result = await benchmarkLLMProvider(config.model.provider, config.model.baseUrl || '');
      setBenchmarkLatency(result.latencyMs);
      setBenchmarkMessage(result.message);
    } catch (err: any) {
      setBenchmarkMessage(err.message || 'Benchmark failed.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const getMetadataBadges = (modelValue: string, providerName: string, tag?: string): string[] => {
    const badges: string[] = [];
    const val = (modelValue || '').toLowerCase();
    const prov = (providerName || '').toLowerCase();

    if (tag) badges.push(tag);
    if (val.includes('coder') || val.includes('128k') || val.includes('claude-3-7') || val.includes('gpt-4o') || val.includes('o1') || val.includes('o3')) {
      badges.push('128k context');
    } else if (val.includes('65k') || val.includes('gemma4') || val.includes('soul')) {
      badges.push('65k context');
    } else if (prov === 'groq') {
      badges.push('Fast Inference');
    } else {
      badges.push('32k context');
    }

    if (val.includes('r1') || val.includes('o1') || val.includes('o3') || val.includes('3-7') || val.includes('reasoning') || prov === 'deepseek') {
      badges.push('Reasoning');
    }

    if (prov === 'ollama' || prov === 'custom' || val.includes('gemma') || val.includes('qwen') || val.includes('latest')) {
      badges.push('Local Edge');
    }

    if (val.includes('4o') || val.includes('claude') || val.includes('gemini') || val.includes('vision')) {
      badges.push('Vision');
    }

    return Array.from(new Set(badges));
  };

  const copyModelSpecToClipboard = () => {
    if (selectedModelsForBulk.length > 0) {
      const specs = selectedModelsForBulk.map((modelVal) => ({
        agentId,
        provider: config.model.provider,
        model: modelVal,
        baseUrl: config.model.baseUrl,
        temperature: config.model.temperature,
        contextWindow: getContextSizeVal(modelVal, modelVal),
        maxTokens: config.model.maxTokens,
        reasoningEffort: config.model.reasoningEffort,
        metadataBadges: getMetadataBadges(modelVal, config.model.provider),
        timestamp: new Date().toISOString()
      }));
      navigator.clipboard.writeText(JSON.stringify(specs, null, 2));
    } else {
      const spec = [{
        agentId,
        provider: config.model.provider,
        model: config.model.model,
        baseUrl: config.model.baseUrl,
        temperature: config.model.temperature,
        contextWindow: config.model.contextWindow || getContextSizeVal(config.model.model, config.model.model),
        maxTokens: config.model.maxTokens,
        reasoningEffort: config.model.reasoningEffort,
        metadataBadges: getMetadataBadges(config.model.model, config.model.provider),
        timestamp: new Date().toISOString()
      }];
      navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    }
    setCopiedModelSpec(true);
    setTimeout(() => setCopiedModelSpec(false), 2000);
  };

  const handleFetchModels = async () => {
    setIsFetchingModules(true);
    try {
      // Execute resilient model fetch strictly for the currently selected provider
      const result = await fetchModelsWithFallback(
        config.model.provider,
        config.model.baseUrl,
        agentId,
        config.model.model,
        config.model.useProxy !== false,
        proxyModelsEnabled
      );

      let fetchedModels = result.models;

      const isLive = result.source === 'live_probe';
      setProviderLiveStatus(prev => ({
        ...prev,
        [config.model.provider]: {
          isLive,
          source: result.source,
          count: result.models.length
        }
      }));

      // If live models were discovered on the provider, auto-enable onlyLiveFilter
      if (isLive && result.models.length > 0) {
        setOnlyLiveFilter(true);
      }

      // Ensure active model is explicitly included in the fetched catalog if not already present
      if (config.model.model && !fetchedModels.some(m => m.value === config.model.model)) {
        fetchedModels = [
          { value: config.model.model, label: `${config.model.model} (Active)`, tag: 'Active' },
          ...fetchedModels
        ];
      }

      // Ensure active model is tagged
      const formattedModels = fetchedModels.map(opt => ({
        ...opt,
        tag: opt.value === config.model.model ? (opt.tag || 'Active') : opt.tag
      }));

      setFetchedModelsMap(prev => ({
        ...prev,
        [config.model.provider]: formattedModels
      }));
    } catch (e: any) {
      // Graceful fallback strictly providing models for the selected provider
      const prov = config.model.provider || 'ollama';
      const fallbackList = DEFAULT_PROVIDER_MODELS[prov] || MODEL_OPTIONS[prov] || DEFAULT_LOCAL_MODELS;
      setProviderLiveStatus(prev => ({
        ...prev,
        [config.model.provider]: {
          isLive: false,
          source: 'static_fallback',
          count: fallbackList.length
        }
      }));
      setFetchedModelsMap(prev => ({
        ...prev,
        [config.model.provider]: fallbackList
      }));
    } finally {
      setIsFetchingModules(false);
    }
  };

  const handleFetchModules = handleFetchModels;

  const handleFetchFallbackModels = async () => {
    setIsFetchingFallbackModels(true);
    try {
      const fbProvider = config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama';
      const fbBaseUrl = config.fallback?.baseUrl || '';
      const fbModel = config.fallback?.fallbackModel || config.fallback?.model || '';
      const fbUseProxy = config.fallback?.useProxy !== false;
      const fbApiKey = config.fallback?.apiKey || '';

      const result = await fetchModelsWithFallback(
        fbProvider as string,
        fbBaseUrl,
        agentId,
        fbModel,
        fbUseProxy,
        true, // forceProxyModelsPath to use backend proxy
        fbApiKey
      );

      let fetchedModels = result.models;
      const isLive = result.source === 'live_probe';

      setFallbackProviderLiveStatus(prev => ({
        ...prev,
        [fbProvider]: {
          isLive,
          source: result.source,
          count: result.models.length
        }
      }));

      if (fbModel && !fetchedModels.some(m => m.value === fbModel)) {
        fetchedModels = [
          { value: fbModel, label: `${fbModel} (Active)`, tag: 'Active' },
          ...fetchedModels
        ];
      }

      const formattedModels = fetchedModels.map(opt => ({
        ...opt,
        tag: opt.value === fbModel ? (opt.tag || 'Active') : opt.tag
      }));

      setFallbackFetchedModelsMap(prev => ({
        ...prev,
        [fbProvider]: formattedModels
      }));

      if (isLive) {
        setFallbackConnectionStatus({
          status: 'connected',
          message: `Successfully connected & verified with ${fbProvider.toUpperCase()} (${result.models.length} models fetched).`
        });
      }
    } catch (e: any) {
      const prov = (config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama') as string;
      const fallbackList = DEFAULT_PROVIDER_MODELS[prov] || MODEL_OPTIONS[prov] || DEFAULT_LOCAL_MODELS;
      setFallbackProviderLiveStatus(prev => ({
        ...prev,
        [prov]: {
          isLive: false,
          source: 'static_fallback',
          count: fallbackList.length
        }
      }));
      setFallbackFetchedModelsMap(prev => ({
        ...prev,
        [prov]: fallbackList
      }));
      setFallbackConnectionStatus({
        status: 'failed',
        message: `Connection test failed: Could not fetch models from ${prov.toUpperCase()}. Please check your API key, base URL, and proxy routing.`
      });
    } finally {
      setIsFetchingFallbackModels(false);
    }
  };

  const handleTestFallbackConnection = async () => {
    setIsTestingFallbackConnection(true);
    setFallbackConnectionStatus({ status: 'testing' });
    try {
      const fbProvider = config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama';
      const fbApiKey = config.fallback?.apiKey || '';
      const fbBaseUrl = config.fallback?.baseUrl || '';

      const result = await testLLMConnection(fbProvider as string, fbApiKey, fbBaseUrl);
      if (result.success) {
        setFallbackConnectionStatus({
          status: 'connected',
          message: result.message
        });
      } else {
        setFallbackConnectionStatus({
          status: 'failed',
          message: result.message
        });
      }
    } catch (err: any) {
      setFallbackConnectionStatus({
        status: 'failed',
        message: err.message || 'Connection test encountered an unexpected error.'
      });
    } finally {
      setIsTestingFallbackConnection(false);
    }
  };

  const handleInterceptSave = async (restartContainer: boolean) => {
    setShowSaveValidationWarning(false);
    setPendingRestartParam(null);

    // Always persist configuration and API keys immediately so user inputs are never lost
    onSaveConfig(restartContainer);
  };

  useEffect(() => {
    handleFetchModels();
  }, [config.model.provider, config.model.baseUrl, config.model.useProxy, proxyModelsEnabled, agentId]);

  // Periodic Auto-refresh of models catalog
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      // Periodic background probe
      handleFetchModels();
    }, 15000); // 15 seconds standard interval

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, config.model.provider, config.model.baseUrl, config.model.useProxy, proxyModelsEnabled, agentId]);

  useEffect(() => {
    handleFetchFallbackModels();
  }, [
    config.fallback?.fallbackProvider,
    config.fallback?.provider,
    config.fallback?.baseUrl,
    config.fallback?.useProxy,
    agentId
  ]);

  useEffect(() => {
    setFallbackConnectionStatus({ status: 'untested' });
  }, [
    config.fallback?.fallbackProvider,
    config.fallback?.provider,
    config.fallback?.apiKey,
    config.fallback?.baseUrl
  ]);

  const handleProviderChange = (provider: LLMProvider) => {
    const available = MODEL_OPTIONS[provider] || DEFAULT_PROVIDER_MODELS[provider] || [];
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

  const rawProviderList = fetchedModelsMap[config.model.provider] || MODEL_OPTIONS[config.model.provider] || DEFAULT_PROVIDER_MODELS[config.model.provider] || [];
  const currentModelList = [...rawProviderList];
  if (config.model.model && !currentModelList.some((m) => m.value === config.model.model)) {
    currentModelList.unshift({
      value: config.model.model,
      label: `${config.model.model} (Active Checkpoint)`
    });
  }

  const activeLiveStatus = providerLiveStatus[config.model.provider];

  let filteredModelList = currentModelList.filter((m) => {
    if (onlyLiveFilter && activeLiveStatus?.isLive) {
      const isLiveOrActive = m.tag === 'Live' || m.value === config.model.model;
      if (!isLiveOrActive) return false;
    }
    if (modelSearchQuery) {
      const q = modelSearchQuery.toLowerCase();
      const matchesSearch = (
        m.value.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        (m.tag && m.tag.toLowerCase().includes(q))
      );
      if (!matchesSearch) return false;
    }
    return true;
  });

  if (sortByContext) {
    filteredModelList = [...filteredModelList].sort((a, b) => {
      const sizeA = getContextSizeVal(a.value, a.label);
      const sizeB = getContextSizeVal(b.value, b.label);
      return sizeB - sizeA;
    });
  }

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
          {agentId === 'hermes-agent' && (
            <button
              id="hermes-migrate-btn"
              onClick={async () => {
                if (onExecuteCommand) {
                  await onExecuteCommand('hermes migrate');
                } else {
                  try {
                    const res = await fetch(`/api/agents/${agentId}/exec`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ command: 'hermes migrate' })
                    });
                    if (res.ok) {
                      alert('Migration triggered successfully!');
                    } else {
                      alert('Failed to trigger migration.');
                    }
                  } catch (e) {
                    alert('Error triggering migration.');
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Config Migrate
            </button>
          )}
          {onInjectConfig && (
            <button
              id="inject-exec-config-btn"
              onClick={async () => {
                setIsInspectorOpen(true);
                await onInjectConfig(agentId);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Inject from Container Exec
            </button>
          )}

          <button
            id="fetch-live-config-btn"
            onClick={() => fetchLiveConfig(true)}
            disabled={isFetchingLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors disabled:opacity-50"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            {isFetchingLive ? 'Fetching...' : 'Fetch Live Container Config'}
          </button>

          <button
            type="button"
            onClick={() => setIsSplitScreenCompareOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSplitScreenCompareOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50'
                : 'text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-indigo-400" />
            {isSplitScreenCompareOpen ? 'Close Split-Screen Compare' : 'Split-Screen Compare'}
          </button>

          {activeLogInspection && (
            <button
              id="toggle-verbose-inspector-btn"
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isInspectorOpen 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                  : 'text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              {isInspectorOpen ? 'Hide Logs & JSON' : 'View Logs & JSON'}
            </button>
          )}

          <button
            id="quick-reset-btn"
            onClick={() => fetchLiveConfig(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 transition-colors"
            title="Discard all unsaved local changes and reload from container config file"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            Quick Reset
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
            id="save-config-file-btn"
            onClick={() => handleInterceptSave(false)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50"
            title="Save configuration to file (.hermes/config.yaml / clawdock mount)"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            {isSaving ? 'Saving...' : 'Save configuration to file'}
          </button>

          <button
            id="save-config-agent-btn"
            onClick={() => handleInterceptSave(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-950/40 disabled:opacity-50"
            title="Save configuration to agent and execute docker container CLI config set / restart"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save configuration to agent'}
          </button>
        </div>
      </div>

      {/* Split-Screen Multi-Agent Compare & Edit View */}
      {isSplitScreenCompareOpen && (
        <div className="space-y-6 p-6 rounded-2xl border border-indigo-500/40 bg-slate-900/95 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Columns className="w-5 h-5 text-indigo-400" />
                Split-Screen Multi-Agent Compare &amp; Edit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side configuration specification editor for comparing and editing two agents simultaneously.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Compare with:</span>
              <select
                value={secondaryAgentId}
                onChange={(e) => {
                  const newSecId = e.target.value as AgentId;
                  setSecondaryAgentId(newSecId);
                  if (allConfigs && allConfigs[newSecId]) {
                    setSecondaryConfig(allConfigs[newSecId]);
                  } else {
                    setSecondaryConfig(DEFAULT_CONFIGS[newSecId] || DEFAULT_CONFIGS['hermes-agent']);
                  }
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {(allAgents || INITIAL_AGENTS).map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === agentId}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsSplitScreenCompareOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Close Split-Screen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Primary Agent */}
            <div className="space-y-4 p-5 rounded-xl border border-slate-800 bg-slate-950/80 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-bold text-white capitalize">{agentId} (Primary)</span>
                </div>
                <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Model: {config.model?.model || 'default'}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Provider</label>
                  <select
                    value={config.model?.provider || 'ollama'}
                    onChange={(e) => {
                      onChangeConfig({
                        ...config,
                        model: { ...config.model, provider: e.target.value as any }
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    <option value="ollama">Ollama (Local Edge)</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="custom">Custom Endpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Model Identifier</label>
                  <input
                    type="text"
                    value={config.model?.model || ''}
                    onChange={(e) => {
                      onChangeConfig({
                        ...config,
                        model: { ...config.model, model: e.target.value }
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="e.g. gemma4-soul:latest"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Temperature ({config.model?.temperature ?? 0.3})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.model?.temperature ?? 0.3}
                    onChange={(e) => {
                      onChangeConfig({
                        ...config,
                        model: { ...config.model, temperature: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">System Prompt Preset</label>
                  <textarea
                    rows={3}
                    value={config.system?.systemPrompt || ''}
                    onChange={(e) => {
                      onChangeConfig({
                        ...config,
                        system: { ...config.system, systemPrompt: e.target.value }
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Secondary Agent */}
            <div className="space-y-4 p-5 rounded-xl border border-indigo-500/30 bg-slate-950/80 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-sm font-bold text-white capitalize">{secondaryAgentId} (Comparison)</span>
                </div>
                <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Model: {secondaryConfig.model?.model || 'default'}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Provider</label>
                  <select
                    value={secondaryConfig.model?.provider || 'ollama'}
                    onChange={(e) => {
                      const updated = {
                        ...secondaryConfig,
                        model: { ...secondaryConfig.model, provider: e.target.value as any }
                      };
                      setSecondaryConfig(updated);
                      if (onUpdateAgentConfig) onUpdateAgentConfig(secondaryAgentId, updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    <option value="ollama">Ollama (Local Edge)</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="custom">Custom Endpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Model Identifier</label>
                  <input
                    type="text"
                    value={secondaryConfig.model?.model || ''}
                    onChange={(e) => {
                      const updated = {
                        ...secondaryConfig,
                        model: { ...secondaryConfig.model, model: e.target.value }
                      };
                      setSecondaryConfig(updated);
                      if (onUpdateAgentConfig) onUpdateAgentConfig(secondaryAgentId, updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="e.g. gemma4-soul:latest"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Temperature ({secondaryConfig.model?.temperature ?? 0.3})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={secondaryConfig.model?.temperature ?? 0.3}
                    onChange={(e) => {
                      const updated = {
                        ...secondaryConfig,
                        model: { ...secondaryConfig.model, temperature: parseFloat(e.target.value) }
                      };
                      setSecondaryConfig(updated);
                      if (onUpdateAgentConfig) onUpdateAgentConfig(secondaryAgentId, updated);
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">System Prompt Preset</label>
                  <textarea
                    rows={3}
                    value={secondaryConfig.system?.systemPrompt || ''}
                    onChange={(e) => {
                      const updated = {
                        ...secondaryConfig,
                        system: { ...secondaryConfig.system, systemPrompt: e.target.value }
                      };
                      setSecondaryConfig(updated);
                      if (onUpdateAgentConfig) onUpdateAgentConfig(secondaryAgentId, updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSaveValidationWarning && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md shadow-rose-950/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Failover Provider Connection Failed</p>
              <p className="text-rose-300/90 leading-relaxed text-[11px]">
                The test connection to your failover provider returned an error:
                <span className="font-mono bg-rose-950/60 px-2 py-1 rounded text-rose-300 block mt-1">
                  "{fallbackConnectionStatus.message || 'Unknown network or authentication error.'}"
                </span>
                Proceeding may cause errors if primary execution fails and failover is triggered.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => setShowSaveValidationWarning(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowSaveValidationWarning(false);
                if (pendingRestartParam !== null) {
                  onSaveConfig(pendingRestartParam);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm transition-colors"
            >
              Proceed & Save Anyway
            </button>
          </div>
        </div>
      )}

      {/* Configuration Injection Status Alert Banner */}
      <ConfigInjectionAlert 
        info={injectionStatus && injectionStatus.agentId === agentId ? injectionStatus : null} 
        currentAgentId={agentId}
        onDismiss={onDismissInjectionStatus || (() => {})} 
        onRetry={onInjectConfig} 
      />

      {/* Verbose Log & JSON Inspector Drawer */}
      {isInspectorOpen && activeLogInspection && (
        <VerboseLogInspector 
          data={activeLogInspection} 
          onClose={() => setIsInspectorOpen(false)} 
        />
      )}

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
                  handleInterceptSave(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Save &amp; Restart Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Visual Indicator for Agent Running on Fallback Configuration */}
      {isRunningOnFallback && (
        <div 
          id="config-fallback-active-indicator-banner"
          className="p-4 sm:p-5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/20 shadow-xl shadow-amber-950/30 space-y-3 animate-fadeIn"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                    <span>Agent Operating on Fallback Configuration</span>
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ACTIVE FAILOVER MODE
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Primary provider <strong className="text-amber-300 font-mono">{config.model.provider.toUpperCase()}</strong> ({config.model.model}) is currently degraded, unauthenticated, or unreachable. Requests are actively being rerouted to fallback provider <strong className="text-emerald-300 font-mono">{(config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama').toUpperCase()}</strong> ({config.fallback?.fallbackModel || config.fallback?.model || 'Local Model'}).
                </p>

                {connectivityErrorReason && (
                  <p className="text-[11px] font-mono text-rose-300/90 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/30 max-w-2xl">
                    Primary fault: {connectivityErrorReason}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center flex-wrap">
              <button
                type="button"
                id="revalidate-primary-provider-btn"
                onClick={handleRevalidatePrimaryProvider}
                disabled={isRevalidatingPrimary}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                title="Attempt live re-validation of primary LLM provider connection"
              >
                {isRevalidatingPrimary ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-validating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Re-validate Primary Provider</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('fallback')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                Fallback Settings
              </button>
            </div>
          </div>

          {primaryRevalidationMessage && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              primaryRevalidationMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              {primaryRevalidationMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{primaryRevalidationMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Pills with Deep-Link Validation Badges */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-800/80">
        {[
          { id: 'model', label: 'Model & Reasoning', icon: Zap, sectionKey: 'model' },
          { id: 'moa', label: 'Mixture-of-Agents (MoA)', icon: Cpu, sectionKey: 'moa' },
          { id: 'channels', label: 'Communication Channels', icon: Radio, sectionKey: 'channels' },
          { id: 'system', label: 'Prompt & Persona', icon: MessageSquare, sectionKey: 'system' },
          { id: 'security', label: 'Security & Sandbox', icon: Shield, sectionKey: 'security' },
          { id: 'storage', label: 'Storage & Memory', icon: Database, sectionKey: 'storage' },
          { id: 'fallback', label: 'Fallback & Redundancy', icon: RefreshCw, sectionKey: 'fallback' },
          { id: 'raw', label: 'Raw Editor & Validator', icon: FileCode, sectionKey: 'raw' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          const sectionIssues = deepValidation.issues.filter(i => 
            tab.sectionKey === 'raw' ? true : i.path.startsWith(tab.sectionKey)
          );
          const hasErrors = sectionIssues.some(i => i.severity === 'error');
          const hasWarnings = sectionIssues.some(i => i.severity === 'warning');

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
              {sectionIssues.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  hasErrors ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {sectionIssues.length}
                </span>
              )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    Model Checkpoint (Dropdown)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBulkSelectMode(prev => !prev)}
                      title="Toggle bulk model selection mode"
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                        bulkSelectMode
                          ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                    >
                      <CheckSquare className="w-3 h-3 text-indigo-400" />
                      Bulk Select
                    </button>
                    <button
                      type="button"
                      onClick={copyModelSpecToClipboard}
                      title="Copy full model specification JSON (or bulk array) to clipboard"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      {copiedModelSpec ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-400" />}
                      {copiedModelSpec ? 'Copied Specs' : selectedModelsForBulk.length > 0 ? `Copy (${selectedModelsForBulk.length}) Specs` : 'Copy Spec'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePingEndpoint}
                      disabled={isPinging}
                      title="Ping endpoint to test latency"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Activity className={`w-3 h-3 text-emerald-400 ${isPinging ? 'animate-pulse' : ''}`} />
                      {isPinging ? 'Pinging...' : pingLatencyMs !== null ? `${pingLatencyMs}ms` : 'Ping'}
                    </button>

                    {/* Benchmark Button */}
                    <button
                      type="button"
                      onClick={handleBenchmarkProvider}
                      disabled={isBenchmarking}
                      title="Run a speed benchmark against the LLM provider base URL"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap className={`w-3 h-3 text-amber-400 ${isBenchmarking ? 'animate-spin' : ''}`} />
                      {isBenchmarking ? 'Benchmarking...' : benchmarkLatency !== null ? `${benchmarkLatency}ms` : 'Benchmark'}
                    </button>

                    <button
                      id="compare-models-btn"
                      type="button"
                      onClick={() => {
                        setComparisonMode(prev => !prev);
                        setIsCompareModalOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                        comparisonMode
                          ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-indigo-300'
                      }`}
                    >
                      <Columns className="w-3 h-3 text-indigo-400" />
                      Compare
                    </button>
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
                </div>

                {/* Filter & Search Bar Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Search Filter Input */}
                  <div className="relative sm:col-span-6">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      id="model-search-filter"
                      placeholder="Filter models by keyword..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-sans placeholder:text-slate-500"
                    />
                    {modelSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setModelSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Provider Indicator & Direct Switcher */}
                  <div className="relative sm:col-span-3">
                    <select
                      id="provider-filter-select"
                      value={config.model.provider}
                      onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                      className="w-full appearance-none pl-7 pr-7 py-1.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 text-indigo-200 text-xs focus:outline-none focus:border-indigo-500 font-sans capitalize font-medium"
                      title="Current Provider (Click to switch provider and fetch its models)"
                    >
                      <option value="ollama">Ollama / Local</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="groq">Groq</option>
                      <option value="mistral">Mistral AI</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom Endpoint</option>
                    </select>
                    <Filter className="w-3 h-3 text-indigo-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Sort by Context Toggle */}
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={() => setSortByContext(prev => !prev)}
                      className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        sortByContext
                          ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                      {sortByContext ? 'Sorted by Context ↓' : 'Sort by Context'}
                    </button>
                  </div>
                </div>

                {/* Advanced Sync & Proxy Options Row */}
                <div className="flex flex-wrap items-center gap-4 px-1 py-1 text-xs">
                  {/* Proxy Models Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={proxyModelsEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setProxyModelsEnabled(val);
                          localStorage.setItem('proxyModelsEnabled', String(val));
                        }}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${proxyModelsEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`} />
                      <div className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${proxyModelsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1">
                      Proxy Models {proxyModelsEnabled ? (
                        <span className="text-indigo-400 font-bold font-sans">(API Proxy)</span>
                      ) : (
                        <span className="text-slate-500">(Direct Browser)</span>
                      )}
                    </span>
                  </label>

                  {/* Auto-refresh Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={autoRefreshEnabled}
                        onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${autoRefreshEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`} />
                      <div className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${autoRefreshEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1">
                      Auto-refresh {autoRefreshEnabled ? (
                        <span className="text-emerald-400 font-bold font-sans flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                          On (15s)
                        </span>
                      ) : (
                        <span className="text-slate-500">(Manual)</span>
                      )}
                    </span>
                  </label>
                </div>

                {/* Live Provider Verification Badge & Filter */}
                <div className="flex items-center justify-between gap-2 px-1 py-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeLiveStatus?.isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live on {config.model.provider}: {activeLiveStatus.count} verified models installed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                        Standard catalog for {config.model.provider} (endpoint unprobed or offline)
                      </span>
                    )}
                  </div>
                  {activeLiveStatus?.isLive && (
                    <button
                      type="button"
                      onClick={() => setOnlyLiveFilter(prev => !prev)}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 ${
                        onlyLiveFilter
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Show only models currently running and available on the live provider"
                    >
                      <Check className={`w-3 h-3 ${onlyLiveFilter ? 'text-emerald-400' : 'opacity-0'}`} />
                      Only Live Models
                    </button>
                  )}
                </div>

                {/* Model Connectivity Indicator & Quick Re-validation */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">Model Connectivity:</span>
                    {isRunningOnFallback && (
                      <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold animate-pulse" title="Agent is currently operating on fallback provider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        FALLBACK ACTIVE
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {modelConnectivityStatus === 'checking' && (
                        <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Checking...
                        </span>
                      )}
                      {modelConnectivityStatus === 'available' && (
                        <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono text-[10px]" title={`Connected to ${config.model.baseUrl || config.model.provider}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Available {modelConnectivityLatency !== null ? `(${modelConnectivityLatency}ms)` : ''}
                        </span>
                      )}
                      {modelConnectivityStatus === 'unreachable' && (
                        <span 
                          className="inline-flex items-center gap-1 text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono text-[10px] cursor-help relative group"
                          title={connectivityErrorReason || `Endpoint unreachable for ${config.model.provider}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Unreachable
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-950 text-rose-200 text-[10px] font-sans rounded-lg shadow-xl border border-rose-500/30 z-50 text-center leading-relaxed">
                            {connectivityErrorReason || 'Connection timeout or network failure.'}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Quick Re-validate Button */}
                    <button
                      type="button"
                      id="quick-revalidate-primary-btn"
                      onClick={handleRevalidatePrimaryProvider}
                      disabled={isRevalidatingPrimary || modelConnectivityStatus === 'checking'}
                      title="Attempt immediate re-validation of primary LLM connection"
                      className="px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-medium transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isRevalidatingPrimary ? 'animate-spin text-amber-400' : ''}`} />
                      {isRevalidatingPrimary ? 'Validating...' : 'Re-validate Primary'}
                    </button>
                  </div>
                </div>

                {primaryRevalidationMessage && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                    primaryRevalidationMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {primaryRevalidationMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{primaryRevalidationMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrimaryRevalidationMessage(null)}
                      className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Main Searchable Dropdown */}
                <div className="relative">
                  <div
                    id="custom-searchable-dropdown-trigger"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 text-xs transition-colors pr-10 font-mono select-none"
                  >
                    <span className="truncate flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {config.model.model || 'Select Model...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-3 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isModelDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close the dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsModelDropdownOpen(false)} 
                      />
                      
                      <div className="absolute left-0 right-0 mt-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xl shadow-black/80 z-50 max-h-80 flex flex-col gap-2 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                        {/* Dropdown Local Search Bar */}
                        <div className="relative shrink-0">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type name, provider, or capability tag..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans placeholder:text-slate-500"
                          />
                          {modelSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setModelSearchQuery('')}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Items List */}
                        <div className="overflow-y-auto max-h-56 divide-y divide-slate-850/50 space-y-0.5 custom-scrollbar pr-1">
                          {filteredModelList.length === 0 ? (
                            <div className="p-3 text-center text-slate-500 text-[11px]">
                              No matching models found. Try clearing your search query.
                            </div>
                          ) : (
                            filteredModelList.map((m) => {
                              const badges = getMetadataBadges(m.value, config.model.provider, m.tag);
                              const isSelected = config.model.model === m.value;
                              return (
                                <div
                                  key={m.value}
                                  onClick={() => {
                                    onChangeConfig({
                                      ...config,
                                      model: { ...config.model, model: m.value }
                                    });
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`p-2 rounded-lg cursor-pointer flex flex-col gap-1 text-[11px] font-mono transition-colors ${
                                    isSelected 
                                      ? 'bg-indigo-600/20 text-white border border-indigo-500/30' 
                                      : 'hover:bg-slate-800/80 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold truncate">{m.label}</span>
                                    {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                                  </div>
                                  
                                  {/* Capability Tags Badges Row */}
                                  {badges.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {badges.map((badge, idx) => (
                                        <span 
                                          key={idx} 
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                                            badge.includes('Reasoning') 
                                              ? 'bg-purple-950/45 text-purple-300 border-purple-500/20'
                                              : badge.includes('Live') || badge.includes('Active')
                                              ? 'bg-emerald-950/45 text-emerald-300 border-emerald-500/20'
                                              : badge.includes('Local')
                                              ? 'bg-amber-950/45 text-amber-300 border-amber-500/20'
                                              : 'bg-slate-850 text-slate-400 border-slate-750'
                                          }`}
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <div
                            onClick={() => {
                              onChangeConfig({
                                ...config,
                                model: { ...config.model, model: 'custom' }
                              });
                              setIsModelDropdownOpen(false);
                            }}
                            className="p-2 rounded-lg cursor-pointer hover:bg-slate-800/80 text-indigo-300 text-[11px] font-semibold transition-colors mt-1 border-t border-slate-850"
                          >
                            + Enter Custom Model Name
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Benchmark Display alert */}
                {benchmarkMessage && (
                  <div className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 animate-in fade-in duration-200 ${
                    benchmarkLatency !== null && benchmarkLatency < 1200
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                  }`}>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Benchmark latency result: </span>
                      {benchmarkLatency !== null ? `${benchmarkLatency}ms. ` : ''}
                      <span className="opacity-90">{benchmarkMessage}</span>
                    </div>
                  </div>
                )}

                {/* Bulk Select Checkboxes Panel */}
                {bulkSelectMode && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-2 mt-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                        Bulk Select Models for Export ({selectedModelsForBulk.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedModelsForBulk(filteredModelList.map(m => m.value))}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedModelsForBulk([])}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredModelList.map((m) => {
                        const isChecked = selectedModelsForBulk.includes(m.value);
                        return (
                          <label
                            key={m.value}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-950/40 border-indigo-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-mono truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedModelsForBulk([...selectedModelsForBulk, m.value]);
                                  } else {
                                    setSelectedModelsForBulk(selectedModelsForBulk.filter(v => v !== m.value));
                                  }
                                }}
                                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                              />
                              <span className="truncate">{m.label}</span>
                            </div>
                            <span className="text-[10px] text-indigo-300 font-mono">
                              {getContextSizeVal(m.value, m.label).toLocaleString()} tokens
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Metadata Badges:</span>
                  {getMetadataBadges(config.model.model, config.model.provider).map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono font-medium"
                    >
                      {badge}
                    </span>
                  ))}
                  {pingLatencyMs !== null && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-medium flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      {pingLatencyMs}ms latency
                    </span>
                  )}
                </div>

                {/* Inline Comparison Mode Panel */}
                {comparisonMode && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3 animate-in fade-in duration-200 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Columns className="w-3.5 h-3.5 text-indigo-400" />
                        Inline Model Comparison Mode
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCompareModalOpen(true)}
                        className="text-[11px] text-indigo-400 hover:underline font-medium"
                      >
                        Open Full Spec Comparison Modal &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Primary Model Summary */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Primary Model</span>
                        <div className="text-xs font-mono font-bold text-slate-100 truncate">{config.model.model}</div>
                        <div className="text-[11px] text-slate-400">
                          Provider: <span className="text-slate-200 capitalize font-mono">{config.model.provider}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Temperature: <span className="text-amber-400 font-mono">{config.model.temperature ?? 0.7}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Context Window: <span className="text-indigo-300 font-mono">{(config.model.contextWindow || 65536).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Max Tokens: <span className="text-slate-300 font-mono">{config.model.maxTokens || 4096}</span>
                        </div>
                      </div>

                      {/* Secondary Model Dropdown & Summary */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Secondary Model Selection</span>
                        <div className="relative">
                          <select
                            id="secondary-model-select"
                            value={secondaryModel}
                            onChange={(e) => setSecondaryModel(e.target.value)}
                            className="w-full appearance-none px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 pr-8"
                          >
                            {currentModelList.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <div>
                            Provider: <span className="text-slate-200 capitalize font-mono">{secondaryProvider}</span>
                          </div>
                          <div>
                            Temp: <span className="text-amber-300 font-mono">{secondaryTemperature}</span>
                          </div>
                          <div className="col-span-2">
                            Context Window: <span className="text-indigo-300 font-mono">{secondaryContextWindow.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(config.model.model === 'custom' || config.model.provider === 'custom' || !currentModelList.some(m => m.value === config.model.model)) && (
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="e.g. gemma4-soul:latest or qwen2.5-coder:7b"
                      value={config.model.model === 'custom' ? '' : config.model.model}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        model: { ...config.model, model: e.target.value }
                      })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-indigo-500/50 text-slate-100 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                )}
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
                    {!([4096, 8192, 16384, 32768, 64000, 65536, 128000, 200000, 1000000, 2000000].includes(config.model.contextWindow)) && (
                      <option value={config.model.contextWindow}>
                        {config.model.contextWindow.toLocaleString()} tokens (Custom)
                      </option>
                    )}
                    <option value={4096}>4,096 tokens (Compact Edge)</option>
                    <option value={8192}>8,192 tokens (~6,000 words)</option>
                    <option value={16384}>16,384 tokens (~12,000 words)</option>
                    <option value={32768}>32,768 tokens (Edge / Raspberry Pi)</option>
                    <option value={64000}>64,000 tokens (Standard)</option>
                    <option value={65536}>65,536 tokens (Ollama / Local 64k)</option>
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

              {/* useProxy Toggle for Local LLMs / CORS & 403 Forbidden Bypass */}
              <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">Use Backend Proxy (CORS / 403 Bypass)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      config.model.useProxy !== false
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                    }`}>
                      {config.model.useProxy !== false ? 'Proxy Active' : 'Direct Browser'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                    Routes local LLM provider model listing and endpoint requests through the backend proxy server to eliminate browser CORS restrictions and 403 Forbidden errors when fetching from local/private <code className="text-indigo-300 font-mono">baseUrl</code>.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.model.useProxy !== false}
                    id="use-proxy-toggle"
                    onClick={() => {
                      const currentVal = config.model.useProxy !== false;
                      onChangeConfig({
                        ...config,
                        model: {
                          ...config.model,
                          useProxy: !currentVal
                        }
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      config.model.useProxy !== false ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                    title={config.model.useProxy !== false ? 'Disable backend proxy' : 'Enable backend proxy'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.model.useProxy !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MIXTURE-OF-AGENTS (MoA) ================= */}
        {activeSection === 'moa' && (() => {
          const isLocalAgent = (
            config.model.provider === 'ollama' ||
            config.model.provider === 'custom' ||
            Boolean(config.model.baseUrl && (
              config.model.baseUrl.includes('11434') ||
              config.model.baseUrl.includes('192.168.') ||
              config.model.baseUrl.includes('10.') ||
              config.model.baseUrl.includes('localhost') ||
              config.model.baseUrl.includes('127.0.0.1')
            )) ||
            config.model.model.includes('coder') ||
            config.model.model.includes('soul') ||
            config.model.model.includes('latest')
          );

          const fallbackAggregator = (config.model.model && config.model.model !== 'provider:')
            ? config.model.model
            : (isLocalAgent ? 'qwen2.5-coder:7b' : 'claude-3-7-sonnet');

          const currentAggregator = config.moa?.aggregatorModel || fallbackAggregator;
          const defaultLocalProposers = [fallbackAggregator, 'qwen2.5-coder:7b', 'deepseek-r1:8b'].filter((v, i, a) => a.indexOf(v) === i);
          const defaultCloudProposers = ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'];
          const effectiveProposers = (config.moa?.proposerModels && config.moa.proposerModels.length > 0)
            ? config.moa.proposerModels
            : (isLocalAgent ? defaultLocalProposers : defaultCloudProposers);

          const keyContext: KeyContext = {
            primaryProvider: config.model.provider,
            primaryApiKey: config.model.apiKey,
            fallbackProvider: config.fallback?.provider,
            fallbackApiKey: config.fallback?.apiKey,
            fallbackEnabled: config.fallback?.enabled,
            isLocalOnly: isLocalAgent || config.model.provider === 'ollama' || config.model.provider === 'local'
          };

          const aggregatorKeyStatus = getModelKeyStatus(currentAggregator, keyContext);
          const proposerKeyStatuses = effectiveProposers.map(p => getModelKeyStatus(p, keyContext));
          const missingProposers = proposerKeyStatuses.filter(s => !s.hasKey);
          const hasMissingMoAKeys = (!aggregatorKeyStatus.hasKey || missingProposers.length > 0) && (config.moa?.enabled ?? true);

          const localAggregators = [
            'gemma4-soul:latest',
            'qwen2.5-coder:7b',
            'qwen2.5-coder:14b',
            'deepseek-r1:8b',
            'llama3.3:70b',
            'mistral-nemo:12b'
          ];

          const cloudAggregators = [
            'claude-3-7-sonnet',
            'gpt-4o',
            'deepseek-r1',
            'gemini-2.5-pro'
          ];

          const displayedCloudAggregators = filterMoaOnlyAvailable
            ? cloudAggregators.filter(m => getModelKeyStatus(m, keyContext).hasKey)
            : cloudAggregators;

          const knownAggregators = [
            config.model.model,
            ...localAggregators,
            ...cloudAggregators
          ].filter(Boolean);

          const purposeMeta = PURPOSE_METADATA[selectedPurpose] || PURPOSE_METADATA['balanced'];
          
          // Optimized model names based on agent purpose (balanced, reasoning-heavy, coding-focused)
          const purposeSuggestedModelNames = suggestModelCombinations(selectedPurpose);
          const defaultConfigProposers = isLocalAgent ? defaultLocalProposers : defaultCloudProposers;

          // Merging these suggestions with the defaults already in the configuration
          const allProposerCandidates = Array.from(new Set([
            ...purposeSuggestedModelNames,
            ...defaultConfigProposers
          ]));

          const mergedProposerSuggestions = filterMoaOnlyAvailable
            ? filterModelsByKeyAvailability(allProposerCandidates, keyContext)
            : allProposerCandidates;

          const purposeSuggestedModels = getSuggestedProposersForPurpose(selectedPurpose, {
            isLocal: isLocalAgent,
            provider: config.model.provider,
            currentModel: config.model.model,
            keyContext,
            onlyConfigured: filterMoaOnlyAvailable
          });
          const purposeCombinations = suggestModelCombinationPresets(selectedPurpose, {
            isLocal: isLocalAgent,
            provider: config.model.provider,
            currentModel: config.model.model,
            keyContext,
            onlyConfigured: filterMoaOnlyAvailable
          });

          return (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    Mixture-of-Agents (MoA) Cooperative Reasoning
                    {isLocalAgent && (
                      <span className="text-[10px] text-emerald-400 font-normal px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        Local / Edge Optimized
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-model collaborative proposal and aggregation pipeline (supports both local Ollama clusters and cloud frontier LLMs).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFilterMoaOnlyAvailable(!filterMoaOnlyAvailable)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      filterMoaOnlyAvailable
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="Toggle to only show models with configured API keys or local models"
                  >
                    <Key className={`w-3.5 h-3.5 ${filterMoaOnlyAvailable ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{filterMoaOnlyAvailable ? 'Showing Ready Models Only' : 'Filter by Available Keys'}</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.moa?.enabled ?? true}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        moa: {
                          ...(config.moa || { proposerModels: effectiveProposers, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                          enabled: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* API Key Missing / Config Warning Alert */}
              {hasMissingMoAKeys && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-amber-300">
                          API Key Configuration Warning for MoA
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono">
                          Missing Provider Keys
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {!aggregatorKeyStatus.hasKey && (
                          <span className="block">
                            • Aggregator <strong className="text-amber-200 font-mono font-medium">{currentAggregator}</strong> requires an API key for <strong className="text-white">{aggregatorKeyStatus.requiredProvider}</strong> (or OpenRouter).
                          </span>
                        )}
                        {missingProposers.length > 0 && (
                          <span className="block mt-0.5">
                            • Proposer models missing keys: {missingProposers.map(k => (
                              <code key={k.model} className="mx-1 px-1.5 py-0.5 rounded bg-slate-900 border border-amber-500/20 text-amber-300 font-mono text-[10px]">
                                {k.model} ({k.requiredProvider})
                              </code>
                            ))}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Agents running with unkeyed cloud models will throw runtime errors: <code className="text-rose-300 font-mono">"No LLM provider configured for task=moa_aggregator provider=openrouter"</code>.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        const localFallback = isLocalAgent ? (config.model.model || 'qwen2.5-coder:7b') : (config.model.model || 'qwen2.5-coder:7b');
                        onChangeConfig({
                          ...config,
                          moa: {
                            ...(config.moa || { enabled: true, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                            aggregatorModel: localFallback,
                            proposerModels: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest']
                          }
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      Switch MoA to Local Ready Models (No Cloud Keys Needed)
                    </button>
                    {config.fallback?.enabled && config.fallback?.apiKey && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Fallback provider ({config.fallback.provider}) key configured
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-200">
                      Aggregator Model (Final Synthesis)
                    </label>
                    {config.model.model && currentAggregator !== config.model.model && (
                      <button
                        type="button"
                        onClick={() => onChangeConfig({
                          ...config,
                          moa: {
                            ...(config.moa || { enabled: true, proposerModels: effectiveProposers, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                            aggregatorModel: config.model.model
                          }
                        })}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                        title="Set aggregator model to match primary active model"
                      >
                        Use Active ({config.model.model})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      id="aggregator-model-select"
                      value={currentAggregator}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        moa: {
                          ...(config.moa || { enabled: true, proposerModels: effectiveProposers, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                          aggregatorModel: e.target.value
                        }
                      })}
                      className={`w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono pr-10 ${
                        !aggregatorKeyStatus.hasKey ? 'border-amber-500/50 text-amber-200' : 'border-slate-700'
                      }`}
                    >
                      {/* Active Model Option */}
                      {config.model.model && (
                        <option value={config.model.model}>
                          {config.model.model} (Active Agent Model {isLocalAgent ? '• 🟢 Local' : '• 🔑 Active'})
                        </option>
                      )}

                      {/* Local / Ollama Group */}
                      <optgroup label="🟢 Local Ollama & Edge Models (Ready / No Key Needed)">
                        {localAggregators.map(m => (
                          <option key={`local-agg-${m}`} value={m}>
                            {m} [🟢 Local Ready]
                          </option>
                        ))}
                      </optgroup>

                      {/* Cloud Providers Group */}
                      <optgroup label="☁️ Cloud Frontier Models">
                        {displayedCloudAggregators.map(m => {
                          const status = getModelKeyStatus(m, keyContext);
                          return (
                            <option key={`cloud-agg-${m}`} value={m}>
                              {m} {status.hasKey ? '[🟢 Key Ready]' : `[⚠️ Missing ${status.requiredProvider} Key]`}
                            </option>
                          );
                        })}
                      </optgroup>

                      {/* Custom Option */}
                      {!knownAggregators.includes(currentAggregator) && (
                        <option value={currentAggregator}>
                          {currentAggregator} ({aggregatorKeyStatus.hasKey ? 'Custom • Ready' : 'Custom • Key Missing'})
                        </option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {aggregatorKeyStatus.hasKey ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {aggregatorKeyStatus.message}
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {aggregatorKeyStatus.message}
                        </span>
                      )}
                    </span>
                    {isLocalAgent && (
                      <span className="text-emerald-400 text-[10px] font-mono">
                        Active: {currentAggregator}
                      </span>
                    )}
                  </div>
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
                        ...(config.moa || { enabled: true, proposerModels: effectiveProposers, aggregatorModel: fallbackAggregator, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                        rounds: parseInt(e.target.value, 10)
                      }
                    })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 Round (Fast)</span>
                    <span>2 Rounds (Balanced)</span>
                    <span>5 Rounds (Deep)</span>
                  </div>
                </div>

                {/* Proposer Models Section with Dropdowns & Provider Models */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200">
                        Proposer Models ({effectiveProposers.length} slots)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Select each proposer from suggestions tailored to your agent's purpose ({purposeMeta.label}), provider ({config.model.provider}), or catalogs.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeConfig({
                          ...config,
                          moa: {
                            ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                            proposerModels: defaultLocalProposers
                          }
                        })}
                        className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium transition-colors"
                      >
                        Set Local Stack (🟢 Ready)
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeConfig({
                          ...config,
                          moa: {
                            ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                            proposerModels: defaultCloudProposers
                          }
                        })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium transition-colors"
                      >
                        Set Cloud Stack
                      </button>
                    </div>
                  </div>

                  {/* Agent Purpose Mode & Model Combinations Helper Bar */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200">Agent Purpose:</span>
                        <span className="text-[11px] text-slate-400">
                          {selectedPurpose === getAgentDefaultPurpose(agentId) ? `(Detected for ${agentId})` : '(Custom mode)'}
                        </span>
                      </div>

                      {/* Purpose Toggle Pills: Balanced, Reasoning-Heavy, Coding-Focused */}
                      <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                        {(['balanced', 'reasoning-heavy', 'coding-focused'] as AgentPurpose[]).map((p) => {
                          const meta = PURPOSE_METADATA[p];
                          const isActive = selectedPurpose === p;
                          const Icon = p === 'coding-focused' ? Code2 : p === 'reasoning-heavy' ? Brain : Zap;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setSelectedPurpose(p)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                isActive
                                  ? meta.activeColor
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{meta.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {purposeMeta.description}
                    </p>

                    {/* Proposer Models Dropdown Menu (Merging purpose suggestions with defaults in configuration) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-300 shrink-0 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Proposer Models Suggestions:</span>
                      </div>
                      
                      <div className="relative flex-1">
                        <select
                          id="proposer-models-merged-dropdown"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            if (val === '__APPLY_ALL_MERGED__') {
                              onChangeConfig({
                                ...config,
                                moa: {
                                  ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: purposeMeta.recommendedRounds, temperatureSpread: purposeMeta.temperatureSpread, consensusThreshold: purposeMeta.consensusThreshold }),
                                  proposerModels: mergedProposerSuggestions.slice(0, 3)
                                }
                              });
                              return;
                            }
                            if (!effectiveProposers.includes(val)) {
                              onChangeConfig({
                                ...config,
                                moa: {
                                  ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                  proposerModels: [...effectiveProposers, val]
                                }
                              });
                            }
                          }}
                          className="w-full appearance-none px-3 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8 transition-colors cursor-pointer"
                        >
                          <option value="">🎯 Add / Select Proposer (Merged {purposeMeta.shortLabel} + Config Defaults)...</option>
                          <option value="__APPLY_ALL_MERGED__">
                            ⚡ Apply Top Merged Stack ({mergedProposerSuggestions.slice(0, 3).join(', ')})
                          </option>
                          <optgroup label={`⭐ Suggested for "${purposeMeta.label}" Purpose`}>
                            {purposeSuggestedModelNames.map((name) => {
                              const status = getModelKeyStatus(name, keyContext);
                              if (filterMoaOnlyAvailable && !status.hasKey) return null;
                              return (
                                <option key={`purpose-name-${name}`} value={name}>
                                  + {name} ({status.hasKey ? '🟢 Ready' : `⚠️ Missing ${status.requiredProvider} Key`})
                                </option>
                              );
                            })}
                          </optgroup>
                          <optgroup label="⚙️ Defaults in Current Configuration">
                            {defaultConfigProposers.map((name) => {
                              const status = getModelKeyStatus(name, keyContext);
                              if (filterMoaOnlyAvailable && !status.hasKey) return null;
                              return (
                                <option key={`default-cfg-name-${name}`} value={name}>
                                  + {name} ({status.hasKey ? '🟢 Ready' : `⚠️ Missing ${status.requiredProvider} Key`})
                                </option>
                              );
                            })}
                          </optgroup>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const topMerged = mergedProposerSuggestions.slice(0, 3);
                          if (topMerged.length > 0) {
                            onChangeConfig({
                              ...config,
                              moa: {
                                ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: purposeMeta.recommendedRounds, temperatureSpread: purposeMeta.temperatureSpread, consensusThreshold: purposeMeta.consensusThreshold }),
                                proposerModels: topMerged
                              }
                            });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
                        title={`Apply top merged models (suggestions for ${purposeMeta.label} + configuration defaults)`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                        <span>Apply Top 3 Merged</span>
                      </button>
                    </div>

                    {/* Suggested Preset Combinations Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-300 shrink-0 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preset Stacks:</span>
                      </div>
                      
                      <div className="relative flex-1">
                        <select
                          id="proposer-purpose-combination-select"
                          value=""
                          onChange={(e) => {
                            const combo = purposeCombinations.find(c => c.id === e.target.value);
                            if (combo) {
                              onChangeConfig({
                                ...config,
                                moa: {
                                  ...(config.moa || { temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                  enabled: true,
                                  proposerModels: combo.proposers,
                                  aggregatorModel: combo.aggregator,
                                  rounds: combo.rounds
                                }
                              });
                              setAppliedMoaPreset(combo.id);
                              setTimeout(() => setAppliedMoaPreset(null), 3000);
                            }
                          }}
                          className="w-full appearance-none px-3 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8 transition-colors cursor-pointer"
                        >
                          <option value="">✨ Apply Preset Ensemble for {purposeMeta.label}...</option>
                          {purposeCombinations.map((combo) => (
                            <option key={combo.id} value={combo.id}>
                              {combo.isAvailable ? '🟢 [Ready]' : `⚠️ [Requires ${combo.missingKeys?.join('/')} Key]`} {combo.name} — [{combo.proposers.join(' + ')}] ➔ {combo.aggregator}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Individual Proposer Slots with Dropdown Menus */}
                  <div className="space-y-2.5">
                    {effectiveProposers.map((proposer, idx) => {
                      const roleHint = idx === 0 
                        ? 'Primary Draft' 
                        : idx === 1 
                        ? 'Logic & Chain-of-Thought' 
                        : idx === 2 
                        ? 'Consensus & Divergence' 
                        : `Auxiliary Slot ${idx + 1}`;

                      const isFromProvider = currentModelList.some(m => m.value === proposer);
                      const status = getModelKeyStatus(proposer, keyContext);

                      return (
                        <div 
                          key={idx}
                          className={`flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                            !status.hasKey
                              ? 'bg-amber-950/20 border-amber-500/40'
                              : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between sm:w-44 shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-slate-200">Proposer {idx + 1}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{roleHint}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {status.hasKey ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono">
                                  {status.isLocal ? 'Local' : 'Key Ready'}
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300 font-mono">
                                  Missing Key
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="relative flex-1">
                            <select
                              value={proposer}
                              onChange={(e) => {
                                const next = [...effectiveProposers];
                                next[idx] = e.target.value;
                                onChangeConfig({
                                  ...config,
                                  moa: {
                                    ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                    proposerModels: next
                                  }
                                });
                              }}
                              className={`w-full appearance-none px-3 py-2 rounded-lg bg-slate-900 border text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 pr-9 ${
                                !status.hasKey ? 'border-amber-500/40 text-amber-200' : 'border-slate-700'
                              }`}
                            >
                              {/* Custom / Configured option if not present in standard lists */}
                              {!knownAggregators.includes(proposer) && !currentModelList.some(m => m.value === proposer) && (
                                <option value={proposer}>{proposer} ({status.hasKey ? 'Current • Ready' : 'Current • Key Missing'})</option>
                              )}

                              {/* ⭐ Purpose-Based Suggested Models Merged with Config Defaults */}
                              <optgroup label={`⭐ Suggested (${purposeMeta.shortLabel}) & Config Defaults`}>
                                {mergedProposerSuggestions.map((mName) => {
                                  const mStatus = getModelKeyStatus(mName, keyContext);
                                  const isSugg = purposeSuggestedModelNames.includes(mName);
                                  const isDef = defaultConfigProposers.includes(mName);
                                  const tag = isSugg && isDef
                                    ? `${purposeMeta.shortLabel} + Config Default`
                                    : isSugg
                                    ? `Suggested for ${purposeMeta.shortLabel}`
                                    : 'Config Default';
                                  return (
                                    <option key={`merged-slot-${idx}-${mName}`} value={mName}>
                                      {mName} — [{tag}] {mStatus.hasKey ? '🟢' : '⚠️'}
                                    </option>
                                  );
                                })}
                              </optgroup>

                              {/* Purpose Role Suggestions */}
                              <optgroup label={`Role Recommendations for "${purposeMeta.label}"`}>
                                {purposeSuggestedModels.map((m) => {
                                  const mStatus = getModelKeyStatus(m.value, keyContext);
                                  return (
                                    <option key={`purpose-sugg-${idx}-${m.value}`} value={m.value}>
                                      {m.label} ({m.value}) — {m.role} {mStatus.hasKey ? '🟢' : '⚠️'}
                                    </option>
                                  );
                                })}
                              </optgroup>

                              {/* Models from Default/Active Provider */}
                              <optgroup label={`Default Provider (${config.model.provider}) Models`}>
                                {currentModelList.map((m) => {
                                  const mStatus = getModelKeyStatus(m.value, keyContext);
                                  if (filterMoaOnlyAvailable && !mStatus.hasKey) return null;
                                  return (
                                    <option key={`prov-${idx}-${m.value}`} value={m.value}>
                                      {m.label || m.value} {m.tag ? `• ${m.tag}` : ''} {mStatus.hasKey ? '🟢' : '⚠️'}
                                    </option>
                                  );
                                })}
                              </optgroup>

                              {/* Local Ollama & Edge Models */}
                              <optgroup label="🟢 Local Ollama & Edge Models">
                                <option value="gemma4-soul:latest">gemma4-soul:latest (Local Gemma) 🟢</option>
                                <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Edge Coder 7B) 🟢</option>
                                <option value="qwen2.5-coder:14b">qwen2.5-coder:14b (Local Coder 14B) 🟢</option>
                                <option value="deepseek-r1:8b">deepseek-r1:8b (Local Reasoning 8B) 🟢</option>
                                <option value="llama3.3:70b">llama3.3:70b (Local Llama 70B) 🟢</option>
                                <option value="mistral-nemo:12b">mistral-nemo:12b (Local Mistral 12B) 🟢</option>
                                <option value="phi-4:14b">phi-4:14b (Local Phi-4 14B) 🟢</option>
                              </optgroup>

                              {/* Cloud Frontier Models */}
                              <optgroup label="☁️ Cloud Frontier Models">
                                {displayedCloudAggregators.map(m => {
                                  const mStatus = getModelKeyStatus(m, keyContext);
                                  return (
                                    <option key={`cloud-prop-${idx}-${m}`} value={m}>
                                      {m} {mStatus.hasKey ? '[🟢 Key Ready]' : `[⚠️ Missing ${mStatus.requiredProvider} Key]`}
                                    </option>
                                  );
                                })}
                                {!filterMoaOnlyAvailable && (
                                  <>
                                    <option value="o3-mini">o3-mini (OpenAI) {getModelKeyStatus('o3-mini', keyContext).hasKey ? '🟢' : '⚠️'}</option>
                                    <option value="deepseek-chat">DeepSeek-V3 (DeepSeek Chat) {getModelKeyStatus('deepseek-chat', keyContext).hasKey ? '🟢' : '⚠️'}</option>
                                  </>
                                )}
                              </optgroup>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>

                          {effectiveProposers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = effectiveProposers.filter((_, i) => i !== idx);
                                onChangeConfig({
                                  ...config,
                                  moa: {
                                    ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                    proposerModels: next
                                  }
                                });
                              }}
                              className="self-end sm:self-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              title={`Remove Proposer ${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Bar: Add Proposer & Quick Add from Provider */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const modelToAdd = currentModelList[0]?.value || (isLocalAgent ? 'deepseek-r1:8b' : 'gpt-4o');
                          onChangeConfig({
                            ...config,
                            moa: {
                              ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                              proposerModels: [...effectiveProposers, modelToAdd]
                            }
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Proposer Slot
                      </button>

                      {/* Dropdown to add a model directly from default provider */}
                      <div className="relative inline-block">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const chosen = e.target.value;
                              onChangeConfig({
                                ...config,
                                moa: {
                                  ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                  proposerModels: [...effectiveProposers, chosen]
                                }
                              });
                              e.target.value = "";
                            }
                          }}
                          className="appearance-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-medium pr-7 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                        >
                          <option value="" disabled>+ Quick Add from {config.model.provider}...</option>
                          {currentModelList.map((m) => {
                            const mStatus = getModelKeyStatus(m.value, keyContext);
                            if (filterMoaOnlyAvailable && !mStatus.hasKey) return null;
                            return (
                              <option key={`quickadd-${m.value}`} value={m.value}>
                                {m.label || m.value} {m.tag ? `[${m.tag}]` : ''} {mStatus.hasKey ? '🟢' : '⚠️'}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>

                      {/* Dropdown to add a model directly from purpose recommendations */}
                      <div className="relative inline-block">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const chosen = e.target.value;
                              onChangeConfig({
                                ...config,
                                moa: {
                                  ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                  proposerModels: [...effectiveProposers, chosen]
                                }
                              });
                              e.target.value = "";
                            }
                          }}
                          className="appearance-none px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-medium pr-7 focus:outline-none focus:border-indigo-400 cursor-pointer transition-colors"
                        >
                          <option value="" disabled>+ Quick Add for {purposeMeta.shortLabel}...</option>
                          {purposeSuggestedModels.map((m) => (
                            <option key={`quickadd-purpose-${m.value}`} value={m.value}>
                              {m.label} ({m.role}) {m.hasKey ? '🟢' : '⚠️'}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-indigo-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRawMoaInput(!showRawMoaInput)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition-colors"
                      >
                        {showRawMoaInput ? 'Hide CSV' : 'Edit CSV String'}
                      </button>
                    </div>
                  </div>

                  {/* Synchronized Comma-Separated Input */}
                  {showRawMoaInput && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Direct Comma-Separated Proposer Specification (Bidirectionally synced):</span>
                        <span className="font-mono text-indigo-400">{effectiveProposers.length} models active</span>
                      </div>
                      <input
                        type="text"
                        value={effectiveProposers.join(', ')}
                        onChange={(e) => onChangeConfig({
                          ...config,
                          moa: {
                            ...(config.moa || { enabled: true, aggregatorModel: fallbackAggregator, rounds: 2, temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                            proposerModels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          }
                        })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. qwen2.5-coder:7b, deepseek-r1:8b, gemma4-soul:latest"
                      />
                    </div>
                  )}

                  {/* Recommendations of which models go together well */}
                  <div className="border-t border-slate-800 pt-5 mt-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Synergy Recommendations (Which models go together well?)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          MoA achieves peak accuracy when combining diverse training paradigms (code syntax + step-by-step reasoning + synthesis) rather than identical architectures.
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono self-start sm:self-center">
                        5 Curated Stacks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                      {MOA_SYNERGY_RECOMMENDATIONS.map((rec) => {
                        const recKeyStatuses = [rec.aggregator, ...rec.proposers].map(m => getModelKeyStatus(m, keyContext));
                        const recMissing = recKeyStatuses.filter(s => !s.hasKey);
                        const isRecReady = recMissing.length === 0;

                        if (filterMoaOnlyAvailable && !isRecReady) return null;

                        const isCurrentActive = 
                          currentAggregator === rec.aggregator &&
                          rec.proposers.length === effectiveProposers.length &&
                          rec.proposers.every((p, i) => p === effectiveProposers[i]);

                        const isJustApplied = appliedMoaPreset === rec.id;

                        return (
                          <div
                            key={rec.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              isCurrentActive
                                ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm shadow-indigo-950/50'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-100">{rec.title}</span>
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${rec.badgeColor}`}>
                                    {rec.category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isRecReady ? (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                                      Ready 🟢
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
                                      Requires Key ⚠️
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {rec.rounds} {rec.rounds === 1 ? 'round' : 'rounds'}
                                  </span>
                                </div>
                              </div>

                              {/* Model flow visualization */}
                              <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-slate-400 text-[10px] font-mono shrink-0">Proposers:</span>
                                  {rec.proposers.map((p) => {
                                    const pStat = getModelKeyStatus(p, keyContext);
                                    return (
                                      <span key={p} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px] flex items-center gap-1">
                                        {p} {pStat.hasKey ? <span className="text-[9px] text-emerald-400">🟢</span> : <span className="text-[9px] text-amber-400">⚠️</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                                  <span className="text-slate-400 text-[10px] font-mono shrink-0">Aggregator:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-mono text-[10px] font-medium flex items-center gap-1">
                                    {rec.aggregator} {aggregatorKeyStatus.hasKey ? <span className="text-[9px] text-emerald-400">🟢</span> : <span className="text-[9px] text-amber-400">⚠️</span>}
                                  </span>
                                </div>
                              </div>

                              {/* Why this synergy works explanation */}
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                <strong className="text-slate-200">Why it works: </strong>
                                {rec.synergyReason}
                              </p>
                            </div>

                            <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-400/80 shrink-0" />
                                <span className="line-clamp-1">{rec.description}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onChangeConfig({
                                    ...config,
                                    moa: {
                                      ...(config.moa || { temperatureSpread: 0.3, consensusThreshold: 0.85 }),
                                      enabled: true,
                                      proposerModels: rec.proposers,
                                      aggregatorModel: rec.aggregator,
                                      rounds: rec.rounds
                                    }
                                  });
                                  setAppliedMoaPreset(rec.id);
                                  setTimeout(() => setAppliedMoaPreset(null), 3000);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${
                                  isCurrentActive || isJustApplied
                                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {isCurrentActive || isJustApplied ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Active Stack
                                  </>
                                ) : (
                                  <>
                                    <Layers className="w-3 h-3" />
                                    Apply Stack
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Per-Model Provider Alias & Endpoint Mapping Matrix */}
                <AgentFallbackSettings 
                  config={config} 
                  onChangeConfig={onChangeConfig} 
                  agentId={agentId} 
                />
              </div>
            </div>
          );
        })()}

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
                  value={(config.security.allowedDirectories || []).join(', ')}
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

        {/* ================= FALLBACK & REDUNDANCY ================= */}
        {activeSection === 'fallback' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Fallback Routing &amp; Redundancy</span>
                  {fallbackValidation.isValid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Schema Validated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Schema Issues ({fallbackValidation.errors.length})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure high availability by automatically routing requests to a secondary agent or fallback LLM provider if the primary fails or exceeds latency thresholds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {config.fallback?.enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Failover Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    Failover Standby
                  </span>
                )}
              </div>
            </div>

            {/* Validation alert banner if errors exist */}
            {!fallbackValidation.isValid && config.fallback?.enabled && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-white">Failback Configuration Schema Discrepancy</div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 text-[11px]">
                    {fallbackValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Fallback Execution Status Card & Primary Re-validation Action */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isRunningOnFallback
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : config.fallback?.enabled
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2 rounded-lg border shrink-0 ${
                  isRunningOnFallback
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                    : config.fallback?.enabled
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      {isRunningOnFallback
                        ? 'Fallback Active: Agent Running on Secondary Provider'
                        : config.fallback?.enabled
                          ? 'Fallback Armed: Monitoring Primary Provider Health'
                          : 'Fallback Inactive: Direct Routing Only'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isRunningOnFallback
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : config.fallback?.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isRunningOnFallback ? 'FAILOVER ACTIVE' : config.fallback?.enabled ? 'STANDBY ARMED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Primary: <span className="font-mono text-indigo-300">{config.model.provider}</span> ({modelConnectivityStatus === 'available' ? 'Available' : modelConnectivityStatus === 'checking' ? 'Checking...' : 'Unreachable'}) ➔ Fallback: <span className="font-mono text-emerald-300">{config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  id="revalidate-primary-fallback-tab-btn"
                  onClick={handleRevalidatePrimaryProvider}
                  disabled={isRevalidatingPrimary}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Attempt immediate re-validation of primary LLM provider connection"
                >
                  <RefreshCw className={`w-3 h-3 ${isRevalidatingPrimary ? 'animate-spin text-amber-400' : ''}`} />
                  {isRevalidatingPrimary ? 'Re-validating...' : 'Re-validate Primary'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fallback Toggle */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Failover Routing</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="fallback-enabled-toggle"
                      type="checkbox"
                      checked={config.fallback?.enabled || false}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        fallback: { ...(config.fallback || { strategy: 'on_offline' }), enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">Failover Strategy</label>
                  <select
                    id="fallback-strategy-select"
                    value={config.fallback?.strategy || 'on_offline'}
                    onChange={(e) => onChangeConfig({
                      ...config,
                      fallback: { ...(config.fallback || { enabled: false }), strategy: e.target.value as any }
                    })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="on_offline">Route if Primary Offline (Heartbeat failure)</option>
                    <option value="on_error">Route if Primary Errors (5xx status code)</option>
                    <option value="on_latency">Route if Primary Slow (Latency threshold)</option>
                  </select>
                </div>

                {config.fallback?.strategy === 'on_latency' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[11px] font-medium text-slate-300">Latency Threshold ({config.fallback?.latencyThresholdMs || 500}ms)</label>
                    <input
                      id="fallback-latency-range"
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={config.fallback?.latencyThresholdMs || 500}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        fallback: { ...(config.fallback || { enabled: false, strategy: 'on_latency' }), latencyThresholdMs: parseInt(e.target.value) }
                      })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Target Agent Selection */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Secondary Fallback Target</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">Select Backup Agent</label>
                  <div className="relative">
                    <select
                      id="fallback-target-select"
                      value={config.fallback?.targetAgentId || ''}
                      onChange={(e) => onChangeConfig({
                        ...config,
                        fallback: { ...(config.fallback || { enabled: false, strategy: 'on_offline' }), targetAgentId: e.target.value as any }
                      })}
                      className="w-full appearance-none px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 pr-10"
                    >
                      <option value="" disabled>Choose an agent...</option>
                      <option value="hermes-agent" disabled={agentId === 'hermes-agent'}>Hermes Agent (Python Powerhouse)</option>
                      <option value="zeroclaw" disabled={agentId === 'zeroclaw'}>ZeroClaw (Minimalist Rust)</option>
                      <option value="openclaw" disabled={agentId === 'openclaw'}>OpenClaw (Gateway Hub)</option>
                      <option value="picoclaw" disabled={agentId === 'picoclaw'}>PicoClaw (Edge Go)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700/50">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-emerald-400 font-bold">Pro-tip:</span> Use <span className="text-indigo-400">ZeroClaw</span> or <span className="text-indigo-400">PicoClaw</span> as fallbacks for high-availability edge routing due to their near-instant boot times and low overhead.
                  </p>
                </div>
              </div>
            </div>

            {/* Failback Provider & Fallback Model Configuration with Status Badges */}
            {(() => {
              const fallbackProv = config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama';
              const fallbackModelList = fallbackFetchedModelsMap[fallbackProv as string] || DEFAULT_PROVIDER_MODELS[fallbackProv as string] || MODEL_OPTIONS[fallbackProv as string] || [];
              const isLocalOrCustom = fallbackProv === 'ollama' || fallbackProv === 'custom';
              const fallbackLiveInfo = fallbackProviderLiveStatus[fallbackProv as string];

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Failback Provider Field */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          Failback Provider
                        </label>
                        {/* Status Badge */}
                        {fallbackValidation.providerSupported ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Supported Provider
                          </span>
                        ) : !fallbackValidation.providerPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Provider Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Unsupported Provider
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Select the underlying LLM provider executed when primary inference fails or switches to edge mode.
                      </p>

                      <select
                        id="fallback-provider-select"
                        value={config.fallback?.fallbackProvider || config.fallback?.provider || 'ollama'}
                        onChange={(e) => {
                          const newProvider = e.target.value;
                          const currentFallbackModel = config.fallback?.fallbackModel || config.fallback?.model || (MODEL_OPTIONS[newProvider] || DEFAULT_PROVIDER_MODELS[newProvider] || [])[0]?.value || 'custom-model';
                          onChangeConfig({
                            ...config,
                            fallback: {
                              ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                              fallbackProvider: newProvider,
                              provider: newProvider,
                              fallbackModel: currentFallbackModel,
                              model: currentFallbackModel
                            }
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                      >
                        {VALID_PROVIDERS.map((p) => (
                          <option key={p} value={p}>
                            {p.toUpperCase()} {p === 'ollama' ? '(Local / Edge)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fallback Model Field */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Fallback Model
                        </label>
                        {/* Status Badge */}
                        {fallbackValidation.modelValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Schema Valid
                          </span>
                        ) : !fallbackValidation.modelPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Model Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Invalid Model
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Type any custom model name freely or search/select from provider catalogs and quick suggestions.
                      </p>

                      {/* Searchable Combobox & Free-Text Input */}
                      <div className="relative">
                        <div className="relative flex items-center">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                          <input
                            id="fallback-model-search-input"
                            type="text"
                            placeholder="Type model name (e.g. gemma2:27b, llama3, custom...)"
                            value={config.fallback?.fallbackModel || config.fallback?.model || ''}
                            onFocus={() => setIsFallbackModelDropdownOpen(true)}
                            onChange={(e) => {
                              const val = e.target.value;
                              onChangeConfig({
                                ...config,
                                fallback: {
                                  ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                                  fallbackModel: val,
                                  model: val
                                }
                              });
                              setFallbackModelSearchQuery(val);
                              setIsFallbackModelDropdownOpen(true);
                            }}
                            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setIsFallbackModelDropdownOpen(!isFallbackModelDropdownOpen)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isFallbackModelDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Dropdown suggestions list */}
                        {isFallbackModelDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsFallbackModelDropdownOpen(false)} 
                            />
                            <div className="absolute left-0 right-0 mt-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xl shadow-black/80 z-50 max-h-60 flex flex-col gap-1 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                                <span>Available & Matching Models</span>
                                <span className="text-indigo-400 font-mono">{fallbackModelList.length} catalogued</span>
                              </div>
                              <div className="overflow-y-auto max-h-44 divide-y divide-slate-850/50 space-y-0.5 custom-scrollbar pr-1">
                                {fallbackModelList
                                  .filter(m => {
                                    if (!fallbackModelSearchQuery) return true;
                                    const q = fallbackModelSearchQuery.toLowerCase();
                                    return m.value.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || (m.tag && m.tag.toLowerCase().includes(q));
                                  })
                                  .map((m) => {
                                    const isSelected = (config.fallback?.fallbackModel || config.fallback?.model) === m.value;
                                    return (
                                      <div
                                        key={m.value}
                                        onClick={() => {
                                          onChangeConfig({
                                            ...config,
                                            fallback: {
                                              ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                                              fallbackModel: m.value,
                                              model: m.value
                                            }
                                          });
                                          setFallbackModelSearchQuery('');
                                          setIsFallbackModelDropdownOpen(false);
                                        }}
                                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-[11px] font-mono transition-colors ${
                                          isSelected 
                                            ? 'bg-indigo-600/20 text-white border border-indigo-500/30' 
                                            : 'hover:bg-slate-800/80 text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <span className="font-semibold truncate">{m.label}</span>
                                          {m.tag && <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 border border-slate-700">{m.tag}</span>}
                                        </div>
                                        {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Quick Model Suggestions */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['llama3.2:3b', 'hermes-3-llama-3.1-8b', 'mistral-7b-instruct', 'deepseek-chat', 'gpt-4o-mini', 'picolm-1.1b', 'gemma2:27b', 'qwen2.5-coder:7b'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              onChangeConfig({
                                ...config,
                                fallback: {
                                  ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                                  fallbackModel: m,
                                  model: m
                                }
                              });
                              setFallbackModelSearchQuery('');
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                          >
                            +{m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fallback Connection & Credentials Settings Panel */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        <h4 className="text-xs font-semibold text-white">
                          Fallback Connection Settings ({fallbackProv.toUpperCase()})
                        </h4>
                        {fallbackLiveInfo && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            fallbackLiveInfo.isLive 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {fallbackLiveInfo.isLive ? `Live (${fallbackLiveInfo.count} models)` : 'Cached / Static'}
                          </span>
                        )}
                        {/* Visual indicator for Connection/Authentication Status */}
                        <FailoverStatusBadge status={fallbackConnectionStatus.status} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Test Connection Button */}
                        <button
                          type="button"
                          onClick={handleTestFallbackConnection}
                          disabled={isTestingFallbackConnection}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                          title="Verify API Key and endpoint health before saving"
                        >
                          {isTestingFallbackConnection ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Test Connection
                            </>
                          )}
                        </button>

                        {/* Fetch Fallback Models Button */}
                        <button
                          type="button"
                          onClick={handleFetchFallbackModels}
                          disabled={isFetchingFallbackModels}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isFetchingFallbackModels ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              Fetch Fallback Models
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fallback API Key */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
                          <span>Fallback API Key</span>
                          <span className="text-[10px] text-slate-400 font-normal">Stored securely in container</span>
                        </label>
                        <div className="relative">
                          <input
                            id="fallback-api-key-input"
                            type={showFallbackApiKey ? "text" : "password"}
                            placeholder="sk-..."
                            value={config.fallback?.apiKey || ''}
                            onChange={(e) => onChangeConfig({
                              ...config,
                              fallback: {
                                ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                                apiKey: e.target.value
                              }
                            })}
                            className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFallbackApiKey(prev => !prev)}
                            className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                            title={showFallbackApiKey ? "Hide API Key" : "Show API Key"}
                          >
                            {showFallbackApiKey ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Custom Base URL */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-200">
                          Fallback Custom Base URL (Optional)
                        </label>
                        <input
                          id="fallback-base-url-input"
                          type="text"
                          placeholder="e.g. http://localhost:11434"
                          value={config.fallback?.baseUrl || ''}
                          onChange={(e) => onChangeConfig({
                            ...config,
                            fallback: {
                              ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                              baseUrl: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Backend Proxy Option for Fallback */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">Use Backend Proxy (CORS Bypass)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                            config.fallback?.useProxy !== false
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                          }`}>
                            {config.fallback?.useProxy !== false ? 'Proxy Active' : 'Direct Browser'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Route fallback model requests through the backend proxy server to prevent CORS issues.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => onChangeConfig({
                            ...config,
                            fallback: {
                              ...(config.fallback || { enabled: false, strategy: 'on_offline' }),
                              useProxy: config.fallback?.useProxy === false
                            }
                          })}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            config.fallback?.useProxy !== false ? 'bg-indigo-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              config.fallback?.useProxy !== false ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {fallbackConnectionStatus.status === 'failed' && fallbackConnectionStatus.message && (
                      <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">Connection Verification Failed</p>
                          <p className="text-[11px] text-rose-300/80 leading-relaxed font-mono">
                            {fallbackConnectionStatus.message}
                          </p>
                        </div>
                      </div>
                    )}

                    {fallbackConnectionStatus.status === 'connected' && fallbackConnectionStatus.message && (
                      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">Connection Successfully Verified</p>
                          <p className="text-[11px] text-emerald-300/80 leading-relaxed font-sans">
                            {fallbackConnectionStatus.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* MOA Model Provider Mapping & Fallback Matrix */}
            <AgentFallbackSettings 
              config={config} 
              onChangeConfig={onChangeConfig} 
              agentId={agentId} 
            />

            {/* Redundancy Visualizer Mock */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/50 space-y-4">
               <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Redundancy Logic Verification
               </h4>
               
               <div className="flex items-center justify-center py-6">
                 <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${config.fallback?.enabled ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900'}`}>
                         <Bot className="w-6 h-6 text-indigo-400" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{agentId}</span>
                      <span className="text-[9px] text-emerald-500 font-mono">PRIMARY</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-0.5 w-16 ${config.fallback?.enabled ? 'bg-gradient-to-r from-indigo-500 to-emerald-500' : 'bg-slate-800'}`} />
                      <span className="text-[9px] font-mono text-slate-500">{config.fallback?.enabled ? config.fallback.strategy : 'OFF'}</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${config.fallback?.enabled && config.fallback?.targetAgentId ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'}`}>
                         {config.fallback?.targetAgentId ? <Bot className="w-6 h-6 text-emerald-400" /> : <ShieldAlert className="w-6 h-6 text-slate-700" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{config.fallback?.targetAgentId || 'NONE'}</span>
                      <span className="text-[9px] text-indigo-400 font-mono">BACKUP</span>
                    </div>
                 </div>
               </div>
               
               <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                 <p className="text-[11px] text-slate-500 text-center">
                   Routing flow: Traffic hits <span className="text-indigo-400 font-bold">{agentId}</span> first. If <span className="text-slate-300 italic">{config.fallback?.strategy?.replace('_', ' ') || 'failure'}</span> occurs, traffic is instantly diverted to <span className="text-emerald-400 font-bold">{config.fallback?.targetAgentId || 'configured backup'}</span>.
                 </p>
               </div>
            </div>
          </div>
        )}

        {/* ================= RAW JSON / YAML / TOML SCHEMA & NATIVE FILE ================= */}
        {activeSection === 'raw' && (
          <div className="space-y-5">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    {rawMode === 'native' ? `Native Config File: ${nativeConfigInfo?.fileName || 'config'}` : 'JSON Configuration Schema'}
                  </h3>
                  {deepValidation.syncStatus === 'in_sync' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Schema &amp; Syntax In Sync
                    </span>
                  )}
                  {deepValidation.syncStatus === 'syntax_invalid' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" />
                      Syntax Errors Detected
                    </span>
                  )}
                  {deepValidation.syncStatus === 'mismatched' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Schema Discrepancies
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {rawMode === 'native' 
                    ? `Mounted file: data/clawdock/${nativeConfigInfo?.fileName} (${nativeConfigInfo?.format?.toUpperCase() || 'YAML'})`
                    : 'Structured JSON schema representation synchronized with multi-agent runtime.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setRawMode('native')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      rawMode === 'native'
                        ? 'bg-indigo-600 text-white font-medium shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {nativeConfigInfo?.fileName || 'Native File'}
                  </button>
                  <button
                    onClick={() => setRawMode('schema')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      rawMode === 'schema'
                        ? 'bg-indigo-600 text-white font-medium shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    JSON Schema
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Diagnostic Code Editor Component */}
            <InlineDiagnosticsEditor
              content={rawText}
              onChangeContent={(text) => {
                setRawText(text);
                if (rawMode === 'schema') {
                  try {
                    const parsed = JSON.parse(text);
                    onChangeConfig(parsed);
                    setRawError(null);
                  } catch (err: any) {
                    setRawError(err.message);
                  }
                } else {
                  setNativeConfigInfo(prev => ({ ...prev, content: text }));
                }
              }}
              format={(nativeConfigInfo?.format || 'yaml') as 'yaml' | 'toml' | 'json'}
              rawMode={rawMode}
              fileName={nativeConfigInfo?.fileName || (rawMode === 'native' ? 'config.yaml' : 'config.json')}
              issues={deepValidation.issues}
              lineIssuesMap={deepValidation.lineIssuesMap}
              schemaConfig={config}
              syntaxDetail={deepValidation.syntaxDetail}
              onApplyFix={handleApplySingleFix}
              onAutoFixSyntax={handleAutoFixSyntax}
              onSyncNativeToSchema={handleSyncNativeToSchema}
              rawError={rawError}
            />
          </div>
        )}
      </div>

      {/* Model Specification Comparison Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Columns className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Model Specification Comparison</h3>
                  <p className="text-xs text-slate-400">Side-by-side benchmark &amp; architecture comparison for active vs secondary model</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Model Selectors Header */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">Primary Model (Selected)</span>
                  <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    {config.model.model || 'gemma4-soul:latest'}
                  </div>
                  <div className="text-xs text-slate-400 font-sans">
                    Provider: <span className="text-slate-200 capitalize font-mono">{config.model.provider}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Secondary Comparison Model</span>
                  <select
                    value={secondaryModel}
                    onChange={(e) => setSecondaryModel(e.target.value)}
                    className="w-full appearance-none px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  >
                    {currentModelList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comparison Matrix Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800">
                      <th className="p-3 w-1/3">Specification / Feature</th>
                      <th className="p-3 w-1/3 text-indigo-300 bg-indigo-950/20 border-r border-slate-800/80">
                        Primary: {config.model.model}
                      </th>
                      <th className="p-3 w-1/3 text-slate-300">
                        Secondary: {secondaryModel}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="p-3 font-medium text-slate-400">LLM Provider / Engine</td>
                      <td className="p-3 font-mono text-emerald-400 bg-indigo-950/10 border-r border-slate-800/80 capitalize">{config.model.provider}</td>
                      <td className="p-3 font-mono text-slate-200 capitalize">{secondaryModel.includes('claude') ? 'Anthropic' : secondaryModel.includes('gpt') ? 'OpenAI' : secondaryModel.includes('deepseek') ? 'DeepSeek' : 'Ollama / Local'}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Temperature</td>
                      <td className="p-3 font-mono text-amber-400 bg-indigo-950/10 border-r border-slate-800/80">{config.model.temperature ?? 0.7}</td>
                      <td className="p-3 font-mono text-amber-300">{secondaryTemperature}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Context Window</td>
                      <td className="p-3 font-mono bg-indigo-950/10 border-r border-slate-800/80">{(config.model.contextWindow || 65536).toLocaleString()} tokens</td>
                      <td className="p-3 font-mono">{secondaryModel.includes('coder') ? '128,000' : secondaryModel.includes('claude') ? '200,000' : '65,536'} tokens</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Max Token Output</td>
                      <td className="p-3 font-mono bg-indigo-950/10 border-r border-slate-800/80">{(config.model.maxTokens || 4096).toLocaleString()} tokens</td>
                      <td className="p-3 font-mono">{secondaryModel.includes('coder') ? '8,192' : '4,096'} tokens</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Reasoning Support</td>
                      <td className="p-3 font-mono bg-indigo-950/10 border-r border-slate-800/80 capitalize">{config.model.reasoningEffort || 'high'}</td>
                      <td className="p-3 font-mono">{secondaryModel.includes('r1') || secondaryModel.includes('o1') || secondaryModel.includes('o3') ? 'High Reasoning' : 'Standard'}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Deployment Topology</td>
                      <td className="p-3 bg-indigo-950/10 border-r border-slate-800/80 font-mono text-xs">
                        {config.model.provider === 'ollama' || config.model.provider === 'custom' || (config.model.baseUrl && config.model.baseUrl.includes('11434')) ? '⚡ Edge Container / Local' : '☁️ Cloud API'}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {secondaryModel.includes('qwen') || secondaryModel.includes('gemma') || secondaryModel.includes('soul') || secondaryModel.includes('coder') ? '⚡ Edge Container / Local' : '☁️ Cloud API'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-400">Endpoint URL</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 bg-indigo-950/10 border-r border-slate-800/80 truncate max-w-[180px]">{config.model.baseUrl || 'https://api.provider.com/v1'}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-[180px]">http://192.168.1.49:11434/v1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Diagnostic Inspector (persistence.json) */}
      <div className="mt-8 p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Persistence Diagnostic Inspector (`persistence.json`)
            </h3>
            <p className="text-xs text-slate-400">
              Inspect raw persisted configuration state and verify that custom model selections (e.g. gemma4-soul) are successfully recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPersistenceDiagnostic}
            disabled={isPersistenceLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPersistenceLoading ? 'animate-spin' : ''}`} />
            {isPersistenceLoading ? 'Loading Persistence...' : 'Inspect persistence.json'}
          </button>
        </div>

        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 overflow-x-auto max-h-64">
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
            {persistenceRawData || 'Click "Inspect persistence.json" above to load raw storage state.'}
          </pre>
        </div>
      </div>
    </div>
  );
};
