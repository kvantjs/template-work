/**
 * UI: Workflows Dashboard & List View
 * Section 8.1 of Technical Specification.
 * Search, filter by active status/tags, quick run, duplicate, toggle active, and template CTA.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Zap,
  Play,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { Workflow } from '../../engine/types';
import { CustomSelect } from '../ui/CustomSelect';
import { Skeleton } from '../ui/Skeleton';

interface WorkflowListProps {
  workflows: Workflow[];
  isLoading?: boolean;
  onSelectWorkflow: (workflowId: string) => void;
  onCreateNew: () => void;
  onOpenTemplates: () => void;
  onToggleActive: (workflowId: string, currentActive: boolean) => void;
  onDuplicate: (workflowId: string) => void;
  onDelete: (workflowId: string) => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  isLoading,
  onSelectWorkflow,
  onCreateNew,
  onOpenTemplates,
  onToggleActive,
  onDuplicate,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(workflows.flatMap((w) => w.tags || [])));

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? w.isActive
        : !w.isActive;

    const matchesTag = selectedTag ? w.tags?.includes(selectedTag) : true;

    return matchesSearch && matchesStatus && matchesTag;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Meus Workflows</h1>
          <p className="text-xs text-zinc-400 mt-0.5 tracking-tight">
            Gerencie automações visuais com triggers, transformações e execuções seguras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#121212] hover:bg-[#171717] border border-[#171717] text-zinc-300 text-xs font-medium transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Modelos Prontos</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Workflow</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{ backgroundColor: '#0a0a0a' }}
        className="flex flex-col md:flex-row items-center justify-between gap-3 p-2.5 rounded-xl border border-zinc-800/80"
      >
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ backgroundColor: '#0a0a0a' }}
            className="w-full border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div
            style={{ backgroundColor: '#0a0a0a' }}
            className="flex items-center p-0.5 rounded-lg border border-zinc-800 text-xs"
          >
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-[#1a1a1a] text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({workflows.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ativos ({workflows.filter((w) => w.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'inactive' ? 'bg-[#1a1a1a] text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Inativos ({workflows.filter((w) => !w.isActive).length})
            </button>
          </div>

          {allTags.length > 0 && (
            <div className="w-44">
              <CustomSelect
                value={selectedTag || ''}
                onChange={(val) => setSelectedTag(val ? val : null)}
                options={[
                  { value: '', label: 'Todas as Tags', icon: Tag },
                  ...allTags.map((t) => ({ value: t, label: `#${t}`, icon: Tag })),
                ]}
                size="xs"
                placeholder="Filtrar por Tag"
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid of Workflows */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ backgroundColor: '#0a0a0a' }}
              className="rounded-xl border border-[#171717] p-4 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-3.5 rounded-full" />
                    <Skeleton className="w-12 h-3" />
                  </div>
                  <Skeleton className="w-16 h-4 rounded-md" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-5/6" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="w-16 h-4 rounded-md" />
                  <Skeleton className="w-12 h-4 rounded-md" />
                </div>
              </div>
              <div className="pt-3 border-t border-[#171717] flex items-center justify-between">
                <Skeleton className="w-24 h-3" />
                <div className="flex gap-2">
                  <Skeleton className="w-6 h-6 rounded-md" />
                  <Skeleton className="w-6 h-6 rounded-md" />
                  <Skeleton className="w-16 h-6 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div
          style={{ backgroundColor: '#0a0a0a' }}
          className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 p-8"
        >
          <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">Nenhum workflow encontrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedTag
              ? 'Tente ajustar os filtros de busca para encontrar o que procura.'
              : 'Crie seu primeiro workflow a partir de um modelo pronto ou monte do zero no editor visual.'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={onOpenTemplates}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-lg shadow-blue-600/20"
            >
              Escolher Modelo
            </button>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
            >
              Criar do Zero
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((wf) => (
            <div
              key={wf.id}
              style={{ backgroundColor: '#0a0a0a' }}
              className="group rounded-xl hover:bg-[#121212] border border-[#171717] hover:border-zinc-700/80 p-4 flex flex-col justify-between transition-all duration-200 shadow-sm"
            >
              <div>
                {/* Header row: Status badge + Toggle */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wf.isActive}
                        onChange={() => onToggleActive(wf.id, wf.isActive)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <span
                      className={`text-[11px] font-medium tracking-tight ${
                        wf.isActive ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {wf.isActive ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  {/* Last execution status badge */}
                  {wf.lastExecutionStatus === 'SUCCESS' && (
                    <span className="flex items-center gap-1 text-[10px] font-medium font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-[6px] border border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3" /> Sucesso
                    </span>
                  )}
                  {wf.lastExecutionStatus === 'FAILED' && (
                    <span className="flex items-center gap-1 text-[10px] font-medium font-mono text-red-400 bg-red-950/60 px-2 py-0.5 rounded-[6px] border border-red-800/60">
                      <XCircle className="w-3 h-3" /> Falha
                    </span>
                  )}
                </div>

                {/* Workflow Title & Description */}
                <h3
                  onClick={() => onSelectWorkflow(wf.id)}
                  className="text-xs font-semibold text-zinc-100 hover:text-blue-400 cursor-pointer transition-colors line-clamp-1 tracking-tight"
                >
                  {wf.name}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 min-h-[30px] leading-relaxed">
                  {wf.description || 'Sem descrição cadastrada.'}
                </p>

                {/* Node count & Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[6px] bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {wf.nodes.length} nós • {wf.edges.length} arestas
                  </span>
                  {(wf.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-[6px] bg-blue-950/30 text-blue-400 border border-blue-900/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Metadata & Actions */}
              <div className="pt-3 mt-3 border-t border-[#171717] flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  {new Date(wf.updatedAt).toLocaleDateString('pt-BR')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDuplicate(wf.id)}
                    title="Duplicar Workflow"
                    className="p-1 rounded-[6px] text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(wf.id)}
                    title="Excluir"
                    className="p-1 rounded-[6px] text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectWorkflow(wf.id)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-[6px] bg-[#1a1a1a] hover:bg-[#222222] text-zinc-200 border border-[#262626] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
