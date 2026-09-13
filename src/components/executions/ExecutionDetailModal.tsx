/**
 * UI: Execution Detail Inspector & Replay
 * Section 8.5 of Technical Specification.
 * Node-by-node timeline, masked input/output, execution timings, and replay button.
 */

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Slash,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { WorkflowExecution, NodeExecutionLog } from '../../engine/types';

interface ExecutionDetailModalProps {
  execution: WorkflowExecution;
  onReplay: (execution: WorkflowExecution) => void;
  onClose: () => void;
}

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({
  execution,
  onReplay,
  onClose,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            {execution.status === 'SUCCESS' ? (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  {execution.workflowName || 'Execução de Workflow'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {execution.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                <span>Disparo: <strong>{execution.triggerType}</strong></span>
                <span>•</span>
                <span>Duração: <strong>{execution.executionTimeMs || 0}ms</strong></span>
                <span>•</span>
                <span>Data: {new Date(execution.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onReplay(execution)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reprocessar (Replay)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Secret Masking Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-blue-300 text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>
              <strong>Mascaramento de Segredos Ativo:</strong> Chaves de API e senhas foram substituídas por <code>***[MASCARADO]***</code> nestes logs.
            </span>
          </div>

          {/* Trigger Payload Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300">Payload Inicial do Disparo (Trigger)</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(execution.triggerPayload, null, 2), 'trigger')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copiedKey === 'trigger' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copiar JSON
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs overflow-x-auto max-h-36">
              {JSON.stringify(execution.triggerPayload || {}, null, 2)}
            </pre>
          </div>

          {/* Node Execution Logs Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Linha do Tempo dos Nós ({execution.nodeLogs.length})
            </h3>

            <div className="space-y-3">
              {execution.nodeLogs.map((log: NodeExecutionLog, idx: number) => {
                const isExpanded = !!expandedNodes[log.id];

                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border transition-all ${
                      log.status === 'FAILED'
                        ? 'border-red-800/80 bg-red-950/10'
                        : log.status === 'SKIPPED'
                        ? 'border-zinc-800/60 bg-zinc-950/20 opacity-70'
                        : 'border-zinc-800 bg-zinc-950/40'
                    }`}
                  >
                    {/* Node Header Row */}
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-zinc-500 w-5">#{idx + 1}</span>

                        {log.status === 'SUCCESS' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        {log.status === 'FAILED' && (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        {log.status === 'SKIPPED' && (
                          <Slash className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200 font-mono">
                              {log.nodeId}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {log.nodeType}
                            </span>
                          </div>
                          {log.errorMessage && (
                            <p className="text-[11px] text-red-400 mt-0.5 line-clamp-1">
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {log.durationMs || 0}ms
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-zinc-800/80 space-y-3 bg-zinc-950/60">
                        {log.input && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-medium text-zinc-400">Entrada (Input):</span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log.input, null, 2), `in_${log.id}`)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                              >
                                {copiedKey === `in_${log.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                Copiar
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48">
                              {JSON.stringify(log.input, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.output && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-medium text-zinc-400">Saída (Output):</span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log.output, null, 2), `out_${log.id}`)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                              >
                                {copiedKey === `out_${log.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                Copiar
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48">
                              {JSON.stringify(log.output, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.errorMessage && (
                          <div>
                            <span className="text-[11px] font-medium text-red-400 block mb-1">
                              Mensagem de Erro:
                            </span>
                            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 font-mono text-xs">
                              {log.errorMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
