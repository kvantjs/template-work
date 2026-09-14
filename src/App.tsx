/**
 * FluxFlow — Visual Workflow Engine SaaS
 * Main Application Hub & State Orchestrator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Workflow as WorkflowIcon,
  PlayCircle,
  Shield,
  Webhook as WebhookIcon,
  CheckSquare,
  FileCode,
  Zap,
  ArrowLeft,
  Settings,
  Layers,
} from 'lucide-react';
import {
  Workflow,
  WorkflowExecution,
  IntegrationCredential,
  WorkflowNode,
} from './engine/types';
import { db } from './storage/db';
import { WORKFLOW_TEMPLATES } from './storage/templates';
import { WorkflowList } from './components/dashboard/WorkflowList';
import { TemplateModal } from './components/dashboard/TemplateModal';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ExecutionHistory } from './components/executions/ExecutionHistory';
import { CredentialsManager } from './components/credentials/CredentialsManager';
import { WebhookTester } from './components/webhook-tester/WebhookTester';
import { OpenApiImporter } from './components/openapi/OpenApiImporter';
import { AutomatedTestSuite } from './components/tests/AutomatedTestSuite';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { Sidebar, AppTab } from './components/layout/Sidebar';
import { CustomSelect } from './components/ui/CustomSelect';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { executeWorkflow } from './engine/engine';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'workflows';
    if (path.startsWith('/canvas')) return 'canvas';
    if (path.startsWith('/executions')) return 'executions';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/credentials')) return 'credentials';
    if (path.startsWith('/webhooks')) return 'webhook-tester';
    if (path.startsWith('/tests')) return 'test-suite';
    return 'workflows';
  }, [location.pathname]);

  // Load data from persistent storage
  // Trigger skeleton loading on every route change
  useEffect(() => {
    setIsInitialLoading(true);
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Initial data load
  useEffect(() => {
    const loadedWorkflows = db.getWorkflows();
    const loadedCreds = db.getCredentials();
    const loadedExecs = db.getExecutions();

    setWorkflows(loadedWorkflows);
    setCredentials(loadedCreds);
    setExecutions(loadedExecs);

    if (loadedWorkflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(loadedWorkflows[0].id);
    }
  }, []);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || workflows[0];

  // Workflow Actions
  const handleSaveWorkflow = (updated: Workflow) => {
    db.saveWorkflow(updated);
    setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleSelectWorkflow = (workflowId: string) => {
    setActiveWorkflowId(workflowId);
    navigate('/canvas');
  };

  const handleCreateNewWorkflow = () => {
    const newId = `wf_${Date.now()}`;
    const newWf: Workflow = {
      id: newId,
      userId: 'usr_admin',
      name: 'Novo Workflow Sem Título',
      description: 'Construa sua automação conectando nós no canvas visual.',
      isActive: true,
      version: 1,
      tags: ['Rascunho'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'manual_trigger_1',
          position: { x: 250, y: 150 },
          data: {
            label: 'Disparo Manual',
            type: 'manual',
            config: { testPayload: JSON.stringify({ message: 'Hello FluxFlow!' }, null, 2) },
            isValidConfig: true,
          },
        },
      ],
      edges: [],
    };

    db.saveWorkflow(newWf);
    setWorkflows((prev) => [newWf, ...prev]);
    setActiveWorkflowId(newId);
    navigate('/canvas');
  };

  const handleSelectTemplate = (templateIndex: number) => {
    const tmpl = WORKFLOW_TEMPLATES[templateIndex];
    if (!tmpl) return;

    const newId = `wf_tmpl_${Date.now()}`;
    const newWf: Workflow = {
      id: newId,
      userId: 'usr_admin',
      name: tmpl.name,
      description: tmpl.description,
      isActive: true,
      version: 1,
      tags: [...tmpl.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: tmpl.nodes,
      edges: tmpl.edges,
    };

    db.saveWorkflow(newWf);
    setWorkflows((prev) => [newWf, ...prev]);
    setActiveWorkflowId(newId);
    setShowTemplatesModal(false);
    navigate('/canvas');
  };

  const handleToggleActive = (workflowId: string, currentActive: boolean) => {
    const wf = workflows.find((w) => w.id === workflowId);
    if (!wf) return;
    const updated = { ...wf, isActive: !currentActive, updatedAt: new Date().toISOString() };
    handleSaveWorkflow(updated);
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const original = workflows.find((w) => w.id === workflowId);
    if (!original) return;

    const dupId = `wf_${Date.now()}`;
    const duplicated: Workflow = {
      ...original,
      id: dupId,
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveWorkflow(duplicated);
    setWorkflows((prev) => [duplicated, ...prev]);
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    if (!confirm('Deseja realmente excluir este workflow? Esta ação é irreversível.')) return;
    db.deleteWorkflow(workflowId);
    setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    if (activeWorkflowId === workflowId) {
      const remaining = workflows.filter((w) => w.id !== workflowId);
      setActiveWorkflowId(remaining[0]?.id || null);
      if (remaining.length === 0) navigate('/');
    }
  };

  // Replay Execution
  const handleReplayExecution = async (execution: WorkflowExecution) => {
    const wf = workflows.find((w) => w.id === execution.workflowId);
    if (!wf) {
      alert('Workflow original não encontrado para reprocessamento.');
      return;
    }

    setActiveWorkflowId(wf.id);
    navigate('/canvas');

    try {
      const newExecution = await executeWorkflow(wf, 'MANUAL', execution.triggerPayload || {}, {
        getCredential: async (id) => {
          const c = credentials.find((cred) => cred.id === id);
          return c ? { id: c.id, providerName: c.providerName, data: {} } : null;
        },
      });

      db.saveExecution(newExecution);
      setExecutions(db.getExecutions());
    } catch (err: any) {
      alert(`Erro no replay: ${err.message}`);
    }
  };

  // Handle OpenAPI node injected into current workflow
  const handleAddGeneratedNode = (node: WorkflowNode) => {
    if (!activeWorkflow) return;
    const updated: Workflow = {
      ...activeWorkflow,
      nodes: [...activeWorkflow.nodes, node],
      updatedAt: new Date().toISOString(),
    };
    handleSaveWorkflow(updated);
    navigate('/canvas');
  };

  // Export all data (Workflows, Executions, Credentials metadata, Webhooks)
  const handleExportAllData = () => {
    const backupData = {
      version: '2.1.3',
      exportedAt: new Date().toISOString(),
      platform: 'FluxFlow Automation Studio',
      workflows,
      executions,
      webhooks: db.getWebhooks(),
      credentialsCount: credentials.length,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxflow-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden select-none font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        workflows={workflows}
        activeWorkflow={activeWorkflow}
        onSelectWorkflow={handleSelectWorkflow}
        executionsCount={executions.length}
        onOpenOpenApi={() => setShowOpenApiModal(true)}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        onExportAllData={handleExportAllData}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#0a0a0a]">
        {/* Top Contextual Header Bar */}
        <header
          style={{ backgroundColor: '#0a0a0a' }}
          className="h-12 border-b border-[#171717] flex items-center justify-between px-6 z-20 flex-shrink-0"
        >
          {/* Active Context Breadcrumb */}
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-medium tracking-tight text-zinc-400">
              {activeTab === 'workflows' && 'Painel de Automações'}
              {activeTab === 'canvas' && (activeWorkflow ? `Editor Visual / ${activeWorkflow.name}` : 'Editor Visual')}
              {activeTab === 'executions' && 'Histórico de Execuções e Auditoria'}
              {activeTab === 'analytics' && 'Telemetria & Métricas em Tempo Real'}
              {activeTab === 'credentials' && 'Cofre de Credenciais Criptografadas AES-256'}
              {activeTab === 'webhook-tester' && 'Simulador e Depurador de Webhooks'}
              {activeTab === 'test-suite' && 'Bateria de Testes Automatizados (Segurança & Ryvax)'}
            </span>

            {activeTab === 'canvas' && activeWorkflow?.isActive && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ativo no Engine
              </span>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Active workflow selector when in Canvas tab */}
            {activeTab === 'canvas' && activeWorkflow && (
              <div className="w-56">
                <CustomSelect
                  value={activeWorkflow.id}
                  onChange={(val) => setActiveWorkflowId(val)}
                  options={workflows.map((w) => ({
                    value: w.id,
                    label: w.name,
                    icon: WorkflowIcon,
                    badge: w.isActive ? 'Ativo' : undefined,
                  }))}
                  size="xs"
                  searchable={workflows.length > 5}
                  placeholder="Selecionar Workflow..."
                />
              </div>
            )}

            <button
              onClick={() => setShowOpenApiModal(true)}
              title="Importar OpenAPI / Swagger"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-[#121212] hover:bg-[#171717] border border-[#171717] px-2.5 py-1 rounded-[6px] transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Importar OpenAPI</span>
            </button>

            {/* Theme Toggle (Deep Black vs Dark Gray) */}
            <ThemeToggle variant="compact" />

            {activeTab === 'workflows' && (
              <button
                onClick={handleCreateNewWorkflow}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-[6px] transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Novo Workflow</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
          <Routes>
            <Route
              path="/"
              element={
                <div style={{ backgroundColor: '#0a0a0a' }} className="h-full overflow-y-auto">
                  <WorkflowList
                    workflows={workflows}
                    isLoading={isInitialLoading}
                    onSelectWorkflow={handleSelectWorkflow}
                    onCreateNew={handleCreateNewWorkflow}
                    onOpenTemplates={() => setShowTemplatesModal(true)}
                    onToggleActive={handleToggleActive}
                    onDuplicate={handleDuplicateWorkflow}
                    onDelete={handleDeleteWorkflow}
                  />
                </div>
              }
            />
            <Route
              path="/canvas"
              element={
                activeWorkflow ? (
                  <WorkflowCanvas
                    key={activeWorkflow.id}
                    workflow={activeWorkflow}
                    credentials={credentials}
                    onSaveWorkflow={handleSaveWorkflow}
                    onExecutionComplete={() => setExecutions(db.getExecutions())}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 h-full">
                    Nenhum workflow selecionado
                  </div>
                )
              }
            />
            <Route
              path="/executions"
              element={
                <div style={{ backgroundColor: '#0a0a0a' }} className="h-full overflow-y-auto">
                  <ExecutionHistory
                    executions={executions}
                    workflows={workflows}
                    isLoading={isInitialLoading}
                    onReplayExecution={handleReplayExecution}
                  />
                </div>
              }
            />
            <Route
              path="/analytics"
              element={
                <div style={{ backgroundColor: '#0a0a0a' }} className="h-full overflow-y-auto">
                  <AnalyticsDashboard
                    workflows={workflows}
                    executions={executions}
                    isLoading={isInitialLoading}
                    onRefresh={() => setExecutions(db.getExecutions())}
                    onSelectWorkflow={(id) => {
                      handleSelectWorkflow(id);
                      navigate('/canvas');
                    }}
                  />
                </div>
              }
            />
            <Route
              path="/credentials"
              element={
                <div className="h-full overflow-y-auto">
                  <CredentialsManager
                    credentials={credentials}
                    isLoading={isInitialLoading}
                    onSaveCredential={(cred) => {
                      db.saveCredential(cred);
                      setCredentials(db.getCredentials());
                    }}
                    onDeleteCredential={(id) => {
                      db.deleteCredential(id);
                      setCredentials(db.getCredentials());
                    }}
                  />
                </div>
              }
            />
            <Route
              path="/webhooks"
              element={
                <div className="h-full overflow-y-auto">
                  <WebhookTester
                    workflows={workflows}
                    webhooks={db.getWebhooks()}
                    isLoading={isInitialLoading}
                    onExecutionCreated={() => setExecutions(db.getExecutions())}
                  />
                </div>
              }
            />
            <Route
              path="/tests"
              element={
                <div className="h-full overflow-y-auto">
                  <AutomatedTestSuite isLoading={isInitialLoading} />
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <TemplateModal
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {/* OpenAPI Importer Modal */}
      {showOpenApiModal && (
        <OpenApiImporter
          onAddGeneratedNode={handleAddGeneratedNode}
          onClose={() => setShowOpenApiModal(false)}
        />
      )}
    </div>
  );
}
