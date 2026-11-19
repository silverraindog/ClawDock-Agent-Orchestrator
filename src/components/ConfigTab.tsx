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
  Key,
  ShieldCheck,
  BookmarkCheck,
  History
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
import { MODEL_OPTIONS, DEFAULT_CONFIGS, DEFAULT_NATIVE_FILES, INITIAL_AGENTS } from '../data/defaults';
import { AgentFallbackSettings } from './AgentFallbackSettings';
export { AgentFallbackSettings } from './AgentFallbackSettings';
import { validateModelAgainstCatalog } from '../utils/modelValidation';
import { 
  fetchAgentLiveConfig, 
  saveAgentConfigToBackend, 
  testLLMConnection,
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
import { parseNativeConfigToSchema, generateHermesYaml } from '../utils/configParser';
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
  });
};

/**
 * Validates and displays the LLM provider failover configuration.
 */
export const useProviderFailoverStatus = (provider: LLMProvider): React.ReactNode => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
      <span className="text-sm font-medium text-indigo-300">Provider:</span>
      <span className="text-sm font-medium text-emerald-400">{provider.name}</span>
    </div>
  );
};

/**
 * Displays model configuration options with their availability status.
 */
export const ModelOptionsRenderer = ({ models, provider }: { models: LLMProvider[], provider: string }) => {
  const isSelected = (id: string): boolean => {
    return models.some(m => m.id === id);
  };

  return (
    <div className="space-y-2">
      {models.map((model) => (
        <label key={model.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected(model.id)}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <div>
            <div className="text-sm font-medium text-white">
              {model.name} ({model.description})
            </div>
            <div className="text-xs text-slate-400">
              {provider === 'local' ? 'Local' : provider.split('-').join(' ')}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
};

/**
 * Renders the provider selection panel with all available model options.
 */
export const ProviderSelectionPanel = ({ models, selectedProvider }: { models: LLMProvider[], selectedProvider?: string }) => {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h3 className="text-sm font-semibold text-white mb-2">Select Provider</h3>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'local'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">Local</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'openai'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">OpenAI</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'gemini'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">Gemini</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'deepseek'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">DeepSeek</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'claude'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">Claude</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'mistral'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">Mistral</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedProvider === 'llama'}
            onChange={() => {}}
            className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
          />
          <span className="text-sm font-medium text-white">Llama</span>
        </label>

        {models.map((model, index) => (
          <div key={index}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={selectedProvider === model.id}
                onChange={() => {}}
                className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
              />
              <span className="text-sm font-medium text-white">{model.name}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renders the model selection panel with all available model options.
 */
export const ModelSelectionPanel = ({ models }: { models: LLMProvider[] }) => {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h3 className="text-sm font-semibold text-white mb-2">Select Model</h3>

      <div className="space-y-2">
        {models.map((model, index) => (
          <label key={index} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-emerald-500 bg-slate-900 rounded border-slate-800 focus:ring-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-offset-2"
            />
            <div>
              <div className="text-sm font-medium text-white">
                {model.name} ({model.description})
              </div>
              <div className="text-xs text-slate-400">
                {model.provider}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {models.length} model(s) available
        </span>
        <span className="text-xs text-emerald-400 font-medium">
          {selectedProvider || 'Select a provider'}
        </span>
      </div>
    </div>
  );
};



export const DEFAULT_NATIVE_FILES = {
  agentConfig: 'agent_config.yaml',
  systemConfig: 'system_config.yaml',
  modelConfig: 'model_config.yaml'
};

export type AgentPurpose = 'engineer' | 'researcher' | 'devops';

/**
 * Uses the failover provider configuration to display appropriate UI components.
 */
export const useProviderFailover = (config: any) => {
  return {
    selectedProvider: config?.selectedProvider || 'local',
    models: config?.models || DEFAULT_LOCAL_MODELS,
    fallbackProvider: config?.fallbackProvider || 'local'
  };
};
