import React, { useState } from 'react';
import { 
  Server, 
  Search, 
  Plus, 
  Power, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Globe, 
  Sliders, 
  Layers, 
  Wrench,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { MCPServerConfig } from '../types';

interface MCPTabProps {
  mcpServers: MCPServerConfig[];
  onToggleServer: (serverId: string) => void;
  onTestServer: (serverId: string) => void;
  onAddCustomServer: (server: MCPServerConfig) => void;
}

export const MCPTab: React.FC<MCPTabProps> = ({
  mcpServers,
  onToggleServer,
  onTestServer,
  onAddCustomServer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingServer, setIsAddingServer] = useState(false);

  // New server form
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');
  const [newServerCategory, setNewServerCategory] = useState('Custom');
  const [newServerTransport, setNewServerTransport] = useState<'stdio' | 'sse'>('stdio');

  const filteredServers = mcpServers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.toolsProvided.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = mcpServers.filter(s => s.enabled).length;

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerCommand.trim()) return;

    const newServer: MCPServerConfig = {
      id: 'mcp-custom-' + Date.now(),
      name: newServerName.trim(),
      description: 'Custom user registered MCP server',
      transport: newServerTransport,
      command: newServerCommand.trim(),
      args: newServerArgs.split(' ').map(s => s.trim()).filter(Boolean),
      env: {},
      enabled: true,
      category: newServerCategory,
      status: 'connected',
      toolsProvided: ['custom_tool_1', 'custom_tool_2']
    };

    onAddCustomServer(newServer);
    setIsAddingServer(false);
    setNewServerName('');
    setNewServerCommand('');
    setNewServerArgs('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sleek Marketplace Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Header matching Sleek Interface specification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Model Context Protocol (MCP) Registry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Expose standardized tools, resources, and filesystem sandboxes to agent runtimes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400">
              {mcpServers.length} Total
            </span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold">
              {activeCount} Active
            </span>
            <button
              id="add-custom-mcp-btn"
              onClick={() => setIsAddingServer(true)}
              className="ml-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add MCP Server</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            id="mcp-search-input"
            type="text"
            placeholder="Search MCP servers by name, tools (read_file, sql, docker), or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Custom MCP Modal */}
        {isAddingServer && (
          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Register MCP Server
              </h3>
              <button
                onClick={() => setIsAddingServer(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddServer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Postgres DB Explorer"
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
                    placeholder="e.g. Database / DevTools"
                    value={newServerCategory}
                    onChange={(e) => setNewServerCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Command / Binary
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. npx -y @modelcontextprotocol/server-postgres"
                    value={newServerCommand}
                    onChange={(e) => setNewServerCommand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
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
                    <option value="stdio">stdio (Standard I/O)</option>
                    <option value="sse">sse (Server-Sent Events)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Arguments (space separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. postgresql://localhost/mydb --readonly"
                  value={newServerArgs}
                  onChange={(e) => setNewServerArgs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingServer(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20"
                >
                  Register Server
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MCP Servers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredServers.map((server) => (
            <div
              key={server.id}
              className={`bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-all ${
                server.enabled ? 'border-l-2 border-l-indigo-500' : 'opacity-75 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      server.enabled
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-tight">
                        {server.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800">
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
                      title="Test MCP connection ping"
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

                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {server.description}
                </p>

                {/* Command representation */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-indigo-300 truncate">
                  <span className="text-slate-500">$ </span>
                  {server.command} {server.args.join(' ')}
                </div>

                {/* Tools list */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-slate-500" />
                    Tools ({server.toolsProvided.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {server.toolsProvided.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Status */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    server.status === 'connected' ? 'bg-emerald-400' : 'bg-slate-500'
                  }`} />
                  Status: {server.status === 'connected' ? 'Connected & Ready' : 'Disconnected'}
                </span>

                <span className="text-slate-500 font-mono text-[10px]">
                  JSON-RPC 2.0
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
