/**
 * UI: Execution History Table View
 * Section 8.5 of Technical Specification.
 * Status filtering, execution duration, node counts, and detail drawer.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Zap,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { WorkflowExecution, Workflow } from '../../engine/types';
import { ExecutionDetailModal } from './ExecutionDetailModal';
import { CustomSelect } from '../ui/CustomSelect';
import { Skeleton } from '../ui/Skeleton';

interface ExecutionHistoryProps {
  executions: WorkflowExecution[];
  workflows: Workflow[];
  isLoading?: boolean;
  onReplayExecution: (execution: WorkflowExecution) => void;
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  executions,
  workflows,
  isLoading,
  onReplayExecution,
}) => {
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'FAILED'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExecutions = executions.filter((ex) => {
    const matchesStatus = statusFilter === 'all' || ex.status === statusFilter;
    const matchesWorkflow = workflowFilter === 'all' || ex.workflowId === workflowFilter;
    const matchesSearch =
      ex.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.workflowName && ex.workflowName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesWorkflow && matchesSearch;
  });

  return (
    <div style={{ backgroundColor: '#0a0a0a' }} className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Histórico de Execuções</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Audite execuções completas, inspecione inputs/outputs por nó e reexecute fluxos com facilidade.
        </p>
      </div>

      {/* Filters */}
      <div
        style={{ backgroundColor: '#0a0a0a' }}
        className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-800/80"
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por ID ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ backgroundColor: '#0a0a0a' }}
            className="w-full border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status filter */}
          <div
            style={{ backgroundColor: '#0a0a0a' }}
            className="flex items-center p-1 rounded-xl border border-zinc-800 text-xs"
          >
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400'
              }`}
            >
              Todos ({executions.length})
            </button>
            <button
              onClick={() => setStatusFilter('SUCCESS')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'SUCCESS' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-zinc-400'
              }`}
            >
              Sucesso ({executions.filter((e) => e.status === 'SUCCESS').length})
            </button>
            <button
              onClick={() => setStatusFilter('FAILED')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'FAILED' ? 'bg-red-950/60 text-red-400 font-medium' : 'text-zinc-400'
              }`}
            >
              Falhas ({executions.filter((e) => e.status === 'FAILED').length})
            </button>
          </div>

          {/* Workflow selector */}
          <div className="w-56">
            <CustomSelect
              value={workflowFilter}
              onChange={(val) => setWorkflowFilter(val)}
              options={[
                { value: 'all', label: 'Todos os Workflows', icon: WorkflowIcon },
                ...workflows.map((w) => ({
                  value: w.id,
                  label: w.name,
                  icon: WorkflowIcon,
                  badge: w.isActive ? 'Ativo' : undefined,
                })),
              ]}
              size="xs"
              searchable={workflows.length > 5}
              placeholder="Filtrar por Workflow"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800 p-8">
          <Zap className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-zinc-200">Nenhuma execução registrada</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Dispare um workflow através do botão &quot;Run Now&quot; ou envie uma requisição para a URL de Webhook.
          </p>
        </div>
      ) : (
        <div
          style={{ backgroundColor: '#0a0a0a' }}
          className="rounded-xl border border-[#171717] overflow-hidden shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0f0f0f] text-[10px] font-medium text-zinc-400 uppercase tracking-wider border-b border-[#171717]">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Workflow</th>
                  <th className="py-2.5 px-4">Disparo</th>
                  <th className="py-2.5 px-4">Nós Processados</th>
                  <th className="py-2.5 px-4">Duração</th>
                  <th className="py-2.5 px-4">Horário</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717] font-sans">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-4"><Skeleton className="w-16 h-4" /></td>
                      <td className="py-3 px-4">
                        <Skeleton className="w-32 h-4 mb-1" />
                        <Skeleton className="w-20 h-2" />
                      </td>
                      <td className="py-3 px-4"><Skeleton className="w-12 h-4" /></td>
                      <td className="py-3 px-4"><Skeleton className="w-16 h-4" /></td>
                      <td className="py-3 px-4"><Skeleton className="w-12 h-4" /></td>
                      <td className="py-3 px-4"><Skeleton className="w-24 h-4" /></td>
                      <td className="py-3 px-4 flex justify-end gap-2 mt-2"><Skeleton className="w-16 h-6" /><Skeleton className="w-6 h-6" /></td>
                    </tr>
                  ))
                ) : filteredExecutions.map((ex, index) => (
                  <tr
                    key={ex.id}
                    className="hover:bg-[#141414] transition-colors cursor-pointer group"
                    onClick={() => setSelectedExecution(ex)}
                  >
                    <td
                      style={{ backgroundColor: '#0a0a0a' }}
                      className="py-2.5 px-4"
                    >
                      {ex.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-red-950/60 text-red-400 border border-red-800/60">
                          <XCircle className="w-3 h-3" /> Falha
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-medium text-xs text-zinc-200 group-hover:text-blue-400 transition-colors tracking-tight">
                        {ex.workflowName || 'Workflow Sem Título'}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500">{ex.id}</div>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-[#141414] text-zinc-300 font-mono text-[10px] border border-[#171717]">
                        {ex.triggerType}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                      {ex.nodeLogs.filter((n) => n.status === 'SUCCESS').length} / {ex.nodeLogs.length} nós
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {ex.executionTimeMs || 0}ms
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                      {new Date(ex.createdAt).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onReplayExecution(ex)}
                          title="Reprocessar com o mesmo payload"
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Replay
                        </button>
                        <button
                          onClick={() => setSelectedExecution(ex)}
                          title="Inspecionar Nós"
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <ExecutionDetailModal
          execution={selectedExecution}
          onReplay={onReplayExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </div>
  );
};
