import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  LayoutGrid, 
  Layers, 
  Search, 
  Sliders, 
  Plus, 
  Maximize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Bot, 
  Brain, 
  FileText, 
  CheckCircle2, 
  Activity, 
  Zap, 
  Cpu, 
  HardDrive, 
  ArrowRight, 
  X, 
  Info, 
  Tag, 
  ExternalLink,
  Table,
  Filter
} from 'lucide-react';
import { 
  AgentId, 
  EverOSMemoryItem, 
  EverOSMemoryType, 
  AgentTaskItem, 
  MemoryTaskRelationship 
} from '../types';
import { 
  INITIAL_EVEROS_MEMORIES, 
  INITIAL_AGENT_TASKS, 
  INITIAL_MEMORY_TASK_RELATIONSHIPS 
} from '../data/everosData';

interface EverOSRelationshipVizProps {
  memories?: EverOSMemoryItem[];
  tasks?: AgentTaskItem[];
  relationships?: MemoryTaskRelationship[];
  onSelectMemory?: (memory: EverOSMemoryItem) => void;
  onSelectTask?: (task: AgentTaskItem) => void;
}

type VizMode = 'graph' | 'treemap' | 'matrix';

// D3 Node types for simulation
interface D3GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'memory' | 'task';
  title: string;
  subtitle: string;
  categoryOrType: string;
  agentId?: AgentId | 'everos-daemon' | 'user' | 'system';
  weight: number;
  data: EverOSMemoryItem | AgentTaskItem;
  color: string;
  radius: number;
  linkCount: number;
}

interface D3GraphLink extends d3.SimulationLinkDatum<D3GraphNode> {
  id: string;
  source: string | D3GraphNode;
  target: string | D3GraphNode;
  weight: number;
  reason: string;
  accessFrequency: number;
}

