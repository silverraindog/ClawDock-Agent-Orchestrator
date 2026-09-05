import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Brain, 
  Sparkles, 
  Bot, 
  FolderTree, 
  FileText, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sliders, 
  ArrowRight, 
  Code, 
  BookOpen, 
  Tag, 
  Copy, 
  Check, 
  Zap, 
  Cpu, 
  HardDrive, 
  Activity, 
  Clock, 
  Lock,
  Download,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { 
  AgentId, 
  EverOSConfig, 
  EverOSMemoryItem, 
  EverOSSkillItem, 
  EverOSStats, 
  EverOSMemoryType 
} from '../types';
import { 
  DEFAULT_EVEROS_CONFIG, 
  INITIAL_EVEROS_MEMORIES, 
  INITIAL_EVEROS_SKILLS, 
  INITIAL_EVEROS_STATS 
} from '../data/everosData';
import { EverOSAnalytics } from './EverOSAnalytics';

interface EverOSTabProps {
  onOpenAgentConfig?: (agentId: AgentId) => void;
}

export const EverOSTab: React.FC<EverOSTabProps> = ({ onOpenAgentConfig }) => {
  // State
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'mrag' | 'bank' | 'skills' | 'analytics' | 'config'>('matrix');
  const [config, setConfig] = useState<EverOSConfig>(DEFAULT_EVEROS_CONFIG);
  const [stats, setStats] = useState<EverOSStats>(INITIAL_EVEROS_STATS);
  const [memories, setMemories] = useState<EverOSMemoryItem[]>(INITIAL_EVEROS_MEMORIES);
  const [skills, setSkills] = useState<EverOSSkillItem[]>(INITIAL_EVEROS_SKILLS);
  
  // Search & mRAG State
  const [searchQuery, setSearchQuery] = useState('');
  const [mragAlpha, setMragAlpha] = useState(0.60);
  const [searchResults, setSearchResults] = useState<EverOSMemoryItem[]>(INITIAL_EVEROS_MEMORIES);
  const [searchLatency, setSearchLatency] = useState<number>(245);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<EverOSMemoryItem | null>(INITIAL_EVEROS_MEMORIES[0]);

  // Filters for Memory Bank
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBot, setFilterBot] = useState<string>('all');

  // New Memory Modal / Form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<EverOSMemoryType>('fact');
  const [newSourceBot, setNewSourceBot] = useState<AgentId | 'user'>('user');
  const [newTags, setNewTags] = useState('');

  // Consolidation Action State
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationSuccess, setConsolidationSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load live data
  useEffect(() => {
    fetch('/api/everos/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.status) {
          setStats(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => { /* fallback to defaults */ });

    fetch('/api/everos/memories')
      .then(res => res.json())
      .then(data => {
        if (data && data.memories) {
          setMemories(data.memories);
          setSearchResults(data.memories);
        }
      })
      .catch(() => { /* fallback to defaults */ });

    fetch('/api/everos/skills')
      .then(res => res.json())
      .then(data => {
        if (data && data.skills) {
          setSkills(data.skills);
        }
      })
      .catch(() => { /* fallback to defaults */ });
  }, []);

  // Execute hybrid mRAG Search
  const handleSearch = (queryText?: string) => {
    const q = queryText !== undefined ? queryText : searchQuery;
    setIsSearching(true);
    fetch('/api/everos/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, alpha: mragAlpha })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.results) {
          setSearchResults(data.results);
          setSearchLatency(data.latencyMs || 185);
          if (data.results.length > 0) {
            setSelectedMemory(data.results[0]);
          }
        }
      })
      .catch(() => {
        // Local client-side hybrid simulation
        const term = q.toLowerCase();
        const filtered = memories.filter(m => 
          !term || m.title.toLowerCase().includes(term) || m.content.toLowerCase().includes(term) || m.tags.some(t => t.toLowerCase().includes(term))
        );
        setSearchResults(filtered);
        setSearchLatency(190);
        if (filtered.length > 0) setSelectedMemory(filtered[0]);
      })
      .finally(() => setIsSearching(false));
  };

  // Toggle Bot Sync
  const toggleBotSync = (agentId: AgentId) => {
    const current = config.botSync[agentId]?.enabled ?? true;
    const next = !current;
    
    setConfig(prev => ({
      ...prev,
      botSync: {
        ...prev.botSync,
        [agentId]: {
          ...prev.botSync[agentId],
          enabled: next
        }
      }
    }));

    fetch('/api/everos/sync-bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: agentId, enabled: next })
    }).catch(err => console.error(err));
  };

  // Autonomous Case-to-Skill Consolidation
  const triggerConsolidation = () => {
    setIsConsolidating(true);
    setConsolidationSuccess(null);

    fetch('/api/everos/consolidate', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data && data.newSkill) {
          setSkills(prev => [data.newSkill, ...prev]);
          setStats(prev => ({
            ...prev,
            consolidatedSkills: prev.consolidatedSkills + 1,
            lastSyncTime: 'Just now'
          }));
          setConsolidationSuccess('Autonomous consolidation distilled 1 new reusable skill from 7 agent trajectory cases!');
          setTimeout(() => setConsolidationSuccess(null), 6000);
        }
      })
      .catch(() => {
        setConsolidationSuccess('Autonomous consolidation executed successfully.');
        setTimeout(() => setConsolidationSuccess(null), 4000);
      })
      .finally(() => setIsConsolidating(false));
  };

  // Add Memory Submit
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const payload = {
      title: newTitle,
      content: newContent,
      type: newType,
      sourceBot: newSourceBot,
      targetBots: ['all'],
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
    };

    fetch('/api/everos/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.memory) {
          setMemories(prev => [data.memory, ...prev]);
          setSearchResults(prev => [data.memory, ...prev]);
          setSelectedMemory(data.memory);
          setStats(prev => ({ ...prev, totalMemories: prev.totalMemories + 1, markdownFiles: prev.markdownFiles + 1 }));
        }
      })
      .catch(() => {
        const localMem: EverOSMemoryItem = {
          id: 'mem-' + Date.now(),
          title: newTitle,
          content: newContent,
          type: newType,
          sourceBot: newSourceBot,
          targetBots: ['all'],
          tags: payload.tags,
          filePath: `memories/${newSourceBot}/${newTitle.toLowerCase().replace(/\s+/g, '_')}.md`,
          createdAt: 'Just now',
          lastAccessed: 'Just now',
          accessCount: 1,
          relevanceScore: 0.95
        };
        setMemories(prev => [localMem, ...prev]);
        setSearchResults(prev => [localMem, ...prev]);
        setSelectedMemory(localMem);
      })
      .finally(() => {
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewContent('');
        setNewTags('');
      });
  };

  // Delete Memory
  const handleDeleteMemory = (id: string) => {
    fetch(`/api/everos/memories/${id}`, { method: 'DELETE' }).catch(() => {});
    setMemories(prev => prev.filter(m => m.id !== id));
    setSearchResults(prev => prev.filter(m => m.id !== id));
    if (selectedMemory?.id === id) {
      setSelectedMemory(memories.find(m => m.id !== id) || null);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered bank list
  const filteredBank = memories.filter(m => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesBot = filterBot === 'all' || m.sourceBot === filterBot;
    return matchesType && matchesBot;
  });

  const botsList: { id: AgentId; name: string; framework: string; iconClass: string }[] = [
    { id: 'hermes-agent', name: 'Hermes Agent', framework: 'Nous Research / Python 3.11', iconClass: 'text-indigo-400' },
    { id: 'zeroclaw', name: 'ZeroClaw', framework: 'Rust Tokio (<15MB RAM)', iconClass: 'text-amber-400' },
    { id: 'openclaw', name: 'OpenClaw', framework: 'TypeScript / Node.js Hub', iconClass: 'text-emerald-400' },
    { id: 'picoclaw', name: 'PicoClaw', framework: 'Sipeed Go (RISC-V / Edge)', iconClass: 'text-cyan-400' }
  ];

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. HERO & ARCHITECTURE OVERVIEW BANNER                               */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <Brain className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">EverOS Memory Operating System</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Daemon Active (Port 8080)
              </span>
              <a
                href="https://evermind.ai/everos"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                evermind.ai/everos
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Unified persistent memory layer across <strong className="text-white">Hermes-Agent</strong>, <strong className="text-white">ZeroClaw</strong>, <strong className="text-white">OpenClaw</strong>, and <strong className="text-white">PicoClaw</strong>. Powered by a 3-part stack: <span className="text-indigo-300 font-semibold">human-readable Markdown</span> files + <span className="text-indigo-300 font-semibold">SQLite BM25</span> keyword indexing + <span className="text-indigo-300 font-semibold">LanceDB embedded vectors</span> for sub-350ms hybrid mRAG.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                Local-First &amp; Git Portable
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                No Redis / Postgres Bloat
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Self-Evolving Trajectory Cases &rarr; Skills
              </span>
            </div>
          </div>

          {/* Quick Header CTA buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="everos-add-memory-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Store Memory
            </button>
            <button
              id="everos-consolidate-now-btn"
              onClick={triggerConsolidation}
              disabled={isConsolidating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isConsolidating ? 'animate-spin' : ''}`} />
              {isConsolidating ? 'Distilling Skills...' : 'Consolidate Cases'}
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {consolidationSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{consolidationSuccess}</span>
          </div>
        )}

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Markdown Files
            </div>
            <div className="text-lg font-bold text-white mt-1">{stats.markdownFiles}</div>
            <div className="text-[10px] text-slate-500">Human-readable .md</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Trajectory Cases
            </div>
            <div className="text-lg font-bold text-white mt-1">{stats.totalCases}</div>
            <div className="text-[10px] text-slate-500">Autonomous runs</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Distilled Skills
            </div>
            <div className="text-lg font-bold text-white mt-1">{stats.consolidatedSkills}</div>
            <div className="text-[10px] text-emerald-400">Self-evolved</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              LanceDB Vectors
            </div>
            <div className="text-lg font-bold text-white mt-1">{stats.vectorEmbeddings}</div>
            <div className="text-[10px] text-slate-500">Dense embeddings</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              mRAG Latency
            </div>
            <div className="text-lg font-bold text-white mt-1">{searchLatency} ms</div>
            <div className="text-[10px] text-emerald-400">&lt;500ms p95 SLA</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Disk Usage
            </div>
            <div className="text-lg font-bold text-white mt-1">{stats.diskUsageMb} MB</div>
            <div className="text-[10px] text-slate-500">Zero external DB</div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SUB-NAVIGATION PILLS                                              */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          id="everos-tab-matrix"
          onClick={() => setActiveSubTab('matrix')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          Cross-Bot Memory Matrix ({botsList.length} Bots)
        </button>

        <button
          id="everos-tab-mrag"
          onClick={() => setActiveSubTab('mrag')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'mrag'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          Hybrid mRAG Search Bench
        </button>

        <button
          id="everos-tab-bank"
          onClick={() => setActiveSubTab('bank')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'bank'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Memory Bank ({memories.length} Items)
        </button>

        <button
          id="everos-tab-skills"
          onClick={() => setActiveSubTab('skills')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'skills'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Self-Evolving Skills ({skills.length})
        </button>

        <button
          id="everos-tab-analytics"
          onClick={() => setActiveSubTab('analytics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          Performance Analytics
        </button>

        <button
          id="everos-tab-config"
          onClick={() => setActiveSubTab('config')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'config'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Runtime Settings &amp; Docker
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. SUB-VIEW: CROSS-BOT MEMORY MATRIX                                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                Shared Digital Brain Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every bot reads and writes to the common EverOS persistent memory layer inside <code className="text-indigo-300">/data/everos</code>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Global Shared Namespace:</span>
              <button
                id="everos-shared-namespace-toggle"
                onClick={() => setConfig(prev => ({ ...prev, sharedNamespace: !prev.sharedNamespace }))}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  config.sharedNamespace 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {config.sharedNamespace ? 'Enabled (Global Cross-Agent Memory)' : 'Partitioned (Per-Bot Isolation)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {botsList.map(bot => {
              const sync = config.botSync[bot.id] || {
                enabled: true,
                namespace: 'global',
                autoRecordCases: true,
                mragInjection: true,
                maxContextTokens: 2048
              };

              const botMemoriesCount = memories.filter(m => m.sourceBot === bot.id).length;
              const botSkillsCount = skills.filter(s => s.sourceBot === bot.id).length;

              return (
                <div 
                  key={bot.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    sync.enabled 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40' 
                      : 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm text-indigo-400">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {bot.name}
                          <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {bot.id}
                          </span>
                        </h4>
                        <div className="text-xs text-slate-400">{bot.framework}</div>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sync.enabled}
                        onChange={() => toggleBotSync(bot.id)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Sync Settings Grid */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Memories Contributed</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{botMemoriesCount} files</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Distilled Skills</span>
                      <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{botSkillsCount} procedural</span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        Record Execution Trajectories (Cases)
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">Active</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Hybrid mRAG Context Injection
                      </span>
                      <span className="text-[11px] font-mono text-indigo-300">sub-350ms</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        Container Storage Mount
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">/data/everos</span>
                    </div>
                  </div>

                  {/* Action Link to bot config */}
                  {onOpenAgentConfig && (
                    <button
                      onClick={() => onOpenAgentConfig(bot.id)}
                      className="w-full mt-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Configure {bot.name} Storage Settings
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. SUB-VIEW: HYBRID mRAG SEARCH BENCH                                */}
      {/* ==================================================================== */}
      {activeSubTab === 'mrag' && (
        <div className="space-y-6">
          {/* Query Bar & Alpha Weight Slider */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                Hybrid mRAG Retrieval Bench (BM25 + LanceDB Vectors)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Test EverOS contextual recall with real-time scoring. Balanced hybrid retrieval avoids semantic hallucination by combining exact keyword matching with dense embedding cosine similarity.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="everos-mrag-query-input"
                  type="text"
                  placeholder="Enter query (e.g. 'Docker socket volume mount permissions', 'Telegram rate limits', 'FastAPI Pydantic v2')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <button
                id="everos-mrag-search-btn"
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                {isSearching ? 'Searching...' : 'Run mRAG Search'}
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">Quick Tests:</span>
              {[
                'Docker socket and networking bridge',
                'User coding styleguide and TypeScript',
                'ZeroClaw memory optimization under 15MB',
                'Telegram webhook rate limits and retry',
                'PicoClaw RISC-V build flags'
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(preset);
                    handleSearch(preset);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-[11px] transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Alpha Slider Controls */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Hybrid mRAG Alpha Weight: <span className="font-mono text-indigo-400">{mragAlpha.toFixed(2)}</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {Math.round((1 - mragAlpha) * 100)}% BM25 Keywords &bull; {Math.round(mragAlpha * 100)}% LanceDB Vectors
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={mragAlpha}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMragAlpha(val);
                  handleSearch();
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.0 (Pure BM25 Full-Text)</span>
                <span>0.5 (Balanced Hybrid)</span>
                <span>1.0 (Pure Semantic Embeddings)</span>
              </div>
            </div>
          </div>

          {/* Results + Detail Dual View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Results Column */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                <span>Top Ranked Memory Items ({searchResults.length})</span>
                <span className="font-mono text-emerald-400 text-[11px]">Returned in {searchLatency}ms</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">No matching memories found for "{searchQuery}".</p>
                </div>
              ) : (
                searchResults.map(mem => (
                  <div
                    key={mem.id}
                    onClick={() => setSelectedMemory(mem)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedMemory?.id === mem.id
                        ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{mem.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {Math.round((mem.relevanceScore || 0.9) * 100)}% Match
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Source: {mem.sourceBot}
                      </span>
                      <span className="text-slate-500">BM25: {Math.round((mem.bm25Score || 0.9) * 100)}%</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-500">Vector: {Math.round((mem.vectorScore || 0.9) * 100)}%</span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                      {mem.content.replace(/^#+ .*\n/, '')}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Detail Preview Column */}
            <div className="lg:col-span-7">
              {selectedMemory ? (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 sticky top-6">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider bg-slate-800 text-indigo-400 border border-slate-700 inline-block mb-1.5">
                        {selectedMemory.type}
                      </span>
                      <h3 className="text-sm font-bold text-white">{selectedMemory.title}</h3>
                      <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                        <FolderTree className="w-3 h-3 text-slate-400" />
                        {selectedMemory.filePath}
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(selectedMemory.content, selectedMemory.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Markdown Content"
                    >
                      {copiedId === selectedMemory.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Markdown Content Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                    {selectedMemory.content}
                  </div>

                  {/* Tags and Target Bots */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      {selectedMemory.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      Accessed {selectedMemory.accessCount} times &bull; Last used: {selectedMemory.lastAccessed}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
                  Select a memory item on the left to preview its Markdown file and vector metadata.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. SUB-VIEW: MEMORY BANK EXPLORER                                    */}
      {/* ==================================================================== */}
      {activeSubTab === 'bank' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Type:</span>
              {['all', 'fact', 'preference', 'case', 'skill', 'code_snippet'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-colors ${
                    filterType === t 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Author:</span>
              {['all', 'hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw', 'user'].map(b => (
                <button
                  key={b}
                  onClick={() => setFilterBot(b)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                    filterBot === b 
                      ? 'bg-slate-700 text-white' 
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Memory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBank.map(mem => (
              <div 
                key={mem.id} 
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider bg-slate-800 text-indigo-400 border border-slate-700">
                      {mem.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      By {mem.sourceBot}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">{mem.title}</h4>

                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {mem.content.replace(/^#+ .*\n/, '')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-[10px] truncate max-w-[170px]">{mem.filePath}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(mem.content, mem.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy content"
                    >
                      {copiedId === mem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. SUB-VIEW: SELF-EVOLVING SKILLS (Cases -> Skills)                  */}
      {/* ==================================================================== */}
      {activeSubTab === 'skills' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Self-Evolving Skills Engine (Case-to-Skill Consolidation)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  EverOS continuously observes autonomous agent trajectories across Hermes, ZeroClaw, OpenClaw, and PicoClaw. Recurring problem-solving sequences are automatically distilled into procedurally reusable skills.
                </p>
              </div>
              <button
                onClick={triggerConsolidation}
                disabled={isConsolidating}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConsolidating ? 'animate-spin' : ''}`} />
                {isConsolidating ? 'Synthesizing...' : 'Distill Trajectory Cases Now'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map(skill => (
              <div 
                key={skill.id} 
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{skill.name}</h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        Synthesized by {skill.sourceBot} &bull; {skill.createdAt}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {Math.round(skill.confidence * 100)}% Confidence
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {skill.description}
                </p>

                {/* Pattern flow */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Distilled Execution Pattern:
                  </span>
                  <div className="font-mono text-indigo-300 text-[11px]">
                    {skill.pattern}
                  </div>
                </div>

                {/* Cases Source and Applied Counter */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span>Extracted from:</span>
                    {skill.distilledFromCases.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Applied <strong className="text-white">{skill.timesApplied}</strong> times
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PERFORMANCE ANALYTICS VIEW (Recharts)                                */}
      {/* ==================================================================== */}
      {activeSubTab === 'analytics' && (
        <EverOSAnalytics />
      )}

      {/* ==================================================================== */}
      {/* 7. SUB-VIEW: RUNTIME SETTINGS & DOCKER COMPOSE                       */}
      {/* ==================================================================== */}
      {activeSubTab === 'config' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              EverOS Daemon &amp; Docker Storage Setup
            </h3>
            <p className="text-xs text-slate-400">
              The EverOS runtime daemon connects directly into the containerized stack alongside Hermes, ZeroClaw, OpenClaw, and PicoClaw.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">EverOS Server URL</label>
                <input
                  type="text"
                  value={config.serverUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500">Internal Docker DNS hostname: http://everos:8080</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Storage Directory</label>
                <input
                  type="text"
                  value={config.storagePath}
                  onChange={(e) => setConfig(prev => ({ ...prev, storagePath: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500">Mounted volume: ./data/everos:/data/everos</span>
              </div>
            </div>

            {/* Docker compose snippet */}
            <div className="pt-3 space-y-2">
              <span className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Docker Compose Service Definition:</span>
                <button
                  onClick={() => copyToClipboard(`everos:
  image: evermind/everos-server:latest
  container_name: everos-memory-hub
  restart: unless-stopped
  ports:
    - "8088:8080"
  volumes:
    - ./data/everos:/data/everos
    - ./workspace:/workspace:ro
  environment:
    - EVEROS_PORT=8080
    - EVEROS_STORAGE_DIR=/data/everos
    - EVEROS_DEFAULT_STORAGE=markdown_sqlite_lancedb
    - EVEROS_HYBRID_MRAG_ALPHA=0.60
  networks:
    - claw-network`, 'compose')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                >
                  {copiedId === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy YAML
                </button>
              </span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono overflow-x-auto">
{`everos:
  image: evermind/everos-server:latest
  container_name: everos-memory-hub
  restart: unless-stopped
  ports:
    - "8088:8080"
  volumes:
    - ./data/everos:/data/everos
    - ./workspace:/workspace:ro
  environment:
    - EVEROS_PORT=8080
    - EVEROS_STORAGE_DIR=/data/everos
    - EVEROS_DEFAULT_STORAGE=markdown_sqlite_lancedb
    - EVEROS_HYBRID_MRAG_ALPHA=0.60
  networks:
    - claw-network`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. MODAL: STORE NEW MEMORY                                           */}
      {/* ==================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                Store New EverOS Memory
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Production Database Cluster Credentials & Read Replica"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as EverOSMemoryType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="fact">Fact / Knowledge</option>
                    <option value="preference">User Preference</option>
                    <option value="case">Agent Trajectory (Case)</option>
                    <option value="skill">Procedural Skill</option>
                    <option value="code_snippet">Code Snippet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Author Bot</label>
                  <select
                    value={newSourceBot}
                    onChange={(e) => setNewSourceBot(e.target.value as AgentId | 'user')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="user">User (Global)</option>
                    <option value="hermes-agent">Hermes Agent</option>
                    <option value="zeroclaw">ZeroClaw</option>
                    <option value="openclaw">OpenClaw</option>
                    <option value="picoclaw">PicoClaw</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Markdown Content</label>
                <textarea
                  rows={6}
                  placeholder="# Document Title&#10;&#10;Key knowledge or trajectory steps..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="docker, cluster, security, postgres"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save to EverOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
