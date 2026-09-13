/**
 * Visual Canvas: Custom React Flow Node Component
 * Section 8.2 of Technical Specification.
 * Visual status glow (pending/running/success/failed/skipped), config warnings,
 * and dual handles for conditional branching (If/Else).
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Webhook,
  Clock,
  Play,
  Globe,
  Share2,
  Code2,
  GitBranch,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Slash,
} from 'lucide-react';
import { WorkflowNodeData, NodeType } from '../../engine/types';

interface CustomNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

const TYPE_CONFIG: Record<
  NodeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    bgBadge: string;
    textBadge: string;
    borderActive: string;
    category: string;
  }
> = {
  webhook: {
    icon: Webhook,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Trigger',
  },
  schedule: {
    icon: Clock,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Trigger',
  },
  manual: {
    icon: Play,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Trigger',
  },
  http_request: {
    icon: Globe,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Action',
  },
  unified_api: {
    icon: Share2,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Unified API',
  },
  code_runner: {
    icon: Code2,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Sandbox Logic',
  },
  if_else: {
    icon: GitBranch,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Branch Logic',
  },
  set_fields: {
    icon: Sliders,
    accentColor: 'text-zinc-300',
    bgBadge: 'bg-zinc-800/60',
    textBadge: 'text-zinc-300',
    borderActive: 'border-zinc-400',
    category: 'Data Transform',
  },
};

export const CustomNode: React.FC<CustomNodeProps> = ({ id, data, selected }) => {
  const meta = TYPE_CONFIG[data.type] || TYPE_CONFIG.webhook;
  const Icon = meta.icon;
  const isTrigger = ['webhook', 'schedule', 'manual'].includes(data.type);
  const isBranch = data.type === 'if_else';

  // Status visual states
  let statusBorder = selected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-zinc-800';
  let statusGlow = '';
  let statusBadge = null;

  if (data.executionStatus === 'RUNNING') {
    statusBorder = 'border-amber-400 ring-4 ring-amber-400/20';
    statusGlow = 'animate-pulse';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
        <Loader2 className="w-3 h-3 animate-spin" />
        Executando
      </span>
    );
  } else if (data.executionStatus === 'SUCCESS') {
    statusBorder = 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
        <CheckCircle2 className="w-3 h-3" />
        Sucesso
      </span>
    );
  } else if (data.executionStatus === 'FAILED') {
    statusBorder = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800/60">
        <XCircle className="w-3 h-3" />
        Falha
      </span>
    );
  } else if (data.executionStatus === 'SKIPPED') {
    statusBorder = 'border-zinc-700/50 opacity-60';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-700">
        <Slash className="w-3 h-3" />
        Ignorado
      </span>
    );
  }

  return (
    <div
      id={`canvas-node-${id}`}
      className={`relative min-w-[240px] max-w-[280px] rounded-xl bg-zinc-900/95 backdrop-blur border text-zinc-100 shadow-xl transition-all duration-200 ${statusBorder} ${statusGlow}`}
    >
      {/* Input Port (Target) - Not on Trigger nodes */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-700 hover:!bg-blue-400 !border-2 !border-zinc-900 transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${meta.bgBadge}`}>
            <Icon className={`w-4 h-4 ${meta.accentColor}`} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200 truncate max-w-[140px]">
              {data.label || meta.category}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              {data.type}
            </div>
          </div>
        </div>

        {data.isValidConfig === false && (
          <div title="Configuração incompleta" className="text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Body / Config summary */}
      <div className="p-3 text-xs text-zinc-400 space-y-1.5">
        {data.type === 'webhook' && (
          <div className="font-mono text-[11px] text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 truncate">
            {data.config?.method || 'POST'} /{data.config?.path || 'hook'}
          </div>
        )}

        {data.type === 'schedule' && (
          <div className="font-mono text-[11px] text-emerald-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
            cron: {data.config?.cronExpression || '0 * * * *'}
          </div>
        )}

        {data.type === 'http_request' && (
          <div className="font-mono text-[11px] text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 truncate">
            {data.config?.method || 'GET'} {data.config?.url || 'https://...'}
          </div>
        )}

        {data.type === 'code_runner' && (
          <div className="font-mono text-[11px] text-indigo-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
            Sandbox JS ({data.config?.timeoutMs || 3000}ms max)
          </div>
        )}

        {data.type === 'if_else' && (
          <div className="text-[11px] text-purple-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
            Condição: {data.config?.conditions?.[0]?.field || 'status'} {data.config?.conditions?.[0]?.operator || '=='} &quot;{data.config?.conditions?.[0]?.value}&quot;
          </div>
        )}

        {data.type === 'unified_api' && (
          <div className="text-[11px] text-violet-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 truncate">
            {data.config?.provider}: {data.config?.actionEndpoint}
          </div>
        )}

        {data.type === 'set_fields' && (
          <div className="text-[11px] text-teal-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
            {data.config?.fields?.length || 0} campos mapeados
          </div>
        )}

        {/* Real-time status badge */}
        {statusBadge && <div className="pt-1">{statusBadge}</div>}

        {/* Inline output preview pill */}
        {data.lastOutputPreview && (
          <div className="mt-1.5 p-1.5 bg-zinc-950/80 rounded border border-zinc-800/60 font-mono text-[10px] text-zinc-400 max-h-12 overflow-hidden truncate">
            Output: {typeof data.lastOutputPreview === 'object' ? JSON.stringify(data.lastOutputPreview) : String(data.lastOutputPreview)}
          </div>
        )}

        {data.lastErrorPreview && (
          <div className="mt-1.5 p-1.5 bg-red-950/40 rounded border border-red-900/50 font-mono text-[10px] text-red-300 max-h-12 overflow-hidden truncate">
            {data.lastErrorPreview}
          </div>
        )}
      </div>

      {/* Output Port(s) */}
      {isBranch ? (
        // Dual handles for If/Else
        <div className="flex justify-between px-6 pb-2 pt-1 border-t border-zinc-800/60 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-emerald-400">
            <span>True</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{ left: '25%' }}
              className="!w-3 !h-3 !bg-emerald-500 hover:!bg-emerald-400 !border-2 !border-zinc-900 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 text-red-400">
            <span>False</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{ left: '75%' }}
              className="!w-3 !h-3 !bg-red-500 hover:!bg-red-400 !border-2 !border-zinc-900 transition-colors"
            />
          </div>
        </div>
      ) : (
        // Standard single output handle
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-700 hover:!bg-blue-400 !border-2 !border-zinc-900 transition-colors"
        />
      )}
    </div>
  );
};