export const EverOSRelationshipViz: React.FC<EverOSRelationshipVizProps> = ({
  memories = INITIAL_EVEROS_MEMORIES,
  tasks = INITIAL_AGENT_TASKS,
  relationships = INITIAL_MEMORY_TASK_RELATIONSHIPS,
  onSelectMemory,
  onSelectTask
}) => {
  const [vizMode, setVizMode] = useState<VizMode>('graph');
  const [activeRelationships, setActiveRelationships] = useState<MemoryTaskRelationship[]>(relationships);
  const [activeTasks, setActiveTasks] = useState<AgentTaskItem[]>(tasks);
  const [activeMemories, setActiveMemories] = useState<EverOSMemoryItem[]>(memories);

  // Filters & Controls
  const [minWeight, setMinWeight] = useState<number>(0.50);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [treemapGroupBy, setTreemapGroupBy] = useState<'agent' | 'type' | 'task'>('agent');
  
  // Selection drawer
  const [selectedNode, setSelectedNode] = useState<D3GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<D3GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<D3GraphLink | null>(null);

  // Simulation test state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  // SVG Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const treemapContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Color mapping helper
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fact': return '#3b82f6'; // Blue
      case 'preference': return '#a855f7'; // Purple
      case 'case': return '#f59e0b'; // Amber
      case 'skill': return '#10b981'; // Emerald
      case 'code_snippet': return '#06b6d4'; // Cyan
      default: return '#6366f1'; // Indigo
    }
  };

  const getAgentColor = (agentId?: string) => {
    switch (agentId) {
      case 'hermes-agent': return '#818cf8'; // Indigo
      case 'zeroclaw': return '#fbbf24'; // Amber
      case 'openclaw': return '#34d399'; // Emerald
      case 'picoclaw': return '#22d3ee'; // Cyan
      case 'everos-daemon': return '#c084fc'; // Purple
      default: return '#94a3b8'; // Slate
    }
  };

  // Sync state if props change
  useEffect(() => {
    if (relationships && relationships.length > 0) {
      setActiveRelationships(relationships);
    }
    if (tasks && tasks.length > 0) {
      setActiveTasks(tasks);
    }
    if (memories && memories.length > 0) {
      setActiveMemories(memories);
    }
  }, [relationships, tasks, memories]);

  // Filtered graph dataset
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // Filter relationships by weight
    const validRels = activeRelationships.filter(r => r.weight >= minWeight);

    // Filter memories
    const mems = activeMemories.filter(m => {
      if (selectedTypeFilter !== 'all' && m.type !== selectedTypeFilter) return false;
      if (selectedAgentFilter !== 'all' && m.sourceBot !== selectedAgentFilter) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.content.toLowerCase().includes(q) && !m.tags.some(t => t.toLowerCase().includes(q))) return false;
      return true;
    });

    const memIds = new Set(mems.map(m => m.id));

    // Filter tasks
    const tsks = activeTasks.filter(t => {
      if (selectedAgentFilter !== 'all' && t.agentId !== selectedAgentFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });

    const taskIds = new Set(tsks.map(t => t.id));

    // Links between remaining nodes
    const links: D3GraphLink[] = validRels
      .filter(r => memIds.has(r.memoryId) && taskIds.has(r.taskId))
      .map(r => ({
        id: r.id,
        source: r.memoryId,
        target: r.taskId,
        weight: r.weight,
        reason: r.reason,
        accessFrequency: r.accessFrequency
      }));

    // Map link counts
    const linkCountMap = new Map<string, number>();
    links.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as D3GraphNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as D3GraphNode).id;
      linkCountMap.set(s, (linkCountMap.get(s) || 0) + 1);
      linkCountMap.set(t, (linkCountMap.get(t) || 0) + 1);
    });

    // Build D3 nodes
    const memoryNodes: D3GraphNode[] = mems.map(m => ({
      id: m.id,
      type: 'memory',
      title: m.title,
      subtitle: `By ${m.sourceBot} • ${m.type}`,
      categoryOrType: m.type,
      agentId: m.sourceBot as any,
      weight: m.relevanceScore || 0.9,
      data: m,
      color: getTypeColor(m.type),
      radius: Math.max(16, Math.min(28, 14 + (m.accessCount / 10))),
      linkCount: linkCountMap.get(m.id) || 0
    }));

    const taskNodes: D3GraphNode[] = tsks.map(t => ({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: `${t.agentId} • ${t.status}`,
      categoryOrType: t.category,
      agentId: t.agentId,
      weight: t.priority === 'high' ? 0.95 : t.priority === 'medium' ? 0.8 : 0.65,
      data: t,
      color: getAgentColor(t.agentId),
      radius: Math.max(18, Math.min(30, 16 + (t.priority === 'high' ? 8 : 4))),
      linkCount: linkCountMap.get(t.id) || 0
    }));

    const nodes = [...memoryNodes, ...taskNodes];

    return { nodes, links, mems, tsks };
  }, [activeRelationships, activeMemories, activeTasks, minWeight, selectedAgentFilter, selectedTypeFilter, searchQuery]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalLinks = filteredData.links.length;
    const avgWeight = totalLinks > 0 
      ? (filteredData.links.reduce((acc, l) => acc + l.weight, 0) / totalLinks) * 100 
      : 0;
    
    // Top connection
    let topRel = activeRelationships[0];
    activeRelationships.forEach(r => {
      if (!topRel || r.weight > topRel.weight) topRel = r;
    });

    return {
      totalLinks,
      avgWeight: Math.round(avgWeight),
      totalMemories: filteredData.mems.length,
      totalTasks: filteredData.tsks.length,
      topRel
    };
  }, [filteredData, activeRelationships]);

  // =========================================================================
  // D3 FORCE-DIRECTED GRAPH RENDERER
  // =========================================================================
  useEffect(() => {
    if (vizMode !== 'graph' || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 550;

    // Root container for zoom/pan
    const g = svg.append('g').attr('class', 'graph-root');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Define gradients and filters in defs
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient for strong links
    const linkGradient = defs.append('linearGradient')
      .attr('id', 'link-gradient-high')
      .attr('gradientUnits', 'userSpaceOnUse');

    linkGradient.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6');
    linkGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981');

    // Clone data for simulation
    const simulationNodes: D3GraphNode[] = filteredData.nodes.map(d => ({ ...d }));
    const simulationLinks: D3GraphLink[] = filteredData.links.map(d => ({ ...d }));

    // Create D3 Force Simulation
    const simulation = d3.forceSimulation<D3GraphNode>(simulationNodes)
      .force('link', d3.forceLink<D3GraphNode, D3GraphLink>(simulationLinks)
        .id((d) => d.id)
        .distance((d) => 140 - (d.weight * 50)) // Stronger weight = tighter link
        .strength((d) => Math.pow(d.weight, 2))
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<D3GraphNode>().radius(d => d.radius + 28).iterations(2))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04));

    // Draw Links Container
    const linkGroup = g.append('g').attr('class', 'links');
    
    // Draw Links
    const link = linkGroup.selectAll<SVGPathElement, D3GraphLink>('.link')
      .data(simulationLinks)
      .join('path')
      .attr('class', 'link')
      .attr('stroke', d => d.weight >= 0.9 ? 'url(#link-gradient-high)' : d.weight >= 0.75 ? '#6366f1' : '#475569')
      .attr('stroke-width', d => Math.max(1.5, Math.min(5.5, d.weight * 5)))
      .attr('stroke-opacity', d => 0.25 + (d.weight * 0.55))
      .attr('fill', 'none')
      .attr('stroke-dasharray', d => d.weight >= 0.9 ? '4,3' : 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredLink(d);
        d3.select(event.currentTarget)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', (d: any) => Math.max(3, d.weight * 6.5))
          .attr('filter', 'url(#glow)');
      })
      .on('mouseleave', (event) => {
        setHoveredLink(null);
        d3.select(event.currentTarget)
          .attr('stroke-opacity', (d: any) => 0.25 + (d.weight * 0.55))
          .attr('stroke-width', (d: any) => Math.max(1.5, Math.min(5.5, d.weight * 5)))
          .attr('filter', null);
      });

    // Draw Nodes Container
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Node wrapper <g>
    const node = nodeGroup.selectAll<SVGGElement, D3GraphNode>('.node')
      .data(simulationNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab')
      .call(d3.drag<SVGGElement, D3GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          d3.select(event.sourceEvent.target).style('cursor', 'grab');
        })
      );

    // Node Outer Glow / Halo
    node.append('circle')
      .attr('r', d => d.radius + 5)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', d => d.type === 'task' ? '3,2' : 'none');

    // Node Main Body
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.type === 'task' ? '#0f172a' : '#1e1b4b')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2.5)
      .attr('filter', d => d.weight > 0.9 ? 'url(#glow)' : null);

    // Inner Glyph / Dot Indicator
    node.append('circle')
      .attr('r', d => d.type === 'task' ? 4 : 5)
      .attr('fill', d => d.color)
      .attr('opacity', 0.9);

    // Badge / Icon text for task vs memory
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 14)
      .attr('fill', '#f1f5f9')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-monospace, monospace')
      .style('pointer-events', 'none')
      .text(d => d.title.length > 20 ? d.title.substring(0, 18) + '...' : d.title);

    // Subtitle / Type label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 25)
      .attr('fill', '#94a3b8')
      .attr('font-size', '8.5px')
      .attr('font-family', 'ui-monospace, monospace')
      .style('pointer-events', 'none')
      .text(d => d.type === 'task' ? `[Task: ${d.agentId}]` : `[${d.categoryOrType}]`);

    // Interactive Hover & Click
    node.on('mouseenter', (event, d) => {
      setHoveredNode(d);

      // Highlight connected edges and nodes
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(d.id);

      link.each(function(l) {
        const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        if (sourceId === d.id || targetId === d.id) {
          connectedNodeIds.add(sourceId);
          connectedNodeIds.add(targetId);
          d3.select(this)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 4)
            .attr('stroke', '#38bdf8');
        } else {
          d3.select(this).attr('stroke-opacity', 0.08);
        }
      });

      node.each(function(n) {
        if (!connectedNodeIds.has(n.id)) {
          d3.select(this).attr('opacity', 0.2);
        } else {
          d3.select(this).attr('opacity', 1);
        }
      });
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);
      link.attr('stroke-opacity', d => 0.25 + (d.weight * 0.55))
        .attr('stroke-width', d => Math.max(1.5, Math.min(5.5, d.weight * 5)))
        .attr('stroke', d => d.weight >= 0.9 ? 'url(#link-gradient-high)' : d.weight >= 0.75 ? '#6366f1' : '#475569');
      node.attr('opacity', 1);
    });

    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      if (d.type === 'memory' && onSelectMemory) {
        onSelectMemory(d.data as EverOSMemoryItem);
      } else if (d.type === 'task' && onSelectTask) {
        onSelectTask(d.data as AgentTaskItem);
      }
    });

    // Tick updates for force physics
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const s = d.source as D3GraphNode;
        const t = d.target as D3GraphNode;
        if (!s.x || !s.y || !t.x || !t.y) return '';
        
        // Slight curved arc
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${s.x},${s.y}A${dr},${dr} 0 0,1 ${t.x},${t.y}`;
      });

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [vizMode, filteredData, onSelectMemory, onSelectTask]);

  // =========================================================================
  // D3 TREEMAP RENDERER
  // =========================================================================
  useEffect(() => {
    if (vizMode !== 'treemap' || !treemapContainerRef.current) return;

    const container = treemapContainerRef.current;
    container.innerHTML = ''; // clear

    const width = container.clientWidth || 800;
    const height = 550;

    // Build hierarchical tree structure
    interface HierarchyDatum {
      name: string;
      id?: string;
      type?: 'root' | 'group' | 'memory' | 'task_leaf';
      weight?: number;
      reason?: string;
      agentId?: string;
      category?: string;
      children?: HierarchyDatum[];
      data?: any;
    }

    const rootData: HierarchyDatum = {
      name: 'EverOS Memory & Task Hierarchy',
      type: 'root',
      children: []
    };

    if (treemapGroupBy === 'agent') {
      // Group by Agent -> Memory -> Tasks
      const agentMap = new Map<string, HierarchyDatum>();

      filteredData.links.forEach(link => {
        const mem = filteredData.mems.find(m => m.id === (typeof link.source === 'string' ? link.source : (link.source as any).id));
        const task = filteredData.tsks.find(t => t.id === (typeof link.target === 'string' ? link.target : (link.target as any).id));
        if (!mem || !task) return;

        const agentKey = task.agentId || 'global';
        if (!agentMap.has(agentKey)) {
          agentMap.set(agentKey, {
            name: `Agent: ${agentKey}`,
            type: 'group',
            agentId: agentKey,
            children: []
          });
        }

        const agentGroup = agentMap.get(agentKey)!;
        let memGroup = agentGroup.children?.find(c => c.id === mem.id);
        if (!memGroup) {
          memGroup = {
            name: mem.title,
            id: mem.id,
            type: 'memory',
            category: mem.type,
            data: mem,
            children: []
          };
          agentGroup.children?.push(memGroup);
        }

        memGroup.children?.push({
          name: task.title,
          id: `${mem.id}-${task.id}`,
          type: 'task_leaf',
          weight: Math.round(link.weight * 100),
          reason: link.reason,
          data: { mem, task, link }
        });
      });

      rootData.children = Array.from(agentMap.values());
    } else if (treemapGroupBy === 'type') {
      // Group by Memory Type -> Memory -> Tasks
      const typeMap = new Map<string, HierarchyDatum>();

      filteredData.links.forEach(link => {
        const mem = filteredData.mems.find(m => m.id === (typeof link.source === 'string' ? link.source : (link.source as any).id));
        const task = filteredData.tsks.find(t => t.id === (typeof link.target === 'string' ? link.target : (link.target as any).id));
        if (!mem || !task) return;

        const typeKey = mem.type;
        if (!typeMap.has(typeKey)) {
          typeMap.set(typeKey, {
            name: `Type: ${typeKey.toUpperCase()}`,
            type: 'group',
            category: typeKey,
            children: []
          });
        }

        const typeGroup = typeMap.get(typeKey)!;
        let memGroup = typeGroup.children?.find(c => c.id === mem.id);
        if (!memGroup) {
          memGroup = {
            name: mem.title,
            id: mem.id,
            type: 'memory',
            category: mem.type,
            data: mem,
            children: []
          };
          typeGroup.children?.push(memGroup);
        }

        memGroup.children?.push({
          name: task.title,
          id: `${mem.id}-${task.id}`,
          type: 'task_leaf',
          weight: Math.round(link.weight * 100),
          reason: link.reason,
          data: { mem, task, link }
        });
      });

      rootData.children = Array.from(typeMap.values());
    } else {
      // Group by Active Task -> Linked Memories
      const taskMap = new Map<string, HierarchyDatum>();

      filteredData.links.forEach(link => {
        const mem = filteredData.mems.find(m => m.id === (typeof link.source === 'string' ? link.source : (link.source as any).id));
        const task = filteredData.tsks.find(t => t.id === (typeof link.target === 'string' ? link.target : (link.target as any).id));
        if (!mem || !task) return;

        const taskKey = task.id;
        if (!taskMap.has(taskKey)) {
          taskMap.set(taskKey, {
            name: task.title,
            id: task.id,
            type: 'group',
            agentId: task.agentId,
            data: task,
            children: []
          });
        }

        const taskGroup = taskMap.get(taskKey)!;
        taskGroup.children?.push({
          name: mem.title,
          id: `${task.id}-${mem.id}`,
          type: 'task_leaf',
          weight: Math.round(link.weight * 100),
          reason: link.reason,
          data: { mem, task, link }
        });
      });

      rootData.children = Array.from(taskMap.values());
    }

    // If empty or no links
    if (!rootData.children || rootData.children.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[450px] text-slate-500 text-xs">
          <p>No matching memory-task relationships found for the current threshold (${Math.round(minWeight * 100)}%).</p>
          <p class="mt-1">Try lowering the relationship weight slider above.</p>
        </div>
      `;
      return;
    }

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'rounded-2xl border border-slate-800 bg-slate-950 font-mono');

    const hierarchyRoot = d3.hierarchy<HierarchyDatum>(rootData)
      .sum(d => d.weight || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap<HierarchyDatum>()
      .size([width, height])
      .paddingTop(24)
      .paddingRight(6)
      .paddingInner(4)
      .round(true);

    treemapLayout(hierarchyRoot);
    const rectRoot = hierarchyRoot as unknown as d3.HierarchyRectangularNode<HierarchyDatum>;

    // Group containers
    const groups = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<HierarchyDatum>>('.group-node')
      .data(rectRoot.descendants().filter(d => d.depth === 1))
      .join('g')
      .attr('class', 'group-node');

    groups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', '#090d16')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1.5)
      .attr('rx', 8);

    groups.append('text')
      .attr('x', d => d.x0 + 8)
      .attr('y', d => d.y0 + 16)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => d.data.name);

    // Leaf nodes (tasks / memories)
    const leaves = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<HierarchyDatum>>('.leaf-node')
      .data(rectRoot.leaves())
      .join('g')
      .attr('class', 'leaf-node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Tile Rect
    leaves.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const w = (d.data.weight || 50) / 100;
        if (w >= 0.90) return '#064e3b'; // Emerald
        if (w >= 0.80) return '#1e1b4b'; // Indigo
        if (w >= 0.70) return '#1e293b'; // Slate
        return '#312e81';
      })
      .attr('stroke', d => {
        const w = (d.data.weight || 50) / 100;
        if (w >= 0.90) return '#10b981';
        if (w >= 0.80) return '#818cf8';
        return '#475569';
      })
      .attr('stroke-width', 1)
      .attr('rx', 6)
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 2.5)
          .attr('stroke', '#38bdf8');
      })
      .on('mouseleave', function(event, d) {
        const w = (d.data.weight || 50) / 100;
        d3.select(this)
          .attr('stroke-width', 1)
          .attr('stroke', w >= 0.90 ? '#10b981' : w >= 0.80 ? '#818cf8' : '#475569');
      })
      .on('click', (event, d) => {
        if (d.data.data) {
          const { mem, task, link } = d.data.data;
          setSelectedNode({
            id: mem.id,
            type: 'memory',
            title: mem.title,
            subtitle: `Connected to task: ${task.title}`,
            categoryOrType: mem.type,
            agentId: task.agentId,
            weight: link.weight,
            data: mem,
            color: getTypeColor(mem.type),
            radius: 20,
            linkCount: 1
          });
        }
      });

    // Leaf Title Text
    leaves.append('text')
      .attr('x', 6)
      .attr('y', 15)
      .attr('fill', '#ffffff')
      .attr('font-size', '9.5px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')
      .text(d => {
        const boxWidth = d.x1 - d.x0;
        if (boxWidth < 50) return '';
        const name = d.data.name;
        const maxChars = Math.floor(boxWidth / 7);
        return name.length > maxChars ? name.substring(0, maxChars - 3) + '...' : name;
      });

    // Weight Badge
    leaves.append('text')
      .attr('x', 6)
      .attr('y', 28)
      .attr('fill', '#38bdf8')
      .attr('font-size', '8.5px')
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .text(d => {
        const boxWidth = d.x1 - d.x0;
        if (boxWidth < 60) return '';
        return `${d.data.weight || 0}% weight`;
      });

  }, [vizMode, filteredData, treemapGroupBy, minWeight]);

  // Zoom controls for D3 Force graph
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Trigger simulated memory reinforcement test
  const handleSimulateReinforcement = () => {
    setIsSimulating(true);
    setSimulationToast(null);

    setTimeout(() => {
      // Pick a random relationship and boost weight or add a new link
      const updated = activeRelationships.map(r => {
        if (r.id === 'rel-05' || r.id === 'rel-01' || r.id === 'rel-07') {
          return {
            ...r,
            weight: Math.min(0.99, parseFloat((r.weight + 0.05).toFixed(2))),
            accessFrequency: r.accessFrequency + 5,
            lastReinforced: 'Just now (mRAG trigger)'
          };
        }
        return r;
      });

      setActiveRelationships(updated);
      setIsSimulating(false);
      setSimulationToast('Simulated real-time mRAG memory recall: Reinforced 3 relationship links (+5% weight affinity)!');
      setTimeout(() => setSimulationToast(null), 5000);
    }, 800);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ==================================================================== */}
      {/* 1. VISUALIZATION HEADER & CONTROL BAR                                */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                EverOS Memory &amp; Task Relationship Topology
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  D3.js Live Physics
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Interactive force-directed graph and hierarchical treemap visualizing real-time contextual affinity weights connecting stored EverOS Markdown memory chunks to active autonomous agent tasks.
            </p>
          </div>

          {/* Mode Switcher & Simulation Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                id="viz-mode-graph"
                onClick={() => setVizMode('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  vizMode === 'graph'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                Force Graph
              </button>

              <button
                id="viz-mode-treemap"
                onClick={() => setVizMode('treemap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  vizMode === 'treemap'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Treemap Hierarchy
              </button>

              <button
                id="viz-mode-matrix"
                onClick={() => setVizMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  vizMode === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Affinity Matrix
              </button>
            </div>

            <button
              id="simulate-reinforcement-btn"
              onClick={handleSimulateReinforcement}
              disabled={isSimulating}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Reinforcing...' : 'Simulate Memory Pulse'}
            </button>
          </div>
        </div>

        {/* Real-time Ticker Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              Active Linkages:
            </span>
            <span className="font-mono font-bold text-white text-xs">{metrics.totalLinks}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Mean Weight Affinity:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-xs">{metrics.avgWeight}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              Memory Chunks:
            </span>
            <span className="font-mono font-bold text-purple-300 text-xs">{metrics.totalMemories}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Active Tasks:
            </span>
            <span className="font-mono font-bold text-cyan-300 text-xs">{metrics.totalTasks}</span>
          </div>
        </div>

        {/* Simulation Notification */}
        {simulationToast && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simulationToast}</span>
          </div>
        )}

        {/* Controls, Sliders & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Search bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search memories or tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Weight Threshold Slider */}
          <div className="md:col-span-4 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
              <Sliders className="w-3 h-3 text-indigo-400" />
              Min Weight: <strong className="text-indigo-300 font-mono">{Math.round(minWeight * 100)}%</strong>
            </span>
            <input
              type="range"
              min="0.0"
              max="0.95"
              step="0.05"
              value={minWeight}
              onChange={(e) => setMinWeight(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Agent Filter Select */}
          <div className="md:col-span-2">
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="all">All Agents</option>
              <option value="hermes-agent">Hermes Agent</option>
              <option value="zeroclaw">ZeroClaw</option>
              <option value="openclaw">OpenClaw</option>
              <option value="picoclaw">PicoClaw</option>
              <option value="everos-daemon">EverOS Daemon</option>
            </select>
          </div>

          {/* Type Filter Select */}
          <div className="md:col-span-2">
            {vizMode === 'treemap' ? (
              <select
                value={treemapGroupBy}
                onChange={(e) => setTreemapGroupBy(e.target.value as any)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-indigo-300 text-xs focus:outline-none font-mono"
              >
                <option value="agent">Group by Agent</option>
                <option value="type">Group by Type</option>
                <option value="task">Group by Task</option>
              </select>
            ) : (
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">All Memory Types</option>
                <option value="fact">Facts</option>
                <option value="preference">Preferences</option>
                <option value="case">Cases</option>
                <option value="skill">Skills</option>
                <option value="code_snippet">Code Snippets</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN VISUALIZATION CANVAS & SIDE INSPECTOR                         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Canvas / Chart Area */}
        <div className={`space-y-3 ${selectedNode ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {vizMode === 'graph' && (
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl h-[560px]">
              {/* D3 SVG Canvas */}
              <svg
                ref={svgRef}
                className="w-full h-full select-none"
              />

              {/* Floating Graph Toolbar */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md p-1.5 rounded-xl shadow-lg">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Reset Zoom & Pan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Legend */}
              <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[10px] space-y-2 max-w-sm hidden sm:block">
                <div className="font-bold text-slate-300 font-mono">Legend &amp; Node Semantics:</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Fact Memory
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Skill / Case
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> User Preference
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Code Snippet
                  </span>
                  <span className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-slate-800 text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-md border-2 border-indigo-400 bg-slate-900"></span> Active Task Node (Border color = Agent)
                  </span>
                </div>
              </div>

              {/* Hover Tooltip Overlay */}
              {hoveredNode && (
                <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-900/95 border border-indigo-500/40 backdrop-blur-md shadow-xl text-xs space-y-1 font-mono max-w-xs animate-fadeIn pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-indigo-400">
                    {hoveredNode.type === 'task' ? `[Autonomous Task: ${hoveredNode.agentId}]` : `[Memory Chunk: ${hoveredNode.categoryOrType}]`}
                  </div>
                  <div className="font-bold text-white text-xs">{hoveredNode.title}</div>
                  <div className="text-[11px] text-slate-300">{hoveredNode.subtitle}</div>
                  <div className="text-[10px] text-emerald-400 pt-1">
                    Connected to {hoveredNode.linkCount} items • Click for full inspection
                  </div>
                </div>
              )}

              {hoveredLink && (
                <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-900/95 border border-emerald-500/40 backdrop-blur-md shadow-xl text-xs space-y-1 font-mono max-w-sm animate-fadeIn pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">
                    Relationship Affinity: {Math.round(hoveredLink.weight * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-200">{hoveredLink.reason}</div>
                  <div className="text-[10px] text-slate-400">
                    Access frequency: {hoveredLink.accessFrequency} calls
                  </div>
                </div>
              )}
            </div>
          )}

          {vizMode === 'treemap' && (
            <div className="space-y-2">
              <div 
                ref={treemapContainerRef}
                className="w-full min-h-[550px]"
              />
            </div>
          )}

          {vizMode === 'matrix' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-400" />
                  Memory &harr; Task Relationship Affinity Matrix ({filteredData.links.length} Active Linkages)
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Sorted by weight coefficient
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3">Memory Chunk</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Target Agent Task</th>
                      <th className="py-2.5 px-3">Agent</th>
                      <th className="py-2.5 px-3">Relationship Weight</th>
                      <th className="py-2.5 px-3">Reason / Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredData.links.map((link) => {
                      const mem = filteredData.mems.find(m => m.id === (typeof link.source === 'string' ? link.source : (link.source as any).id));
                      const task = filteredData.tsks.find(t => t.id === (typeof link.target === 'string' ? link.target : (link.target as any).id));
                      if (!mem || !task) return null;

                      const weightPct = Math.round(link.weight * 100);

                      return (
                        <tr 
                          key={link.id}
                          onClick={() => {
                            setSelectedNode({
                              id: mem.id,
                              type: 'memory',
                              title: mem.title,
                              subtitle: `Connected to task: ${task.title}`,
                              categoryOrType: mem.type,
                              agentId: task.agentId,
                              weight: link.weight,
                              data: mem,
                              color: getTypeColor(mem.type),
                              radius: 20,
                              linkCount: 1
                            });
                          }}
                          className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 text-white font-semibold line-clamp-1 max-w-[200px]">{mem.title}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                              {mem.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 line-clamp-1 max-w-[220px]">{task.title}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {task.agentId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                                  style={{ width: `${weightPct}%` }}
                                />
                              </div>
                              <span className="font-bold text-emerald-400 text-[11px]">{weightPct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[260px] truncate">{link.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* 3. SIDE NODE INSPECTOR DRAWER                                        */}
        {/* ==================================================================== */}
        {selectedNode && (
          <div className="lg:col-span-4 p-5 rounded-2xl border border-indigo-500/40 bg-slate-900/95 backdrop-blur-md shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block">
                  {selectedNode.type === 'memory' ? `Memory Chunk (${selectedNode.categoryOrType})` : `Autonomous Agent Task`}
                </span>
                <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                <div className="text-[11px] font-mono text-slate-400">
                  {selectedNode.subtitle}
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Memory node selected */}
            {selectedNode.type === 'memory' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px]">Storage File:</div>
                  <div className="text-indigo-300 text-[11px] break-all">
                    {(selectedNode.data as EverOSMemoryItem).filePath}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                  {(selectedNode.data as EverOSMemoryItem).content}
                </div>

                {/* Connected active tasks */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 font-mono flex items-center justify-between">
                    <span>Connected Agent Tasks:</span>
                    <span className="text-indigo-400 text-[11px]">Relationship Weight</span>
                  </div>

                  {activeRelationships
                    .filter(r => r.memoryId === selectedNode.id)
                    .map(rel => {
                      const t = activeTasks.find(task => task.id === rel.taskId);
                      if (!t) return null;
                      return (
                        <div key={rel.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px]">{t.title}</span>
                            <span className="text-emerald-400 font-bold">{Math.round(rel.weight * 100)}%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">{rel.reason}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* If Task node selected */}
            {selectedNode.type === 'task' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px]">Task Description:</div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {(selectedNode.data as AgentTaskItem).description}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span>Status: <strong className="text-emerald-400">{(selectedNode.data as AgentTaskItem).status}</strong></span>
                    <span>&bull;</span>
                    <span>Started: {(selectedNode.data as AgentTaskItem).startedAt}</span>
                  </div>
                </div>

                {/* Connected memory chunks */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 font-mono flex items-center justify-between">
                    <span>Associated Memory Chunks:</span>
                    <span className="text-indigo-400 text-[11px]">Affinity</span>
                  </div>

                  {activeRelationships
                    .filter(r => r.taskId === selectedNode.id)
                    .map(rel => {
                      const m = activeMemories.find(mem => mem.id === rel.memoryId);
                      if (!m) return null;
                      return (
                        <div key={rel.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px] line-clamp-1">{m.title}</span>
                            <span className="text-emerald-400 font-bold">{Math.round(rel.weight * 100)}%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">{rel.reason}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
