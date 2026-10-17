import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Layers, 
  FolderTree, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  Maximize2, 
  Folder, 
  FileCode, 
  Info,
  CheckCircle2,
  Database,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { AgentId } from '../types';

export interface DockerPathItem {
  composeDir: string;
  composeFile: string;
  workspaceDir: string;
  enabled: boolean;
}

export interface DockerPathsTreemapProps {
  paths: Record<AgentId, DockerPathItem>;
  pathValidations: Record<string, { exists: boolean; path: string; composeFileExists: boolean; isTrusted?: boolean; isSecure?: boolean }>;
  onSelectAgent?: (agentId: AgentId) => void;
}

interface TreemapDatum {
  name: string;
  id?: string;
  path?: string;
  agentId?: AgentId;
  agentName?: string;
  type?: 'root' | 'category' | 'agent' | 'compose' | 'workspace' | 'file';
  size?: number; // Footprint in MB
  isSecure?: boolean;
  exists?: boolean;
  color?: string;
  children?: TreemapDatum[];
}

const AGENT_META: Record<AgentId, { name: string; color: string; bgClass: string; borderClass: string; workspaceSizeMb: number; composeSizeMb: number }> = {
  'hermes-agent': {
    name: 'Hermes Agent',
    color: '#38bdf8', // Sky 400
    bgClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    borderClass: 'border-sky-500/40',
    workspaceSizeMb: 1240,
    composeSizeMb: 180
  },
  'zeroclaw': {
    name: 'ZeroClaw',
    color: '#fb923c', // Orange 400
    bgClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    borderClass: 'border-orange-500/40',
    workspaceSizeMb: 860,
    composeSizeMb: 140
  },
  'openclaw': {
    name: 'OpenClaw',
    color: '#34d399', // Emerald 400
    bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/40',
    workspaceSizeMb: 620,
    composeSizeMb: 120
  },
  'picoclaw': {
    name: 'PicoClaw',
    color: '#c084fc', // Purple 400
    bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    borderClass: 'border-purple-500/40',
    workspaceSizeMb: 340,
    composeSizeMb: 90
  }
};

