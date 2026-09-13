/**
 * Visual Canvas: Full Workflow Canvas with React Flow
 * Section 8.2 of Technical Specification.
 * Implements interactive canvas, draggable nodes palette, edge connections,
 * undo/redo, real-time execution highlighting, and node drawer.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import {
  Play,
  RotateCcw,
  RotateCw,
  Plus,
  Save,
  Check,
  Loader2,
  Sliders,
  Webhook,
  Clock,
  Globe,
  Share2,
  Code2,
  GitBranch,
  LayoutGrid,
  Copy,
  Download,
  Upload,
  Search,
} from 'lucide-react';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  WorkflowExecution,
  IntegrationCredential,
} from '../../engine/types';
import { CustomNode } from './CustomNode';
import { NodeDrawer } from './NodeDrawer';
import { executeWorkflow } from '../../engine/engine';
import { db } from '../../storage/db';

interface WorkflowCanvasProps {
  workflow: Workflow;
  credentials: IntegrationCredential[];
  onSaveWorkflow: (workflow: Workflow) => void;
  onExecutionComplete?: (execution: WorkflowExecution) => void;
}

const PALETTE_ITEMS: {
  type: NodeType;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { type: 'webhook', label: 'Webhook', category: 'Trigger', icon: Webhook, color: 'text-zinc-300' },
  { type: 'schedule', label: 'Schedule (Cron)', category: 'Trigger', icon: Clock, color: 'text-zinc-300' },
  { type: 'manual', label: 'Manual Trigger', category: 'Trigger', icon: Play, color: 'text-zinc-300' },
  { type: 'http_request', label: 'HTTP Request', category: 'Action', icon: Globe, color: 'text-zinc-300' },
  { type: 'unified_api', label: 'Unified API', category: 'Action', icon: Share2, color: 'text-zinc-300' },
  { type: 'code_runner', label: 'Code Runner', category: 'Logic', icon: Code2, color: 'text-zinc-300' },
  { type: 'if_else', label: 'If / Else', category: 'Logic', icon: GitBranch, color: 'text-zinc-300' },
  { type: 'set_fields', label: 'Set Fields', category: 'Data', icon: Sliders, color: 'text-zinc-300' },
];

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  credentials,
  onSaveWorkflow,
  onExecutionComplete,
}) => {
  // Convert workflow nodes/edges to React Flow format
  const initialNodes = useMemo(() => {
    return workflow.nodes.map((n) => ({
      ...n,
      type: 'customNode',
    })) as Node[];
  }, [workflow.nodes]);

  const initialEdges = useMemo(() => {
    return workflow.edges.map((e) => ({
      ...e,
      animated: true,
      style: { stroke: '#475569', strokeWidth: 2 },
    })) as Edge[];
  }, [workflow.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo / Redo history stacks
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHist.push({ nodes: newNodes, edges: newEdges });
    historyRef.current = currentHist;
    historyIndexRef.current = currentHist.length - 1;
  }, []);

  // Initialize history on mount
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [{ nodes: initialNodes, edges: initialEdges }];
      historyIndexRef.current = 0;
    }
  }, [initialNodes, initialEdges]);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  };

  // Auto-Layout: Organizes nodes hierarchically from left to right
  const handleAutoLayout = () => {
    if (nodes.length === 0) return;

    // Calculate in-degree for each node
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    edges.forEach((e) => {
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target] += 1;
      }
      if (adj[e.source]) {
        adj[e.source].push(e.target);
      }
    });

    // Level assignment (BFS from root nodes)
    const levels: Record<string, number> = {};
    const queue: string[] = [];

    nodes.forEach((n) => {
      if ((inDegree[n.id] || 0) === 0) {
        levels[n.id] = 0;
        queue.push(n.id);
      }
    });

    // If cycle or no roots, default start with first
    if (queue.length === 0 && nodes.length > 0) {
      levels[nodes[0].id] = 0;
      queue.push(nodes[0].id);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levels[curr] || 0;
      const neighbors = adj[curr] || [];
      neighbors.forEach((nbr) => {
        if (levels[nbr] === undefined || levels[nbr] < currLevel + 1) {
          levels[nbr] = currLevel + 1;
          queue.push(nbr);
        }
      });
    }

    // Group nodes by level
    const levelGroups: Record<number, Node[]> = {};
    nodes.forEach((n) => {
      const lvl = levels[n.id] || 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(n);
    });

    // Compute coordinate positions
    const HORIZONTAL_SPACING = 320;
    const VERTICAL_SPACING = 160;
    const START_X = 80;
    const START_Y = 120;

    const newNodes = nodes.map((n) => {
      const lvl = levels[n.id] || 0;
      const group = levelGroups[lvl] || [n];
      const indexInGroup = group.findIndex((gn) => gn.id === n.id);
      const totalInGroup = group.length;
      const yOffset = ((totalInGroup - 1) * VERTICAL_SPACING) / 2;

      return {
        ...n,
        position: {
          x: START_X + lvl * HORIZONTAL_SPACING,
          y: START_Y + indexInGroup * VERTICAL_SPACING - yOffset + 100,
        },
      };
    });

    setNodes(newNodes);
    pushHistory(newNodes, edges);
    setExecutionMessage('Layout reorganizado automaticamente!');
    setTimeout(() => setExecutionMessage(null), 2500);
  };

  // Duplicate Selected Node
  const handleDuplicateSelectedNode = () => {
    if (!selectedNodeId) return;
    const target = nodes.find((n) => n.id === selectedNodeId);
    if (!target) return;

    const newId = `${target.data.type}_${Date.now().toString(36)}`;
    const clonedNode: Node = {
      ...target,
      id: newId,
      position: {
        x: target.position.x + 40,
        y: target.position.y + 40,
      },
      data: {
        ...target.data,
        label: `${target.data.label} (Cópia)`,
      },
    };

    setNodes((nds) => {
      const next = [...nds, clonedNode];
      pushHistory(next, edges);
      return next;
    });
    setSelectedNodeId(newId);
    setExecutionMessage('Nó duplicado com sucesso!');
    setTimeout(() => setExecutionMessage(null), 2000);
  };

  // Export Workflow JSON
  const handleExportWorkflowJson = () => {
    const data = {
      workflow: {
        ...workflow,
        nodes: nodes as unknown as WorkflowNode[],
        edges: edges as unknown as WorkflowEdge[],
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Workflow JSON
  const handleImportWorkflowJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedWorkflow = parsed.workflow || parsed;
        if (Array.isArray(importedWorkflow.nodes)) {
          const formattedNodes = importedWorkflow.nodes.map((n: any) => ({
            ...n,
            type: 'customNode',
          }));
          const formattedEdges = (importedWorkflow.edges || []).map((edge: any) => ({
            ...edge,
            animated: true,
            style: { stroke: edge.sourceHandle === 'false' ? '#ef4444' : '#3b82f6', strokeWidth: 2 },
          }));

          setNodes(formattedNodes);
          setEdges(formattedEdges);
          pushHistory(formattedNodes, formattedEdges);
          setExecutionMessage('Workflow importado com sucesso!');
          setTimeout(() => setExecutionMessage(null), 2500);
        }
      } catch (err: any) {
        setExecutionMessage('Erro ao importar JSON: arquivo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const edgeToAdd: Edge = {
          ...params,
          id: `edge_${params.source}_${params.target}_${Date.now()}`,
          animated: true,
          style: { stroke: params.sourceHandle === 'false' ? '#ef4444' : '#3b82f6', strokeWidth: 2 },
          label: params.sourceHandle === 'true' ? 'True' : params.sourceHandle === 'false' ? 'False' : undefined,
        };
        const updated = addEdge(edgeToAdd, eds);
        pushHistory(nodes, updated);
        return updated;
      });
    },
    [nodes, pushHistory, setEdges]
  );

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  const handleNodeClick = (_: any, clickedNode: Node) => {
    setSelectedNodeId(clickedNode.id);
  };

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) as unknown as WorkflowNode | undefined;
  }, [nodes, selectedNodeId]);

  const handleUpdateNode = (updated: WorkflowNode) => {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === updated.id ? { ...updated, type: 'customNode' } : n));
      pushHistory(next, edges);
      return next;
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => {
      const nextNodes = nds.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      setEdges(nextEdges);
      pushHistory(nextNodes, nextEdges);
      return nextNodes;
    });
    setSelectedNodeId(null);
  };

  // Add node from palette
  const handleAddNode = (type: NodeType) => {
    const id = `${type}_${Date.now().toString(36)}`;
    const meta = PALETTE_ITEMS.find((p) => p.type === type);

    // Initial node positioning
    const x = 200 + (nodes.length % 3) * 220;
    const y = 150 + Math.floor(nodes.length / 3) * 160;

    const newNode: Node = {
      id,
      type: 'customNode',
      position: { x, y },
      data: {
        label: meta ? meta.label : type,
        type,
        config: {},
        isValidConfig: true,
      },
    };

    setNodes((nds) => {
      const next = [...nds, newNode];
      pushHistory(next, edges);
      return next;
    });
    setSelectedNodeId(id);
    setShowPalette(false);
  };

  // Save workflow changes
  const handleSave = () => {
    const updated: Workflow = {
      ...workflow,
      nodes: nodes as unknown as WorkflowNode[],
      edges: edges as unknown as WorkflowEdge[],
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkflow(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Section 8.4: "Test Workflow" / "Run Now" with real-time node highlighting
  const handleRunNow = async () => {
    setIsExecuting(true);
    setExecutionMessage('Iniciando execução de teste...');

    // Reset status on all nodes
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          executionStatus: undefined,
          lastOutputPreview: undefined,
          lastErrorPreview: undefined,
        },
      }))
    );

    const currentWf: Workflow = {
      ...workflow,
      nodes: nodes as unknown as WorkflowNode[],
      edges: edges as unknown as WorkflowEdge[],
    };

    try {
      // Find manual or trigger node
      const manualNode = currentWf.nodes.find((n) => n.data.type === 'manual');
      let triggerPayload = { source: 'Run Now UI', timestamp: new Date().toISOString() };
      if (manualNode?.data.config?.testPayload) {
        try {
          triggerPayload = JSON.parse(manualNode.data.config.testPayload);
        } catch {
          // ignore
        }
      }

      const execution = await executeWorkflow(currentWf, 'MANUAL', triggerPayload, {
        getCredential: async (id) => {
          const c = credentials.find((cred) => cred.id === id);
          return c ? { id: c.id, providerName: c.providerName, data: {} } : null;
        },
        onNodeProgress: (nodeId, status, _input, output, error) => {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    executionStatus: status,
                    lastOutputPreview: output || n.data.lastOutputPreview,
                    lastErrorPreview: error || n.data.lastErrorPreview,
                  },
                };
              }
              return n;
            })
          );
        },
      });

      // Save execution to database
      db.saveExecution(execution);
      onExecutionComplete?.(execution);

      if (execution.status === 'SUCCESS') {
        setExecutionMessage(`Executado com Sucesso em ${execution.executionTimeMs}ms!`);
      } else {
        setExecutionMessage(`Falha na Execução: ${execution.errorMessage || 'Erro nos nós'}`);
      }
    } catch (err: any) {
      setExecutionMessage(`Erro fatal: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-zinc-950">
      {/* React Flow Viewport */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-[#0a0a0a] !border-[#141414] !fill-zinc-400 !text-zinc-400 rounded-[6px] overflow-hidden shadow-xl" />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(9, 9, 11, 0.8)"
            className="!bg-[#0a0a0a] !border-[#141414] rounded-[6px] overflow-hidden shadow-xl"
          />

          {/* Top Floating Action Bar */}
          <Panel position="top-left" className="m-3">
            <div
              style={{ backgroundColor: '#0a0a0a' }}
              className="flex items-center gap-1.5 border border-[#171717] p-1 rounded-[6px] shadow-xl"
            >
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Nó</span>
              </button>

              <div className="h-4 w-px bg-[#171717]" />

              <button
                onClick={handleRunNow}
                disabled={isExecuting}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isExecuting ? 'Executando...' : 'Run Now'}</span>
              </button>

              <div className="h-4 w-px bg-[#171717]" />

              <button
                onClick={handleUndo}
                title="Desfazer (Ctrl+Z)"
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                title="Refazer (Ctrl+Shift+Z)"
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[#171717]" />

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[6px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-zinc-200 transition-colors"
              >
                {saveSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>{saveSuccess ? 'Salvo!' : 'Salvar'}</span>
              </button>

              <div className="h-4 w-px bg-[#171717]" />

              <button
                onClick={handleAutoLayout}
                title="Auto-organizar nós (Layout Automático)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-[6px] bg-[#121212] hover:bg-[#1a1a1a] border border-[#171717] text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Auto Layout</span>
              </button>

              <button
                onClick={handleDuplicateSelectedNode}
                disabled={!selectedNodeId}
                title="Duplicar Nó Selecionado"
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-[6px] transition-colors disabled:opacity-30"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[#171717]" />

              <button
                onClick={handleExportWorkflowJson}
                title="Exportar Workflow (JSON)"
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Importar Workflow (JSON)"
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportWorkflowJson}
                className="hidden"
              />
            </div>

            {/* Execution status notification */}
            {executionMessage && (
              <div
                className={`mt-2 text-xs px-3 py-1 rounded-[6px] border backdrop-blur animate-in fade-in slide-in-from-top-2 duration-150 font-mono ${
                  executionMessage.includes('Falha') || executionMessage.includes('Erro')
                    ? 'bg-red-950/80 border-red-800 text-red-200'
                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                }`}
              >
                {executionMessage}
              </div>
            )}
          </Panel>
        </ReactFlow>

        {/* Node Palette Dropdown */}
        {showPalette && (
          <div
            style={{ backgroundColor: '#0a0a0a' }}
            className="absolute top-14 left-3 z-30 w-72 rounded-[6px] border border-[#171717] p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              <span>Catálogo de Nós</span>
              <span className="text-[10px] text-zinc-500 font-mono">{PALETTE_ITEMS.length} disponíveis</span>
            </div>

            {/* Search filter */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrar nós (ex: Webhook, HTTP, If)..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="w-full bg-[#121212] border border-[#171717] rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500/60 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {PALETTE_ITEMS.filter((item) =>
                item.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
                item.category.toLowerCase().includes(paletteSearch.toLowerCase()) ||
                item.type.toLowerCase().includes(paletteSearch.toLowerCase())
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleAddNode(item.type)}
                    className="w-full flex items-center justify-between p-2 rounded-[6px] hover:bg-[#141414] text-left transition-colors group border border-transparent hover:border-[#1c1c1c]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-[6px] bg-[#121212] border border-[#171717] group-hover:border-[#262626]">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-200">{item.label}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{item.category}</div>
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Node Config Drawer */}
      {selectedNode && (
        <NodeDrawer
          node={selectedNode}
          allNodes={nodes as unknown as WorkflowNode[]}
          edges={edges as unknown as WorkflowEdge[]}
          credentials={credentials}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
};
