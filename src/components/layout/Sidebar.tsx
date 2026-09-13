import React from 'react';
import {
  Workflow as WorkflowIcon,
  PlayCircle,
  Shield,
  Webhook as WebhookIcon,
  CheckSquare,
  FileCode,
  Zap,
  Layers,
  Sparkles,
  Server,
  Activity,
  ChevronRight,
  BarChart3,
  Download,
} from 'lucide-react';
import { Workflow } from '../../engine/types';

export type AppTab = 'workflows' | 'canvas' | 'executions' | 'credentials' | 'webhook-tester' | 'test-suite' | 'analytics';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  onSelectWorkflow: (id: string) => void;
  executionsCount: number;
  onOpenOpenApi: () => void;
  onOpenTemplates: () => void;
  onExportAllData?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  workflows,
  activeWorkflow,
  onSelectWorkflow,
  executionsCount,
  onOpenOpenApi,
  onOpenTemplates,
  onExportAllData,
}) => {
  const activeWorkflowsCount = workflows.filter((w) => w.isActive).length;

  const navItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number }[] = [
    { id: 'workflows', label: 'Workflows', icon: WorkflowIcon },
    { id: 'canvas', label: 'Editor Visual', icon: Zap },
    { id: 'executions', label: 'Execuções', icon: PlayCircle, badge: executionsCount > 0 ? executionsCount : undefined },
    { id: 'analytics', label: 'Telemetria & Métricas', icon: BarChart3 },
    { id: 'credentials', label: 'Cofre AES-256', icon: Shield },
    { id: 'webhook-tester', label: 'Simulador Webhook', icon: WebhookIcon },
    { id: 'test-suite', label: 'Testes de Sistema', icon: CheckSquare },
  ];

  return (
    <aside
      style={{ backgroundColor: '#0a0a0a' }}
      className="w-64 h-screen border-r border-[#171717] flex flex-col justify-between flex-shrink-0 z-30 select-none"
    >
      {/* Brand Header */}
      <div>
        <div
          style={{ backgroundColor: '#0a0a0a' }}
          className="h-14 px-5 border-b border-[#171717] flex items-center justify-between"
        >
          <div
            onClick={() => setActiveTab('workflows')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div
              style={{ backgroundColor: '#151515' }}
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-zinc-100 font-bold transition-transform group-hover:scale-105"
            >
              <Layers className="w-4 h-4 text-zinc-100" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs tracking-tight text-zinc-100">
                  FluxFlow
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Engine
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">v2.1 Enterprise</span>
            </div>
          </div>
        </div>

        {/* Framework Pill (Monochrome with active status indicator) */}
        <div className="px-3 pt-3 pb-1">
          <div
            style={{ backgroundColor: '#111111' }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[11px] font-mono text-zinc-300"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400">Ryvax.js</span>
            </div>
            <span className="text-[10px] text-zinc-500">v2.1.3 Kvant</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="p-3 space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Plataforma
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={isActive ? { backgroundColor: '#151515', color: '#f4f4f5' } : undefined}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#151515] text-zinc-100 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141414]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`} />
                  <span className="tracking-tight font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[6px] ${
                      isActive ? 'bg-[#262626] text-zinc-200 font-semibold' : 'bg-[#141414] text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Tools Navigation */}
        <div className="px-3 pt-2 space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Atalhos
          </div>
          <button
            onClick={onOpenTemplates}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span className="tracking-tight">Modelos Prontos</span>
          </button>
          <button
            onClick={onOpenOpenApi}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            <span className="tracking-tight">Importar OpenAPI</span>
          </button>
          {onExportAllData && (
            <button
              onClick={onExportAllData}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#141414] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="tracking-tight">Backup Geral (JSON)</span>
            </button>
          )}
        </div>

        {/* Workflows in Canvas Quick-switch */}
        {workflows.length > 0 && (
          <div className="px-3 pt-3">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
              <span>Workflows Recentes</span>
              <span className="text-zinc-600">{workflows.length}</span>
            </div>
            <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto pr-1">
              {workflows.slice(0, 5).map((w) => {
                const isCurrent = activeWorkflow?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSelectWorkflow(w.id);
                      setActiveTab('canvas');
                    }}
                    style={isCurrent ? { backgroundColor: '#151515', color: '#f4f4f5' } : undefined}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-[11px] truncate flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-[#151515] text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:bg-[#151515] hover:text-zinc-300'
                    }`}
                  >
                    <span className="truncate font-medium">{w.name}</span>
                    {w.isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-[#171717] bg-[#0a0a0a] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            Ativos no Engine:
          </span>
          <span className="font-mono text-zinc-200">{activeWorkflowsCount} / {workflows.length}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 font-mono">
          <span>SSRF / Proxy:</span>
          <span className="text-emerald-500">PROTEGIDO</span>
        </div>
      </div>
    </aside>
  );
};