export const DockerPathsTreemap: React.FC<DockerPathsTreemapProps> = ({
  paths,
  pathValidations,
  onSelectAgent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [groupMode, setGroupMode] = useState<'agent' | 'hierarchy'>('agent');
  const [selectedNode, setSelectedNode] = useState<TreemapDatum | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TreemapDatum | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(containerRef.current.clientWidth, 400));
      }
    };
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build Treemap Data
  const treemapData = useMemo<TreemapDatum>(() => {
    if (groupMode === 'agent') {
      const children: TreemapDatum[] = [];

      (Object.keys(paths) as AgentId[]).forEach((agentId) => {
        const item = paths[agentId];
        const meta = AGENT_META[agentId] || {
          name: agentId,
          color: '#818cf8',
          bgClass: 'bg-indigo-500/10',
          borderClass: 'border-indigo-500/40',
          workspaceSizeMb: 500,
          composeSizeMb: 100
        };

        const validation = pathValidations[agentId];
        const isSecureCompose = /^\/(workspace|data)(\/|$)/.test(item.composeDir);
        const isSecureWorkspace = /^\/(workspace|data)(\/|$)/.test(item.workspaceDir);

        children.push({
          name: meta.name,
          id: agentId,
          agentId,
          agentName: meta.name,
          type: 'agent',
          color: meta.color,
          children: [
            {
              name: `Workspace: ${item.workspaceDir}`,
              path: item.workspaceDir,
              agentId,
              agentName: meta.name,
              type: 'workspace',
              size: meta.workspaceSizeMb,
              isSecure: isSecureWorkspace,
              exists: validation?.exists ?? true,
              color: meta.color
            },
            {
              name: `Compose Dir: ${item.composeDir}`,
              path: item.composeDir,
              agentId,
              agentName: meta.name,
              type: 'compose',
              size: meta.composeSizeMb,
              isSecure: isSecureCompose,
              exists: validation?.exists ?? true,
              color: meta.color
            },
            {
              name: `${item.composeFile}`,
              path: `${item.composeDir}/${item.composeFile}`,
              agentId,
              agentName: meta.name,
              type: 'file',
              size: 40,
              isSecure: isSecureCompose,
              exists: validation?.composeFileExists ?? true,
              color: meta.color
            }
          ]
        });
      });

      // Add Shared Core ClawDock State
      children.push({
        name: 'ClawDock Shared',
        id: 'clawdock-shared',
        type: 'agent',
        color: '#64748b',
        children: [
          {
            name: 'State & Environment (/data/clawdock)',
            path: '/data/clawdock',
            type: 'workspace',
            size: 210,
            isSecure: true,
            exists: true,
            color: '#64748b'
          }
        ]
      });

      return {
        name: 'Docker Host Mounts',
        type: 'root',
        children
      };
    } else {
      // Group by Hierarchy Roots: /workspace, /opt, /data, /var, /home
      const rootCategories: Record<string, TreemapDatum> = {
        '/workspace': {
          name: 'Secure Core (/workspace)',
          path: '/workspace',
          type: 'category',
          isSecure: true,
          color: '#10b981',
          children: []
        },
        '/opt': {
          name: 'Bot Runtimes (/opt)',
          path: '/opt',
          type: 'category',
          isSecure: false,
          color: '#3b82f6',
          children: []
        },
        '/data': {
          name: 'Shared Storage (/data)',
          path: '/data',
          type: 'category',
          isSecure: true,
          color: '#06b6d4',
          children: []
        },
        '/var': {
          name: 'System Daemon Roots (/var)',
          path: '/var',
          type: 'category',
          isSecure: false,
          color: '#f97316',
          children: []
        },
        '/home': {
          name: 'User Spaces (/home)',
          path: '/home',
          type: 'category',
          isSecure: false,
          color: '#a855f7',
          children: []
        }
      };

      (Object.keys(paths) as AgentId[]).forEach((agentId) => {
        const item = paths[agentId];
        const meta = AGENT_META[agentId];
        const validation = pathValidations[agentId];

        // Workspace
        const wsPrefix = Object.keys(rootCategories).find(r => item.workspaceDir.startsWith(r)) || '/opt';
        rootCategories[wsPrefix]?.children?.push({
          name: `${meta.name}: ${item.workspaceDir}`,
          path: item.workspaceDir,
          agentId,
          agentName: meta.name,
          type: 'workspace',
          size: meta.workspaceSizeMb,
          isSecure: /^\/(workspace|data)(\/|$)/.test(item.workspaceDir),
          exists: validation?.exists ?? true,
          color: meta.color
        });

        // Compose Dir
        const compPrefix = Object.keys(rootCategories).find(r => item.composeDir.startsWith(r)) || '/opt';
        rootCategories[compPrefix]?.children?.push({
          name: `${meta.name}: ${item.composeDir}`,
          path: item.composeDir,
          agentId,
          agentName: meta.name,
          type: 'compose',
          size: meta.composeSizeMb,
          isSecure: /^\/(workspace|data)(\/|$)/.test(item.composeDir),
          exists: validation?.exists ?? true,
          color: meta.color
        });
      });

      // Add shared persistence
      rootCategories['/data']?.children?.push({
        name: 'ClawDock: /data/clawdock',
        path: '/data/clawdock',
        type: 'workspace',
        size: 210,
        isSecure: true,
        exists: true,
        color: '#64748b'
      });

      return {
        name: 'Docker Host Mounts',
        type: 'root',
        children: Object.values(rootCategories).filter(c => c.children && c.children.length > 0)
      };
    }
  }, [paths, pathValidations, groupMode]);

  // Compute stats
  const stats = useMemo(() => {
    let totalMb = 0;
    let secureCount = 0;
    let externalCount = 0;
    let totalMounts = 0;

    (Object.keys(paths) as AgentId[]).forEach((agentId) => {
      const item = paths[agentId];
      const meta = AGENT_META[agentId];
      if (meta) {
        totalMb += meta.workspaceSizeMb + meta.composeSizeMb + 40;
      }
      totalMounts += 2; // Compose Dir + Workspace

      if (/^\/(workspace|data)(\/|$)/.test(item.composeDir)) secureCount++;
      else externalCount++;

      if (/^\/(workspace|data)(\/|$)/.test(item.workspaceDir)) secureCount++;
      else externalCount++;
    });

    totalMb += 210; // Shared state
    totalMounts += 1;
    secureCount += 1;

    return {
      totalGb: (totalMb / 1024).toFixed(2),
      totalMounts,
      secureCount,
      externalCount
    };
  }, [paths]);

  // Render D3 Treemap inside SVG
  const svgRef = useRef<SVGSVGElement>(null);
  const height = 340;

  useEffect(() => {
    if (!svgRef.current || !treemapData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const root = d3.hierarchy<TreemapDatum>(treemapData)
      .sum(d => d.size || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap<TreemapDatum>()
      .size([containerWidth, height])
      .paddingTop(groupMode === 'agent' ? 26 : 24)
      .paddingInner(4)
      .paddingOuter(3)
      .round(true);

    treemapLayout(root);

    const leaves = root.leaves() as d3.HierarchyRectangularNode<TreemapDatum>[];
    const groups = root.children as d3.HierarchyRectangularNode<TreemapDatum>[] || [];

    // Defs for gradients & filters
    const defs = svg.append('defs');
    
    // Background groups with headers
    const groupSel = svg.selectAll('g.category-group')
      .data(groups)
      .enter()
      .append('g')
      .attr('class', 'category-group');

    // Group bounding rects
    groupSel.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#0b1120')
      .attr('stroke', d => d.data.color || '#334155')
      .attr('stroke-width', 1.2)
      .attr('stroke-opacity', 0.45);

    // Group Header text
    groupSel.append('text')
      .attr('x', d => d.x0 + 8)
      .attr('y', d => d.y0 + 17)
      .attr('fill', d => d.data.color || '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .text(d => {
        const title = d.data.name;
        const availableWidth = d.x1 - d.x0 - 16;
        if (availableWidth < 60) return '';
        if (availableWidth < 120 && title.length > 14) return title.slice(0, 11) + '...';
        return title;
      });

    // Leaves / Nodes
    const leafNodes = svg.selectAll('g.leaf-node')
      .data(leaves)
      .enter()
      .append('g')
      .attr('class', 'leaf-node cursor-pointer')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.data);
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
      })
      .on('click', (event, d) => {
        setSelectedNode(d.data);
        if (d.data.agentId && onSelectAgent) {
          onSelectAgent(d.data.agentId);
        }
      });

    // Leaf rect
    leafNodes.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', d => {
        const baseColor = d.data.color || '#6366f1';
        return d.data.isSecure ? '#064e3b' : '#1e1b4b'; // emerald-950 or indigo-950
      })
      .attr('stroke', d => {
        if (selectedNode?.path === d.data.path) return '#f8fafc';
        return d.data.isSecure ? '#10b981' : d.data.color || '#6366f1';
      })
      .attr('stroke-width', d => (selectedNode?.path === d.data.path ? 2 : 1))
      .attr('stroke-opacity', d => (d.data.isSecure ? 0.7 : 0.5))
      .attr('fill-opacity', 0.65)
      .style('transition', 'all 0.2s ease');

    // Top status indicator (secure vs external dot)
    leafNodes.filter(d => (d.x1 - d.x0 > 45) && (d.y1 - d.y0 > 30))
      .append('circle')
      .attr('cx', d => Math.max(0, d.x1 - d.x0) - 8)
      .attr('cy', 8)
      .attr('r', 3)
      .attr('fill', d => (d.data.isSecure ? '#10b981' : '#f59e0b'))
      .attr('opacity', 0.9);

    // Label line 1: Name or Path
    leafNodes.filter(d => (d.x1 - d.x0 > 50) && (d.y1 - d.y0 > 24))
      .append('text')
      .attr('x', 7)
      .attr('y', 15)
      .attr('fill', '#f1f5f9')
      .attr('font-size', '10.5px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-monospace, monospace')
      .text(d => {
        const full = d.data.name;
        const widthPx = d.x1 - d.x0;
        const maxChars = Math.floor(widthPx / 7.2);
        if (full.length <= maxChars) return full;
        return full.slice(0, Math.max(3, maxChars - 2)) + '..';
      });

    // Label line 2: Footprint size
    leafNodes.filter(d => (d.x1 - d.x0 > 60) && (d.y1 - d.y0 > 42))
      .append('text')
      .attr('x', 7)
      .attr('y', 30)
      .attr('fill', d => (d.data.isSecure ? '#6ee7b7' : '#94a3b8'))
      .attr('font-size', '9.5px')
      .attr('font-mono', 'true')
      .text(d => {
        const sz = d.data.size || 0;
        const szStr = sz >= 1000 ? `${(sz / 1024).toFixed(1)} GB` : `${sz} MB`;
        return `${szStr} • ${d.data.type || 'mount'}`;
      });

  }, [treemapData, containerWidth, groupMode, selectedNode]);

  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <FolderTree className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Mounted Filesystem Treemap &amp; Storage Footprints</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                D3.js Hierarchy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive D3 treemap visualizing directory volumes, container mounts, and storage distribution across the host.
            </p>
          </div>
        </div>

        {/* View Mode & Legend Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setGroupMode('agent')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                groupMode === 'agent'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Agent
            </button>
            <button
              onClick={() => setGroupMode('hierarchy')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                groupMode === 'hierarchy'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Root Path
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Footprint Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center gap-3">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Mapped Footprint</div>
            <div className="text-xs font-bold text-white font-mono">{stats.totalGb} GB</div>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center gap-3">
          <Layers className="w-4 h-4 text-sky-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Active Mounts</div>
            <div className="text-xs font-bold text-white font-mono">{stats.totalMounts} Directories</div>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Secure (/workspace)</div>
            <div className="text-xs font-bold text-emerald-400 font-mono">{stats.secureCount} Mounts</div>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">External Host Paths</div>
            <div className="text-xs font-bold text-amber-400 font-mono">{stats.externalCount} Mounts</div>
          </div>
        </div>
      </div>

      {/* SVG Treemap Canvas */}
      <div ref={containerRef} className="w-full relative rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-950 p-2">
        <svg 
          ref={svgRef} 
          width={containerWidth} 
          height={height} 
          className="w-full block select-none"
        />

        {/* Legend Overlay at bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 border border-emerald-400"></span>
            <span>Secure (/workspace)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/80 border border-indigo-400"></span>
            <span>External Path</span>
          </div>
        </div>
      </div>

      {/* Node Inspection Details Banner */}
      {(hoveredNode || selectedNode) && (
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white text-xs">{(hoveredNode || selectedNode)?.name}</span>
                {(hoveredNode || selectedNode)?.isSecure ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> Secure Prefix
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> External Host Path
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Host Path: <span className="text-slate-200">{(hoveredNode || selectedNode)?.path || 'N/A'}</span>
                {(hoveredNode || selectedNode)?.agentName && ` • Target Agent: ${(hoveredNode || selectedNode)?.agentName}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">Estimated Footprint</div>
              <div className="text-xs font-mono font-bold text-indigo-300">
                {((hoveredNode || selectedNode)?.size || 0) >= 1000
                  ? `${(((hoveredNode || selectedNode)?.size || 0) / 1024).toFixed(2)} GB`
                  : `${(hoveredNode || selectedNode)?.size || 0} MB`}
              </div>
            </div>
            {selectedNode && (
              <button
                onClick={() => setSelectedNode(null)}
                className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
