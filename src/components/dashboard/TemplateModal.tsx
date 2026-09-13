/**
 * UI: Workflow Templates Modal
 * Section 8.6 of Technical Specification.
 * Displays pre-configured templates for quick onboarding.
 */

import React from 'react';
import { X, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '../../storage/templates';

interface TemplateModalProps {
  onSelectTemplate: (index: number) => void;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ onSelectTemplate, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Modelos Prontos de Automação
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Escolha um template pré-configurado para iniciar sem fricção
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates List */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {WORKFLOW_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              onClick={() => onSelectTemplate(idx)}
              className="p-4 rounded-xl border border-zinc-800 hover:border-blue-500/50 bg-zinc-950/50 hover:bg-zinc-800/30 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-blue-600 text-zinc-400 group-hover:text-white transition-all flex-shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                <span className="text-[11px] text-zinc-500 font-medium">Nós incluídos ({tmpl.nodes.length}):</span>
                {tmpl.nodes.map((n) => (
                  <span
                    key={n.id}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    {n.data.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                {tmpl.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-400 border border-blue-900/40"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-between items-center text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Totalmente customizáveis após a importação
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
