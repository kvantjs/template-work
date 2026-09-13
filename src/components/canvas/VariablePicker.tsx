/**
 * UI: Variable Selector Tree Modal / Popover
 * Section 8.3 of Technical Specification.
 * Allows users to inspect and insert upstream variable paths (e.g. {{node_id.output.data.email}})
 * without needing to manually memorize syntax.
 */

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, Braces, Sparkles } from 'lucide-react';
import { WorkflowNode } from '../../engine/types';

interface VariablePickerProps {
  currentNodeId: string;
  nodes: WorkflowNode[];
  upstreamNodeIds: string[];
  onSelectVariable: (expression: string) => void;
  onClose: () => void;
}

interface TreeNode {
  key: string;
  path: string;
  type: string;
  value?: any;
  children?: TreeNode[];
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  nodes,
  upstreamNodeIds,
  onSelectVariable,
  onClose,
}) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCopyOrInsert = (expression: string) => {
    onSelectVariable(expression);
    setCopiedPath(expression);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  // Build tree for an object
  const buildObjectTree = (obj: any, basePath: string): TreeNode[] => {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return [];
    }

    return Object.entries(obj).map(([key, val]) => {
      const currentPath = `${basePath}.${key}`;
      const valType = Array.isArray(val) ? 'array' : typeof val;

      if (val !== null && typeof val === 'object' && Object.keys(val).length > 0) {
        return {
          key,
          path: currentPath,
          type: valType,
          children: buildObjectTree(val, currentPath),
        };
      }

      return {
        key,
        path: currentPath,
        type: valType,
        value: val,
      };
    });
  };

  // Get upstream nodes
  const upstreamNodes = nodes.filter((n) => upstreamNodeIds.includes(n.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Braces className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Seletor de Variáveis</h3>
              <p className="text-xs text-zinc-400">
                Selecione uma variável dos nós anteriores para inserir no campo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700"
          >
            Fechar
          </button>
        </div>

        {/* Search / helper */}
        <div className="p-3 bg-blue-950/20 border-b border-blue-900/30 flex items-center gap-2 text-xs text-blue-300">
          <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            Clique na variável para inseri-la automaticamente com a sintaxe{' '}
            <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-200 font-mono">
              &#123;&#123;node.output...&#125;&#125;
            </code>
          </span>
        </div>

        {/* Tree List */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {upstreamNodes.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              Nenhum nó anterior conectado a este nó ainda. Conecte uma aresta para importar variáveis.
            </div>
          ) : (
            upstreamNodes.map((node) => {
              // Synthetic schema sample for the node based on type & config
              const sampleOutput: Record<string, any> =
                node.data.lastOutputPreview ||
                (node.data.type === 'webhook'
                  ? {
                      body: { email: 'contato@cliente.com', name: 'João Silva', phone: '+5511999998888' },
                      query: { utm_source: 'google', campaign: 'saas_v2' },
                      headers: { 'content-type': 'application/json' },
                    }
                  : node.data.type === 'code_runner'
                  ? {
                      score: 92,
                      normalizedEmail: 'joao@cliente.com',
                      processed: true,
                      timestamp: '2026-09-13T12:00:00Z',
                    }
                  : node.data.type === 'http_request'
                  ? {
                      statusCode: 200,
                      data: { id: 'usr_4492', status: 'created', success: true },
                    }
                  : {
                      result: 'ok',
                      timestamp: '2026-09-13T12:00:00Z',
                    });

              const tree = buildObjectTree(sampleOutput, `${node.id}.output`);

              return (
                <div key={node.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{node.data.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {node.id}
                      </span>
                    </div>
                  </div>

                  {/* Render recursive tree */}
                  <div className="space-y-1 pl-2 border-l border-zinc-800">
                    {tree.map((leaf) => renderTreeNode(leaf))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  function renderTreeNode(item: TreeNode, depth = 0) {
    const isExpanded = !!expandedNodes[item.path];
    const hasChildren = item.children && item.children.length > 0;
    const expression = `{{${item.path}}}`;

    return (
      <div key={item.path} style={{ paddingLeft: `${depth * 12}px` }} className="text-xs">
        <div className="flex items-center justify-between group py-1 px-1.5 rounded hover:bg-zinc-800/60 transition-colors">
          <div
            className="flex items-center gap-1.5 cursor-pointer flex-1"
            onClick={() => (hasChildren ? toggleExpand(item.path) : handleCopyOrInsert(expression))}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              )
            ) : (
              <span className="w-3.5 h-3.5" />
            )}

            <span className="font-mono text-zinc-300 group-hover:text-blue-400">{item.key}</span>
            <span className="text-[10px] text-zinc-500 font-mono">({item.type})</span>

            {item.value !== undefined && (
              <span className="text-[11px] text-zinc-400 truncate max-w-[120px] ml-1">
                = {String(item.value)}
              </span>
            )}
          </div>

          <button
            onClick={() => handleCopyOrInsert(expression)}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-opacity"
          >
            {copiedPath === expression ? (
              <>
                <Check className="w-3 h-3" /> Inserido!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Inserir
              </>
            )}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-zinc-800 ml-2">
            {item.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }
};
