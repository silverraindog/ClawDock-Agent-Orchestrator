import React, { useState } from 'react';
import {
  Sparkles,
  BookmarkCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  Upload,
  Download,
  Search,
  Zap,
  Brain,
  Cpu,
  Layers,
  Sliders,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Server,
  Code2,
  Terminal,
  FileJson,
  Edit3,
  Bot
} from 'lucide-react';
import {
  AgentId,
  AgentInfo,
  AgentFullConfig,
  ModelPresetSnapshot,
  PresetCategory,
  LLMProvider,
  ReasoningEffort
} from '../types';
import { INITIAL_PRESETS } from '../data/presetsData';
import { DEFAULT_PROVIDER_MODELS } from '../utils/apiBridge';

interface PresetsTabProps {
  currentAgent: AgentInfo;
  currentConfig: AgentFullConfig;
  allAgents: AgentInfo[];
  allConfigs: Record<AgentId, AgentFullConfig>;
  presets: ModelPresetSnapshot[];
  onSavePresets: (updated: ModelPresetSnapshot[]) => void;
  onApplyPresetToAgent: (preset: ModelPresetSnapshot, targetAgentId: AgentId) => void;
  onApplyPresetToAllAgents: (preset: ModelPresetSnapshot) => void;
  onAddToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const PresetsTab: React.FC<PresetsTabProps> = ({
  currentAgent,
  currentConfig,
  allAgents,
  allConfigs,
  presets,
  onSavePresets,
  onApplyPresetToAgent,
  onApplyPresetToAllAgents,
  onAddToast,
  onNavigateTab
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [jsonExportModalOpen, setJsonExportModalOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Form State for creating/editing a snapshot
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: PresetCategory;
    targetAgentId: AgentId | 'all';
    tags: string;
    includeMoa: boolean;
    includeFallback: boolean;
    includeSystem: boolean;
    provider: LLMProvider;
    model: string;
    apiKey: string;
    baseUrl: string;
    temperature: number;
    reasoningEffort: ReasoningEffort;
    maxTokens: number;
    contextWindow: number;
    topP: number;
    // MoA fields
    moaEnabled: boolean;
    proposerModels: string[];
    aggregatorModel: string;
    consensusThreshold: number;
    rounds: number;
    // Fallback fields
    fallbackEnabled: boolean;
    fallbackProvider: LLMProvider | string;
    fallbackModel: string;
    fallbackStrategy: 'on_offline' | 'on_error' | 'on_latency';
    // System
    systemPreset: string;
    systemPrompt: string;
  }>({
    name: '',
    description: '',
    category: 'coding',
    targetAgentId: 'all',
    tags: 'coding, custom',
    includeMoa: true,
    includeFallback: true,
    includeSystem: true,
    provider: currentConfig.model.provider,
    model: currentConfig.model.model,
    apiKey: currentConfig.model.apiKey || '',
    baseUrl: currentConfig.model.baseUrl || '',
    temperature: currentConfig.model.temperature,
    reasoningEffort: currentConfig.model.reasoningEffort,
    maxTokens: currentConfig.model.maxTokens,
    contextWindow: currentConfig.model.contextWindow,
    topP: currentConfig.model.topP,
    moaEnabled: currentConfig.moa.enabled,
    proposerModels: currentConfig.moa.proposerModels || [],
    aggregatorModel: currentConfig.moa.aggregatorModel || currentConfig.model.model,
    consensusThreshold: currentConfig.moa.consensusThreshold || 0.85,
    rounds: currentConfig.moa.rounds || 2,
    fallbackEnabled: currentConfig.fallback.enabled,
    fallbackProvider: currentConfig.fallback.fallbackProvider || 'ollama',
    fallbackModel: currentConfig.fallback.fallbackModel || 'gemma4-soul:latest',
    fallbackStrategy: currentConfig.fallback.strategy || 'on_offline',
    systemPreset: currentConfig.system.preset,
    systemPrompt: currentConfig.system.systemPrompt
  });

  // Populate form with current active configuration
  const handleOpenCreateSnapshot = () => {
    setEditingPresetId(null);
    setFormData({
      name: `${currentAgent.name} Snapshot (${new Date().toLocaleDateString()})`,
      description: `Snapshot captured from active ${currentAgent.name} configuration running ${currentConfig.model.model}.`,
      category: 'general',
      targetAgentId: 'all',
      tags: `${currentAgent.id}, snapshot, ${currentConfig.model.provider}`,
      includeMoa: true,
      includeFallback: true,
      includeSystem: true,
      provider: currentConfig.model.provider,
      model: currentConfig.model.model,
      apiKey: currentConfig.model.apiKey || '',
      baseUrl: currentConfig.model.baseUrl || '',
      temperature: currentConfig.model.temperature,
      reasoningEffort: currentConfig.model.reasoningEffort,
      maxTokens: currentConfig.model.maxTokens,
      contextWindow: currentConfig.model.contextWindow,
      topP: currentConfig.model.topP,
      moaEnabled: currentConfig.moa.enabled,
      proposerModels: currentConfig.moa.proposerModels || [],
      aggregatorModel: currentConfig.moa.aggregatorModel || currentConfig.model.model,
      consensusThreshold: currentConfig.moa.consensusThreshold || 0.85,
      rounds: currentConfig.moa.rounds || 2,
      fallbackEnabled: currentConfig.fallback.enabled,
      fallbackProvider: currentConfig.fallback.fallbackProvider || 'ollama',
      fallbackModel: currentConfig.fallback.fallbackModel || 'gemma4-soul:latest',
      fallbackStrategy: currentConfig.fallback.strategy || 'on_offline',
      systemPreset: currentConfig.system.preset,
      systemPrompt: currentConfig.system.systemPrompt
    });
    setIsCreateModalOpen(true);
  };

  const handleEditPreset = (preset: ModelPresetSnapshot) => {
    setEditingPresetId(preset.id);
    setFormData({
      name: preset.name,
      description: preset.description,
      category: (preset.category as PresetCategory) || 'general',
      targetAgentId: preset.targetAgentId || 'all',
      tags: (preset.tags || []).join(', '),
      includeMoa: Boolean(preset.moa),
      includeFallback: Boolean(preset.fallback),
      includeSystem: Boolean(preset.system),
      provider: preset.model.provider,
      model: preset.model.model,
      apiKey: preset.model.apiKey || '',
      baseUrl: preset.model.baseUrl || '',
      temperature: preset.model.temperature,
      reasoningEffort: preset.model.reasoningEffort || 'medium',
      maxTokens: preset.model.maxTokens,
      contextWindow: preset.model.contextWindow,
      topP: preset.model.topP,
      moaEnabled: preset.moa?.enabled ?? false,
      proposerModels: preset.moa?.proposerModels || [],
      aggregatorModel: preset.moa?.aggregatorModel || preset.model.model,
      consensusThreshold: preset.moa?.consensusThreshold || 0.85,
      rounds: preset.moa?.rounds || 2,
      fallbackEnabled: preset.fallback?.enabled ?? false,
      fallbackProvider: preset.fallback?.fallbackProvider || preset.fallback?.provider || 'ollama',
      fallbackModel: preset.fallback?.fallbackModel || preset.fallback?.model || '',
      fallbackStrategy: preset.fallback?.strategy || 'on_offline',
      systemPreset: preset.system?.preset || 'engineer',
      systemPrompt: preset.system?.systemPrompt || ''
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onAddToast('error', 'Validation Error', 'Preset name cannot be empty.');
      return;
    }

    const tagList = formData.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const snapshotToSave: ModelPresetSnapshot = {
      id: editingPresetId || `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: formData.name.trim(),
      description: formData.description.trim() || 'Custom model configuration preset snapshot.',
      category: formData.category,
      isBuiltIn: false,
      createdAt: editingPresetId ? (presets.find(p => p.id === editingPresetId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetAgentId: formData.targetAgentId,
      tags: tagList,
      model: {
        provider: formData.provider,
        model: formData.model,
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl || undefined,
        temperature: Number(formData.temperature),
        reasoningEffort: formData.reasoningEffort,
        maxTokens: Number(formData.maxTokens),
        contextWindow: Number(formData.contextWindow),
        topP: Number(formData.topP),
        useProxy: true
      },
      ...(formData.includeMoa ? {
        moa: {
          enabled: formData.moaEnabled,
          proposerModels: formData.proposerModels.length > 0 ? formData.proposerModels : [formData.model],
          aggregatorModel: formData.aggregatorModel || formData.model,
          rounds: Number(formData.rounds),
          temperatureSpread: 0.3,
          consensusThreshold: Number(formData.consensusThreshold)
        }
      } : {}),
      ...(formData.includeFallback ? {
        fallback: {
          enabled: formData.fallbackEnabled,
          strategy: formData.fallbackStrategy,
          fallbackProvider: formData.fallbackProvider,
          fallbackModel: formData.fallbackModel,
          provider: formData.fallbackProvider,
          model: formData.fallbackModel,
          apiKey: '',
          useProxy: true
        }
      } : {}),
      ...(formData.includeSystem ? {
        system: {
          preset: formData.systemPreset as any,
          systemPrompt: formData.systemPrompt,
          autoFormatCode: true
        }
      } : {})
    };

    let updatedList: ModelPresetSnapshot[];
    if (editingPresetId) {
      updatedList = presets.map(p => p.id === editingPresetId ? snapshotToSave : p);
      onAddToast('success', 'Preset Updated', `Snapshot "${snapshotToSave.name}" updated in persistence.json.`);
    } else {
      updatedList = [snapshotToSave, ...presets];
      onAddToast('success', 'Snapshot Saved', `Saved named configuration "${snapshotToSave.name}" to persistence.json.`);
    }

    onSavePresets(updatedList);
    setIsCreateModalOpen(false);
    setEditingPresetId(null);
  };

  const handleDeletePreset = (id: string, name: string) => {
    const updated = presets.filter(p => p.id !== id);
    onSavePresets(updated);
    onAddToast('info', 'Preset Removed', `Preset "${name}" removed from persistence.json.`);
  };

  const handleDuplicatePreset = (preset: ModelPresetSnapshot) => {
    const copy: ModelPresetSnapshot = {
      ...preset,
      id: `preset-copy-${Date.now()}`,
      name: `${preset.name} (Copy)`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [copy, ...presets];
    onSavePresets(updated);
    onAddToast('success', 'Preset Duplicated', `Created duplicate "${copy.name}".`);
  };

  const handleApply = (preset: ModelPresetSnapshot, targetAgentId: AgentId) => {
    onApplyPresetToAgent(preset, targetAgentId);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2000);
    const target = allAgents.find(a => a.id === targetAgentId);
    onAddToast(
      'success',
      'Preset Applied',
      `Loaded configuration "${preset.name}" into ${target?.name || targetAgentId} and synchronized persistence.json.`
    );
  };

  const handleApplyAll = (preset: ModelPresetSnapshot) => {
    onApplyPresetToAllAgents(preset);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2500);
    onAddToast(
      'success',
      'Bulk Preset Applied',
      `Loaded configuration "${preset.name}" across all ${allAgents.length} agents and updated persistence.json.`
    );
  };

  const handleResetDefaults = () => {
    onSavePresets(INITIAL_PRESETS);
    onAddToast('info', 'Presets Reset', 'Restored catalog to factory standard model configuration snapshots.');
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `clawdock_model_presets_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddToast('success', 'Presets Exported', 'Saved all snapshots as JSON file.');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge or replace
        const merged = [...parsed, ...presets.filter(p => !parsed.some((np: any) => np.id === p.id))];
        onSavePresets(merged);
        setJsonImportText('');
        setIsImporting(false);
        onAddToast('success', 'Presets Imported', `Successfully imported ${parsed.length} model presets.`);
      } else {
        throw new Error('Import payload must be a JSON array of preset objects.');
      }
    } catch (err: any) {
      onAddToast('error', 'Import Failed', err.message || 'Invalid JSON format.');
    }
  };

  // Filter presets
  const filteredPresets = presets.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.model.model.toLowerCase().includes(q) ||
      p.model.provider.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'coding':
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      case 'reasoning':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'speed':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'moa':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      default:
        return <Sliders className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Model Configuration Presets &amp; Snapshots
                </h2>
                <p className="text-xs text-slate-400">
                  Save, version, and instantly load model architectures (e.g., <strong className="text-slate-200">Fast Coding</strong>, <strong className="text-slate-200">Deep Reasoning</strong>, <strong className="text-slate-200">MoA Swarm</strong>) as persistent snapshots in <code className="text-indigo-300 font-mono text-[11px]">persistence.json</code>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-medium">
                Active Agent: <strong className="text-white">{currentAgent.name}</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-medium font-mono text-indigo-300">
                Current Model: {currentConfig.model.model} ({currentConfig.model.provider})
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {presets.length} Presets Available
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="snapshot-current-config-btn"
              onClick={handleOpenCreateSnapshot}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Snapshot Current Config</span>
            </button>

            <button
              id="export-presets-btn"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
              title="Export all presets as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              id="import-presets-btn"
              onClick={() => setIsImporting(!isImporting)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
              title="Import presets from JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              id="reset-presets-defaults-btn"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
              title="Reset to default built-in presets"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Defaults</span>
            </button>
          </div>
        </div>

        {/* JSON Import Drawer (If toggled) */}
        {isImporting && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-indigo-400" />
                <span>Import Presets JSON Payload</span>
              </div>
              <button
                onClick={() => setIsImporting(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder="Paste JSON array of ModelPresetSnapshot objects here..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleImportJson}
                disabled={!jsonImportText.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                Parse &amp; Merge into persistence.json
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets by name, model, tag, or description..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Presets' },
            { id: 'coding', label: 'Fast Coding' },
            { id: 'reasoning', label: 'Deep Reasoning' },
            { id: 'moa', label: 'MoA Swarm' },
            { id: 'speed', label: 'Edge / Speed' },
            { id: 'general', label: 'General / Custom' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presets Grid */}
      {filteredPresets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <BookmarkCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Presets Matched</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No configuration snapshots found matching &quot;{searchQuery}&quot;. Clear search or snapshot your current model settings.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPresets.map(preset => {
            const isApplied = appliedPresetId === preset.id;
            const isMatchingActive = currentConfig.model.model === preset.model.model && currentConfig.model.provider === preset.model.provider;

            return (
              <div
                key={preset.id}
                id={`preset-card-${preset.id}`}
                className={`flex flex-col justify-between rounded-2xl border bg-slate-900/90 p-5 transition-all relative group hover:border-slate-700 ${
                  isMatchingActive ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : 'border-slate-800'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                        {getCategoryIcon(preset.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {preset.name}
                          </h3>
                          {preset.isBuiltIn && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Built-in
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Category: {preset.category}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons (Edit, Duplicate, Delete) */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicatePreset(preset)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Duplicate Preset"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditPreset(preset)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Edit Snapshot"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Model Architecture Specs */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Model</span>
                      <span className="font-mono font-bold text-white text-[11px] truncate max-w-[160px]" title={preset.model.model}>
                        {preset.model.model}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Provider</span>
                      <span className="font-mono uppercase text-[10px] font-bold text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20">
                        {preset.model.provider}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono text-slate-400 border-t border-slate-900">
                      <div>
                        <span className="text-slate-500 block">Temp</span>
                        <span className="text-slate-200 font-semibold">{preset.model.temperature}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Reasoning</span>
                        <span className="text-purple-300 font-semibold uppercase">{preset.model.reasoningEffort || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Max Tok</span>
                        <span className="text-slate-200 font-semibold">{preset.model.maxTokens}</span>
                      </div>
                    </div>
                  </div>

                  {/* MoA & Fallback Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {preset.moa?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium font-mono">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        MoA ({preset.moa.proposerModels.length} proposers, {Math.round(preset.moa.consensusThreshold * 100)}% consensus)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700/60 font-medium">
                        Single Model
                      </span>
                    )}

                    {preset.fallback?.enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium font-mono">
                        <ShieldAlert className="w-3 h-3 text-emerald-400" />
                        Fallback: {preset.fallback.fallbackModel || preset.fallback.model}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {preset.tags && preset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {preset.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Apply Controls */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      id={`apply-preset-${preset.id}-btn`}
                      onClick={() => handleApply(preset, currentAgent.id)}
                      disabled={isApplied}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isApplied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      }`}
                      title={`Load this configuration snapshot into ${currentAgent.name}`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to {currentAgent.name}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply to {currentAgent.name}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Apply to All Dropdown Button */}
                  <button
                    onClick={() => handleApplyAll(preset)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors"
                    title="Apply this preset across all bot agents"
                  >
                    All Agents
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Snapshot Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingPresetId ? 'Edit Configuration Snapshot' : 'Save Configuration Snapshot'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Saves named snapshot directly into <code className="text-indigo-300 font-mono">persistence.json</code>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSnapshotSubmit} className="space-y-4 text-xs">
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Preset Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Fast Coding or Deep Reasoning"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="coding">Fast Coding</option>
                    <option value="reasoning">Deep Reasoning</option>
                    <option value="moa">MoA Consensus Swarm</option>
                    <option value="speed">Edge / Speed</option>
                    <option value="general">General / Custom</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe optimal use cases and characteristics..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="coding, low-latency, deepseek, ollama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Model Architecture Settings */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Model Architecture &amp; Hyperparameters</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) => {
                        const newProv = e.target.value as LLMProvider;
                        const defaultM = DEFAULT_PROVIDER_MODELS[newProv]?.[0]?.value || 'custom-model';
                        setFormData({ ...formData, provider: newProv, model: defaultM });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                    >
                      <option value="ollama">Ollama (Local Edge)</option>
                      <option value="deepseek">DeepSeek AI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq LPU</option>
                      <option value="mistral">Mistral AI</option>
                      <option value="openrouter">OpenRouter Gateway</option>
                      <option value="custom">Custom Endpoint</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Model Name / Identifier</label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Temperature ({formData.temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Reasoning Effort</label>
                    <select
                      value={formData.reasoningEffort}
                      onChange={(e) => setFormData({ ...formData, reasoningEffort: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 uppercase text-[11px]"
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="extended">Extended</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Max Tokens</label>
                    <input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 4096 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-400">Context Window</label>
                    <input
                      type="number"
                      value={formData.contextWindow}
                      onChange={(e) => setFormData({ ...formData, contextWindow: parseInt(e.target.value) || 32000 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* MoA Settings Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Mixture of Agents (MoA) Swarm Consensus</span>
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moaEnabled}
                      onChange={(e) => setFormData({ ...formData, moaEnabled: e.target.checked })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-300 font-medium">Enable MoA</span>
                  </label>
                </div>

                {formData.moaEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-slate-400">Consensus Threshold ({Math.round(formData.consensusThreshold * 100)}%)</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={formData.consensusThreshold}
                        onChange={(e) => setFormData({ ...formData, consensusThreshold: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Aggregation Rounds</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rounds}
                        onChange={(e) => setFormData({ ...formData, rounds: parseInt(e.target.value) || 2 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Aggregator Model</label>
                      <input
                        type="text"
                        value={formData.aggregatorModel}
                        onChange={(e) => setFormData({ ...formData, aggregatorModel: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                >
                  {editingPresetId ? 'Save Changes' : 'Save Snapshot to persistence.json'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
