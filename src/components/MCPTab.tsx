import React, { useState, useMemo, useEffect } from 'react';
import { 
  Server, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Globe, 
  Wrench,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Download,
  Code2,
  Trash2,
  Eye,
  EyeOff,
  Layers,
  Settings2,
  FileCode,
  Check,
  Copy,
  Cpu,
  Database,
  BookOpen,
  Filter,
  X,
  Tag
} from 'lucide-react';
import { MCPServerConfig } from '../types';
import { OFFICIAL_MCP_REGISTRY, OFFICIAL_MCP_CATEGORIES } from '../data/officialMcpServers';
import { fetchOfficialMcpCatalog } from '../utils/apiBridge';

interface MCPTabProps {
  mcpServers: MCPServerConfig[];
  onToggleServer: (serverId: string) => void;
  onTestServer: (serverId: string) => void;
  onAddCustomServer: (server: MCPServerConfig) => void;
  onDeleteServer?: (serverId: string) => void;
  onBatchAddServers?: (servers: MCPServerConfig[]) => void;
  onSyncOpenClawRemote?: () => Promise<void>;
  isSyncingRemote?: boolean;
  selectedAgentId?: string;
}

export const MCPTab: React.FC<MCPTabProps> = ({
  mcpServers,
  onToggleServer,
  onTestServer,
  onAddCustomServer,
  onDeleteServer,
  onBatchAddServers,
  onSyncOpenClawRemote,
  isSyncingRemote = false,
  selectedAgentId = 'hermes-agent'
}) => {
  // Source selector: 'installed' (Primary: mcpServers) | 'catalog' (Secondary: mcpservers.org) | 'import' (JSON)
  const [sourceMode, setSourceMode] = useState<'catalog' | 'installed' | 'import'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterInstalledStatus, setFilterInstalledStatus] = useState<'all' | 'ready' | 'installed'>('all');
  
  // Official Secondary Source State (mcpservers.org)
  const [catalogServers, setCatalogServers] = useState<MCPServerConfig[]>(OFFICIAL_MCP_REGISTRY);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);

  // Configuration & Installation Modal State
  const [configuringServer, setConfiguringServer] = useState<MCPServerConfig | null>(null);
  const [configuredEnv, setConfiguredEnv] = useState<Record<string, string>>({});
  const [configuredArgs, setConfiguredArgs] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Custom MCP Modal State
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');
  const [newServerCategory, setNewServerCategory] = useState('Custom');
  const [newServerTransport, setNewServerTransport] = useState<'stdio' | 'sse'>('stdio');
  const [newServerUrl, setNewServerUrl] = useState('');

  // JSON Config Import State
  const [jsonSnippet, setJsonSnippet] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedImportServers, setParsedImportServers] = useState<MCPServerConfig[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch official catalog from /api/mcp/official-catalog on mount
  useEffect(() => {
    let isMounted = true;
    fetchOfficialMcpCatalog().then((res) => {
      if (isMounted && res.success && Array.isArray(res.servers) && res.servers.length > 0) {
        setCatalogServers(res.servers);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    try {
      const res = await fetchOfficialMcpCatalog();
      if (res.success && res.servers) {
        setCatalogServers(res.servers);
      }
    } finally {
      setTimeout(() => setIsRefreshingCatalog(false), 500);
    }
  };

  // Map of primary installed servers for fast status resolution
  const installedLookup = useMemo(() => {
    const map = new Map<string, MCPServerConfig>();
    for (const server of mcpServers) {
      if (!server) continue;
      map.set(server.id, server);
      if (server.id.startsWith('mcp-')) {
        map.set(`official-${server.id}`, server);
        map.set(`official-mcp-${server.id.replace(/^mcp-/, '')}`, server);
        map.set(server.id.replace(/^mcp-/, ''), server);
      }
      if (server.packageOrRepo) {
        map.set(server.packageOrRepo, server);
      }
      if (server.name) {
        map.set(server.name.toLowerCase(), server);
      }
    }
    return map;
  }, [mcpServers]);

  const isServerInstalled = (server: MCPServerConfig): boolean => {
    if (!server) return false;
    const cleanId = server.id.startsWith('mcp-') 
      ? server.id 
      : `mcp-${server.id.replace('official-mcp-', '')}`;
    return Boolean(
      installedLookup.has(server.id) ||
      installedLookup.has(cleanId) ||
      (server.packageOrRepo && installedLookup.has(server.packageOrRepo)) ||
      (server.name && installedLookup.has(server.name.toLowerCase()))
    );
  };

  const getInstalledServerConfig = (server: MCPServerConfig): MCPServerConfig | undefined => {
    if (!server) return undefined;
    const cleanId = server.id.startsWith('mcp-') 
      ? server.id 
      : `mcp-${server.id.replace('official-mcp-', '')}`;
    return (
      installedLookup.get(server.id) ||
      installedLookup.get(cleanId) ||
      (server.packageOrRepo ? installedLookup.get(server.packageOrRepo) : undefined) ||
      (server.name ? installedLookup.get(server.name.toLowerCase()) : undefined)
    );
  };

  // Filtered secondary catalog (mcpservers.org)
  const filteredCatalog = useMemo(() => {
    return catalogServers.filter((server) => {
      const matchesCategory = selectedCategory === 'All' || server.category === selectedCategory;
      if (!matchesCategory) return false;

      const installed = isServerInstalled(server);
      if (filterInstalledStatus === 'ready' && installed) return false;
      if (filterInstalledStatus === 'installed' && !installed) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inName = (server.name || '').toLowerCase().includes(q);
      const inVendor = (server.vendor || '').toLowerCase().includes(q);
      const inDesc = (server.description || '').toLowerCase().includes(q);
      const inPkg = (server.packageOrRepo || '').toLowerCase().includes(q);
      const inTools = Array.isArray(server.toolsProvided) && server.toolsProvided.some(t => t.toLowerCase().includes(q));

      return inName || inVendor || inDesc || inPkg || inTools;
    });
  }, [catalogServers, selectedCategory, searchQuery, filterInstalledStatus, installedLookup]);

  // Category counts for Secondary Source (catalog)
  const catalogCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: catalogServers.length };
    for (const cat of OFFICIAL_MCP_CATEGORIES) {
      if (cat === 'All') continue;
      counts[cat] = catalogServers.filter(s => s.category === cat).length;
    }
    return counts;
  }, [catalogServers]);

  // Category counts for Primary Source (installed)
  const installedCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: mcpServers.length };
    for (const cat of OFFICIAL_MCP_CATEGORIES) {
      if (cat === 'All') continue;
      counts[cat] = mcpServers.filter(s => s.category === cat).length;
    }
    for (const s of mcpServers) {
      if (s.category && counts[s.category] === undefined) {
        counts[s.category] = mcpServers.filter(item => item.category === s.category).length;
      }
    }
    return counts;
  }, [mcpServers]);

  // List of categories present in installed servers
  const installedCategories = useMemo(() => {
    const set = new Set<string>(OFFICIAL_MCP_CATEGORIES);
    for (const s of mcpServers) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [mcpServers]);

  // Catalog count statistics
  const catalogStats = useMemo(() => {
    let installedCount = 0;
    for (const server of catalogServers) {
      if (isServerInstalled(server)) {
        installedCount++;
      }
    }
    return {
      total: catalogServers.length,
      installed: installedCount,
      ready: catalogServers.length - installedCount
    };
  }, [catalogServers, installedLookup]);

  // Filtered primary installed servers (mcpServers state) with search & category filtering
  const filteredInstalled = useMemo(() => {
    return (mcpServers || []).filter((s) => {
      if (!s) return false;
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inName = (s.name || '').toLowerCase().includes(q);
      const inDesc = (s.description || '').toLowerCase().includes(q);
      const inCat = (s.category || '').toLowerCase().includes(q);
      const inCommand = (s.command || '').toLowerCase().includes(q);
      const inPkg = (s.packageOrRepo || '').toLowerCase().includes(q);
      const inTools = Array.isArray(s.toolsProvided) && s.toolsProvided.some(t => t.toLowerCase().includes(q));
      return inName || inDesc || inCat || inCommand || inPkg || inTools;
    });
  }, [mcpServers, searchQuery, selectedCategory]);

  const activeCount = useMemo(() => {
    return (mcpServers || []).filter(s => Boolean(s?.enabled)).length;
  }, [mcpServers]);

  // Direct Install from Secondary Official Catalog into Primary mcpServers State
  const handleInstallToMcpServers = (server: MCPServerConfig) => {
    const cleanId = server.id.startsWith('mcp-') 
      ? server.id 
      : `mcp-${server.id.replace('official-mcp-', '')}`;

    const newInstalledServer: MCPServerConfig = {
      ...server,
      id: cleanId,
      enabled: true,
      status: 'connected',
      isOfficial: true,
      env: server.env || {}
    };

    onAddCustomServer(newInstalledServer);
  };

  // Quick Install Foundation Essentials
  const handleInstallEssentials = () => {
    const essentialIds = [
      'official-mcp-github',
      'official-mcp-filesystem',
      'official-mcp-memory',
      'official-mcp-fetch'
    ];
    const toInstall = catalogServers
      .filter(s => essentialIds.includes(s.id) && !isServerInstalled(s))
      .map(s => {
        const cleanId = s.id.startsWith('mcp-') 
          ? s.id 
          : `mcp-${s.id.replace('official-mcp-', '')}`;
        return {
          ...s,
          id: cleanId,
          enabled: true,
          status: 'connected' as const,
          isOfficial: true,
          env: s.env || {}
        };
      });

    if (toInstall.length === 0) return;
    if (onBatchAddServers) {
      onBatchAddServers(toInstall);
    } else {
      toInstall.forEach(s => onAddCustomServer(s));
    }
  };

  // Export mcpServers configuration JSON for Claude Desktop, Cursor, or OpenClaw
  const handleExportMcpJson = () => {
    const exportObj: { mcpServers: Record<string, any> } = {
      mcpServers: {}
    };
    for (const server of mcpServers) {
      const key = server.id.replace(/^mcp-/, '');
      if (server.transport === 'sse' && server.url) {
        exportObj.mcpServers[key] = {
          url: server.url,
          transport: 'sse'
        };
      } else {
        exportObj.mcpServers[key] = {
          command: server.command || 'npx',
          args: server.args || [],
          env: server.env || {}
        };
      }
    }
    const jsonStr = JSON.stringify(exportObj, null, 2);
    copyToClipboard(jsonStr, 'exported-mcp-json');
  };

  // Open Configure & Install Modal
  const handleOpenConfigure = (server: MCPServerConfig) => {
    const existing = installedLookup.get(server.id) || installedLookup.get(server.packageOrRepo || '');
    setConfiguringServer(server);
    setConfiguredArgs(existing?.args ? existing.args.join(' ') : (server.args ? server.args.join(' ') : ''));
    
    const initialEnv: Record<string, string> = { ...(server.env || {}), ...(existing?.env || {}) };
    if (server.envRequirements) {
      for (const req of server.envRequirements) {
        if (!initialEnv[req.name]) {
          initialEnv[req.name] = req.defaultValue || '';
        }
      }
    }
    setConfiguredEnv(initialEnv);
    setShowSecrets({});
  };

  // Save Configured Server into mcpServers State
  const handleSaveConfiguredServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringServer) return;

    const cleanId = configuringServer.id.startsWith('mcp-') 
      ? configuringServer.id 
      : `mcp-${configuringServer.id.replace('official-mcp-', '')}`;

    const argsList = configuredArgs.split(' ').map(s => s.trim()).filter(Boolean);
    const serverToInstall: MCPServerConfig = {
      ...configuringServer,
      id: cleanId,
      args: argsList,
      env: configuredEnv,
      enabled: true,
      status: 'connected',
      isOfficial: true
    };

    onAddCustomServer(serverToInstall);
    setConfiguringServer(null);
  };

  // Parse JSON config input (Claude Desktop / Cursor / mcpservers.org standard format)
  const handleJsonInputChange = (val: string) => {
    setJsonSnippet(val);
    setJsonError(null);
    setParsedImportServers([]);

    if (!val.trim()) return;

    try {
      const parsed = JSON.parse(val);
      const serversObj = parsed.mcpServers || parsed.servers || parsed;

      if (typeof serversObj !== 'object' || serversObj === null) {
        setJsonError('Expected a JSON object containing "mcpServers" key.');
        return;
      }

      const imported: MCPServerConfig[] = [];
      for (const [key, config] of Object.entries(serversObj)) {
        if (typeof config !== 'object' || config === null) continue;
        const c = config as any;

        imported.push({
          id: `mcp-${key.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
          name: key.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Imported MCP server for ${key}`,
          transport: c.transport || (c.url ? 'sse' : 'stdio'),
          command: c.command || 'npx',
          args: Array.isArray(c.args) ? c.args : [],
          env: c.env || {},
          url: c.url,
          enabled: true,
          category: 'Imported',
          status: 'connected',
          toolsProvided: Array.isArray(c.toolsProvided) ? c.toolsProvided : ['imported_tool']
        });
      }

      if (imported.length === 0) {
        setJsonError('No valid MCP server definitions found in JSON snippet.');
      } else {
        setParsedImportServers(imported);
      }
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  // Execute Batch Import into mcpServers State
  const handleExecuteImport = () => {
    if (parsedImportServers.length === 0) return;
    if (onBatchAddServers) {
      onBatchAddServers(parsedImportServers);
    } else {
      parsedImportServers.forEach(s => onAddCustomServer(s));
    }
    setJsonSnippet('');
    setParsedImportServers([]);
    setSourceMode('installed');
  };

  // Add Manual Custom Server into mcpServers State
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;

    const newServer: MCPServerConfig = {
      id: 'mcp-custom-' + Date.now(),
      name: newServerName.trim(),
      description: 'Custom user registered MCP server',
      transport: newServerTransport,
      command: newServerTransport === 'stdio' ? (newServerCommand.trim() || 'npx') : undefined,
      args: newServerTransport === 'stdio' ? newServerArgs.split(' ').map(s => s.trim()).filter(Boolean) : undefined,
      url: newServerTransport === 'sse' ? newServerUrl.trim() : undefined,
      env: {},
      enabled: true,
      category: newServerCategory.trim() || 'Custom',
      status: 'connected',
      toolsProvided: ['custom_tool_1', 'custom_tool_2']
    };

    onAddCustomServer(newServer);
    setIsAddingCustom(false);
    setNewServerName('');
    setNewServerCommand('');
    setNewServerArgs('');
    setNewServerUrl('');
    setSourceMode('installed');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Developer Tools':
        return <Terminal className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Databases':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'System & Storage':
        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Web & Search':
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'Productivity & Finance':
        return <FileCode className="w-3.5 h-3.5 text-amber-400" />;
      case 'Communication':
        return <Code2 className="w-3.5 h-3.5 text-violet-400" />;
      case 'Cloud & Infrastructure':
        return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case 'Memory & State':
        return <Layers className="w-3.5 h-3.5 text-pink-400" />;
      case 'All':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-300" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Source Shell */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        {/* Header with Title and Source Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Server className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Model Context Protocol (MCP) Hub
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect tool providers, external APIs, and sandboxes into your active agent container runtime
            </p>
          </div>

          {/* Primary / Secondary Source Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              {/* Secondary Source: Official mcpservers.org Catalog */}
              <button
                id="mcp-source-catalog"
                onClick={() => setSourceMode('catalog')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sourceMode === 'catalog'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Secondary Source: Official mcpservers.org directory"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                <span>Secondary: mcpservers.org</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900 text-indigo-300 border border-indigo-500/20">
                  {catalogServers.length}
                </span>
              </button>

              {/* Primary Source: Active Agent mcpServers */}
              <button
                id="mcp-source-installed"
                onClick={() => setSourceMode('installed')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sourceMode === 'installed'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Primary Source: Active agent mcpServers state"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary: Active Agent</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {mcpServers.length} ({activeCount} online)
                </span>
              </button>

              {/* JSON Snippet Importer */}
              <button
                id="mcp-source-import"
                onClick={() => setSourceMode('import')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sourceMode === 'import'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Import MCP JSON snippet"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Import JSON</span>
              </button>
            </div>

            <button
              id="add-custom-mcp-btn"
              onClick={() => setIsAddingCustom(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-300" />
              <span>Custom Server</span>
            </button>
          </div>
        </div>

        {/* Source Status & Architecture Indicator Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            sourceMode === 'installed' 
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="font-bold text-white block">Primary Source: Agent Runtime</span>
                <span className="text-[11px] text-slate-400">
                  State: <code className="text-emerald-300 font-mono">mcpServers</code> ({mcpServers.length} installed, {activeCount} active in <span className="text-white font-medium">{selectedAgentId}</span>)
                </span>
              </div>
            </div>
            <button
              onClick={() => setSourceMode('installed')}
              className="text-[11px] underline font-medium hover:text-white"
            >
              View Primary
            </button>
          </div>

          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            sourceMode === 'catalog' 
              ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-300' 
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="font-bold text-white block">Secondary Source: mcpservers.org</span>
                <span className="text-[11px] text-slate-400">
                  Official registry ({catalogServers.length} verified packages ready to install into <code className="text-indigo-300 font-mono">mcpServers</code>)
                </span>
              </div>
            </div>
            <button
              onClick={() => setSourceMode('catalog')}
              className="text-[11px] underline font-medium hover:text-white"
            >
              Browse Catalog
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SOURCE 2: OFFICIAL REGISTRY (mcpservers.org/official)                     */}
        {/* ========================================================================= */}
        {sourceMode === 'catalog' && (
          <div className="space-y-5">
            {/* Secondary Source Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Secondary Source: mcpservers.org/official</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      Official Catalog
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {catalogStats.installed} / {catalogStats.total} installed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse the official Model Context Protocol catalog and install servers directly into your active <code className="text-emerald-400 font-mono">mcpServers</code> state.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-auto">
                <button
                  id="install-essentials-btn"
                  onClick={handleInstallEssentials}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 transition-all"
                  title="Quick-install GitHub, Filesystem, Memory, and Fetch MCP servers"
                >
                  <Download className="w-3 h-3" />
                  <span>Quick Install Essentials</span>
                </button>

                <a
                  href="https://mcpservers.org/official"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <span>mcpservers.org</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  onClick={handleManualRefreshCatalog}
                  disabled={isRefreshingCatalog}
                  className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title="Refresh official registry"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCatalog ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    id="mcp-catalog-search-input"
                    type="text"
                    placeholder="Search official servers by name, package (@modelcontextprotocol/...), tool (read_file, query), or vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-24 py-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-1.5 py-1 text-[11px] rounded-md bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1 transition-colors"
                        title="Clear search query"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900/80 text-slate-400 border border-slate-800/80">
                      {filteredCatalog.length} found
                    </span>
                  </div>
                </div>

                {/* Status Toggle Pills: All | Ready to Install | Installed */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setFilterInstalledStatus('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterInstalledStatus === 'all'
                        ? 'bg-slate-800 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({catalogStats.total})
                  </button>
                  <button
                    onClick={() => setFilterInstalledStatus('ready')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      filterInstalledStatus === 'ready'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Ready</span>
                    <span className="text-[10px] px-1 rounded bg-slate-900/60 text-slate-300">{catalogStats.ready}</span>
                  </button>
                  <button
                    onClick={() => setFilterInstalledStatus('installed')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      filterInstalledStatus === 'installed'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Installed</span>
                    <span className="text-[10px] px-1 rounded bg-emerald-950/60 text-emerald-300">{catalogStats.installed}</span>
                  </button>
                </div>
              </div>

              {/* Category Filter Pills using OFFICIAL_MCP_CATEGORIES */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0 pl-1 hidden md:flex">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Category:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs w-full">
                  {OFFICIAL_MCP_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = catalogCategoryCounts[cat] ?? 0;
                    return (
                      <button
                        key={cat}
                        id={`mcp-catalog-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {renderCategoryIcon(cat)}
                        <span>{cat}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSelected
                            ? 'bg-indigo-700/80 text-white'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Filter Chips / Clear Filters Bar */}
              {(selectedCategory !== 'All' || searchQuery.trim() || filterInstalledStatus !== 'all') && (
                <div className="flex items-center gap-2 text-xs bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-slate-300 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Active filters:</span>
                  {selectedCategory !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium text-[11px]">
                      {renderCategoryIcon(selectedCategory)}
                      <span>{selectedCategory}</span>
                      <button onClick={() => setSelectedCategory('All')} className="hover:text-white p-0.5" title="Clear category filter">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-[11px]">
                      <Search className="w-3 h-3 text-slate-400" />
                      <span>"{searchQuery}"</span>
                      <button onClick={() => setSearchQuery('')} className="hover:text-white p-0.5" title="Clear search query">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterInstalledStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-[11px]">
                      <span>Status: {filterInstalledStatus}</span>
                      <button onClick={() => setFilterInstalledStatus('all')} className="hover:text-white p-0.5" title="Reset status filter">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setFilterInstalledStatus('all');
                    }}
                    className="ml-auto text-indigo-400 hover:text-indigo-300 text-[11px] font-medium underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* Official Servers Grid */}
            {filteredCatalog.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Official Servers Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery 
                    ? `No official servers match "${searchQuery}".` 
                    : filterInstalledStatus === 'ready'
                    ? 'All catalog servers are currently installed in mcpServers.'
                    : filterInstalledStatus === 'installed'
                    ? 'No official servers from this category are installed in mcpServers yet.'
                    : 'No servers found matching current filters.'}
                </p>
                {(searchQuery || selectedCategory !== 'All' || filterInstalledStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setFilterInstalledStatus('all');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCatalog.map((server) => {
                  const isInstalled = isServerInstalled(server);
                  const installedConfig = getInstalledServerConfig(server);

                  return (
                    <div
                      key={server.id}
                      className={`bg-slate-950 border rounded-2xl p-5 flex flex-col justify-between transition-all group ${
                        isInstalled
                          ? 'border-emerald-500/40 bg-gradient-to-b from-slate-950 to-emerald-950/10'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/80'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Server Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                              isInstalled 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            }`}>
                              {server.category.includes('Database') ? (
                                <Database className="w-5 h-5" />
                              ) : server.category.includes('Web') ? (
                                <Globe className="w-5 h-5" />
                              ) : server.category.includes('Cloud') ? (
                                <Cpu className="w-5 h-5" />
                              ) : (
                                <Terminal className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                                  {server.name}
                                </h3>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                                  Official
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-medium text-slate-300">{server.vendor}</span>
                                <span>•</span>
                                <span className="text-slate-500">{server.category}</span>
                              </div>
                            </div>
                          </div>

                          {/* Installed State Indicator */}
                          {isInstalled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Installed in mcpServers
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {server.description}
                        </p>

                        {/* Package Command Snippet */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-indigo-300 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-slate-500">$ </span>
                            <span className="text-amber-300">{server.command}</span>
                            <span className="text-slate-300"> {server.args?.join(' ')}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`${server.command} ${server.args?.join(' ')}`, server.id)}
                            className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
                            title="Copy install command"
                          >
                            {copiedId === server.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Tools Preview */}
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-slate-500" />
                              Provided Tools ({(server.toolsProvided || []).length})
                            </span>
                            {server.docsUrl && (
                              <a
                                href={server.docsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 text-[10px] inline-flex items-center gap-1 normal-case font-normal"
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                Docs
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(server.toolsProvided || []).slice(0, 5).map((tool) => (
                              <span
                                key={tool}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800"
                              >
                                {tool}
                              </span>
                            ))}
                            {(server.toolsProvided || []).length > 5 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800">
                                +{(server.toolsProvided.length - 5)} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Required Env Keys Notice */}
                        {server.envRequirements && server.envRequirements.length > 0 && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">
                              Requires: <code className="text-amber-300 font-mono text-[10px]">{server.envRequirements.map(r => r.name).join(', ')}</code>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {server.transport.toUpperCase()}
                        </span>

                        <div className="flex items-center gap-2">
                          {isInstalled ? (
                            <>
                              <button
                                onClick={() => installedConfig && onTestServer(installedConfig.id)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1.5"
                                title="Test JSON-RPC connection"
                              >
                                <RefreshCw className="w-3 h-3 text-slate-400" />
                                <span>Ping</span>
                              </button>

                              <button
                                onClick={() => handleOpenConfigure(server)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span>Reconfigure</span>
                              </button>

                              {onDeleteServer && installedConfig && (
                                <button
                                  onClick={() => onDeleteServer(installedConfig.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors"
                                  title="Uninstall from mcpServers state"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenConfigure(server)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
                              >
                                Configure
                              </button>

                              <button
                                id={`install-mcp-${server.id}`}
                                onClick={() => handleInstallToMcpServers(server)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                                title="Install server directly into mcpServers state"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Install to mcpServers</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOURCE 1: PRIMARY SOURCE (mcpServers State)                                */}
        {/* ========================================================================= */}
        {sourceMode === 'installed' && (
          <div className="space-y-5">
            {/* OpenClaw VPS Remote Registry Bar */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                  VPS
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">OpenClaw VPS Remote MCP Endpoint</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                      https://openclawvps.io/skills/mcp
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                    <a 
                      href="https://openclawvps.io/skills" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="hover:text-cyan-300 transition-colors flex items-center gap-1"
                    >
                      https://openclawvps.io/skills
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </a>
                  </div>
                </div>
              </div>

              <button
                id="sync-openclaw-vps-mcp-btn"
                onClick={onSyncOpenClawRemote}
                disabled={isSyncingRemote}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-sm shadow-cyan-500/20 transition-all self-start sm:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRemote ? 'animate-spin' : ''}`} />
                <span>{isSyncingRemote ? 'Fetching MCP Servers...' : 'Sync OpenClaw VPS MCP'}</span>
              </button>
            </div>

            {/* Search Input, Category Filter, and Export Bar */}
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    id="mcp-installed-search-input"
                    type="text"
                    placeholder="Search installed MCP servers in mcpServers state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-24 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-1.5 py-1 text-[11px] rounded-md bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900/80 text-slate-400 border border-slate-800/80">
                      {filteredInstalled.length} / {mcpServers.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    id="export-mcp-json-btn"
                    onClick={handleExportMcpJson}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    title="Copy mcpServers JSON configuration to clipboard"
                  >
                    {copiedId === 'exported-mcp-json' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Export JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSourceMode('catalog')}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors"
                    title="Open Official mcpservers.org Catalog"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Browse Catalog</span>
                  </button>
                </div>
              </div>

              {/* Category Filter Pills for Installed Servers */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0 pl-1 hidden md:flex">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Category:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs w-full">
                  {installedCategories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = installedCategoryCounts[cat] ?? 0;
                    return (
                      <button
                        key={cat}
                        id={`mcp-installed-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {renderCategoryIcon(cat)}
                        <span>{cat}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSelected
                            ? 'bg-emerald-700/80 text-white'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Filter Chips for Installed State */}
              {(selectedCategory !== 'All' || searchQuery.trim()) && (
                <div className="flex items-center gap-2 text-xs bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-slate-300 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Active filters:</span>
                  {selectedCategory !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium text-[11px]">
                      {renderCategoryIcon(selectedCategory)}
                      <span>{selectedCategory}</span>
                      <button onClick={() => setSelectedCategory('All')} className="hover:text-white p-0.5" title="Clear category filter">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium text-[11px]">
                      <Search className="w-3 h-3 text-slate-400" />
                      <span>"{searchQuery}"</span>
                      <button onClick={() => setSearchQuery('')} className="hover:text-white p-0.5" title="Clear search query">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="ml-auto text-emerald-400 hover:text-emerald-300 text-[11px] font-medium underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Installed Servers Grid */}
            {filteredInstalled.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                <Server className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No MCP Servers Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery || selectedCategory !== 'All'
                    ? `No installed servers match your filters (${selectedCategory !== 'All' ? `Category: ${selectedCategory}` : ''}${searchQuery ? ` Query: "${searchQuery}"` : ''}).`
                    : 'The mcpServers state is empty. Open the Secondary Source (Official mcpservers.org) to install verified servers.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {(searchQuery || selectedCategory !== 'All') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    onClick={() => setSourceMode('catalog')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    Browse Official mcpservers.org Registry
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInstalled.map((server) => (
                  <div
                    key={server.id}
                    className={`bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      server.enabled ? 'border-l-4 border-l-indigo-500 shadow-md shadow-indigo-950/20' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            server.enabled
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            <Server className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-white leading-tight">
                                {server?.name || server?.id || 'MCP Server'}
                              </h3>
                              {server.isOfficial && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                                  mcpservers.org
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                {server.transport}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {server.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`test-mcp-${server.id}`}
                            onClick={() => onTestServer(server.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Test JSON-RPC handshake"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${server.status === 'testing' ? 'animate-spin text-indigo-400' : ''}`} />
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              id={`toggle-mcp-switch-${server.id}`}
                              type="checkbox"
                              checked={server.enabled}
                              onChange={() => onToggleServer(server.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {server.description}
                      </p>

                      {/* Command or URL representation */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-indigo-300 truncate">
                        {server.url ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-cyan-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 shrink-0">
                              {server.transport?.toUpperCase() || 'SSE'}
                            </span>
                            <span className="text-cyan-200 truncate">{server.url}</span>
                          </div>
                        ) : (
                          <div className="truncate">
                            <span className="text-slate-500">$ </span>
                            <span className="text-amber-300">{server.command || 'mcp-server'}</span>
                            {Array.isArray(server.args) && server.args.length > 0 && (
                              <span className="text-slate-400"> {server.args.join(' ')}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Environment variables badge */}
                      {server.env && Object.keys(server.env).length > 0 && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Env:</span>
                          <span className="font-mono text-[10px] text-slate-300">
                            {Object.keys(server.env).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Tools list */}
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-500" />
                          Tools ({(server.toolsProvided || []).length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(server.toolsProvided || []).map((tool) => (
                            <span
                              key={tool}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800"
                            >
                              {tool}
                            </span>
                          ))}
                          {(!server.toolsProvided || server.toolsProvided.length === 0) && (
                            <span className="text-[10px] text-slate-500 italic">No tools advertised</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status & Actions */}
                    <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-800 text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${
                          server.status === 'connected' ? 'bg-emerald-400' : 'bg-slate-500'
                        }`} />
                        <span>{server.status === 'connected' ? 'Ready & Bound' : 'Inactive'}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenConfigure(server)}
                          className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-medium transition-colors"
                        >
                          Settings
                        </button>

                        {onDeleteServer && (
                          <button
                            onClick={() => onDeleteServer(server.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove server from mcpServers state"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SOURCE 3: IMPORT JSON CONFIG                                              */}
        {/* ========================================================================= */}
        {sourceMode === 'import' && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  Import Model Context Protocol (MCP) JSON into mcpServers State
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste configuration snippets from <a href="https://mcpservers.org/official" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">mcpservers.org</a>, Claude Desktop (<code className="text-slate-300">claude_desktop_config.json</code>), or Cursor.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                MCP Configuration Snippet
              </label>
              <textarea
                rows={8}
                value={jsonSnippet}
                onChange={(e) => handleJsonInputChange(e.target.value)}
                placeholder={`{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}`}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-indigo-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {jsonError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            {parsedImportServers.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Detected Servers to Import into mcpServers ({parsedImportServers.length})</span>
                  <span className="text-[11px] text-emerald-400 font-normal">Valid JSON structure</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedImportServers.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          {s.command} {s.args?.join(' ')}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
                        {s.transport}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setJsonSnippet('');
                  setParsedImportServers([]);
                  setJsonError(null);
                }}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parsedImportServers.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install {parsedImportServers.length} Servers into mcpServers</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE & INSTALL OFFICIAL SERVER                              */}
      {/* ========================================================================= */}
      {configuringServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Configure {configuringServer.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {configuringServer.vendor} • {configuringServer.packageOrRepo || configuringServer.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfiguringServer(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfiguredServer} className="space-y-4">
              {/* Command & Arguments */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Execution Command
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                    {configuringServer.transport.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-xs text-amber-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {configuringServer.command || 'npx'}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Command Arguments
                  </label>
                  <input
                    type="text"
                    value={configuredArgs}
                    onChange={(e) => setConfiguredArgs(e.target.value)}
                    placeholder="Arguments separated by spaces"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    You can customize paths (e.g. workspace mount) or flags.
                  </span>
                </div>
              </div>

              {/* Environment Variables */}
              {configuringServer.envRequirements && configuringServer.envRequirements.length > 0 && (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Required Credentials & Environment Variables
                  </label>

                  {configuringServer.envRequirements.map((req) => (
                    <div key={req.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                          {req.name}
                          {req.required && (
                            <span className="text-amber-400 text-[10px]">*required</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">{req.description}</span>
                      </div>

                      <div className="relative">
                        <input
                          type={showSecrets[req.name] ? 'text' : 'password'}
                          required={req.required}
                          value={configuredEnv[req.name] || ''}
                          onChange={(e) => setConfiguredEnv(prev => ({ ...prev, [req.name]: e.target.value }))}
                          placeholder={req.placeholder || 'Enter value...'}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 pr-10 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets(prev => ({ ...prev, [req.name]: !prev[req.name] }))}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          {showSecrets[req.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfiguringServer(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save to mcpServers ({selectedAgentId})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER CUSTOM MCP SERVER                                       */}
      {/* ========================================================================= */}
      {isAddingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Register Custom MCP Server into mcpServers
              </h3>
              <button
                onClick={() => setIsAddingCustom(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Internal Tool Server"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Custom / Internal"
                    value={newServerCategory}
                    onChange={(e) => setNewServerCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Transport Protocol
                </label>
                <select
                  value={newServerTransport}
                  onChange={(e) => setNewServerTransport(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="stdio">stdio (Standard Input/Output process)</option>
                  <option value="sse">sse (Server-Sent Events HTTP endpoint)</option>
                </select>
              </div>

              {newServerTransport === 'stdio' ? (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Command / Binary
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. npx -y @modelcontextprotocol/server-postgres or uvx"
                      value={newServerCommand}
                      onChange={(e) => setNewServerCommand(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Arguments (space separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. -y @modelcontextprotocol/server-name --flag"
                      value={newServerArgs}
                      onChange={(e) => setNewServerArgs(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    SSE Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://myserver.example.com/sse"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
                >
                  Register Server into mcpServers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
