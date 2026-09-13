/**
 * UI: Node Configuration Drawer & Form
 * Section 8.3 of Technical Specification.
 * Configures all MVP nodes, provides variable tree picker trigger,
 * test single node button, retry policies, and continueOnFail.
 */

import React, { useState } from 'react';
import {
  X,
  Play,
  Trash2,
  Braces,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Loader2,
  Globe,
  Lock,
  Layers,
  Clock,
  Code2,
  GitBranch,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { WorkflowNode, WorkflowEdge, IntegrationCredential } from '../../engine/types';
import { sortNodesTopologically, getUpstreamNodeIds } from '../../engine/topologicalSort';
import { getExecutor } from '../../engine/registry';
import { VariablePicker } from './VariablePicker';
import { CustomSelect } from '../ui/CustomSelect';

interface NodeDrawerProps {
  node: WorkflowNode;
  allNodes: WorkflowNode[];
  edges: WorkflowEdge[];
  credentials: IntegrationCredential[];
  onUpdateNode: (updatedNode: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  node,
  allNodes,
  edges,
  credentials,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'policy'>('config');
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [targetFieldForVariable, setTargetFieldForVariable] = useState<string | null>(null);

  const [testInput, setTestInput] = useState<string>('{}');
  const [testOutput, setTestOutput] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Compute upstream nodes for the variable picker
  const sortRes = sortNodesTopologically(allNodes, edges);
  const upstreamIds = getUpstreamNodeIds(node.id, sortRes.predecessors);

  const updateConfig = (key: string, value: any) => {
    onUpdateNode({
      ...node,
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          [key]: value,
        },
      },
    });
  };

  const updateNodeData = (key: string, value: any) => {
    onUpdateNode({
      ...node,
      data: {
        ...node.data,
        [key]: value,
      },
    });
  };

  const handleInsertVariable = (expression: string) => {
    if (!targetFieldForVariable) return;

    const currentVal = node.data.config[targetFieldForVariable] || '';
    updateConfig(targetFieldForVariable, currentVal + expression);
    setShowVariablePicker(false);
    setTargetFieldForVariable(null);
  };

  const handleTestSingleNode = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestOutput(null);

    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(testInput);
      } catch {
        parsedInput = { raw: testInput };
      }

      const executor = getExecutor(node.data.type);
      const res = await executor.execute({
        nodeId: node.id,
        config: node.data.config,
        input: parsedInput,
        context: {
          workflowId: 'test_wf',
          executionId: 'test_exec',
          getCredential: async (id) => {
            const c = credentials.find((cred) => cred.id === id);
            return c ? { id: c.id, providerName: c.providerName, data: {} } : null;
          },
          allOutputs: {},
          triggerPayload: parsedInput,
        },
      });

      setTestOutput(res.output);
      // Save last preview to node
      updateNodeData('lastOutputPreview', res.output);
      updateNodeData('lastErrorPreview', undefined);
    } catch (err: any) {
      setTestError(err.message || 'Erro durante o teste do nó');
      updateNodeData('lastErrorPreview', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const webhookFullUrl = `${appBaseUrl}/api/webhooks/${node.data.config?.path || 'my-webhook'}`;

  return (
    <div
      style={{ backgroundColor: '#0a0a0a' }}
      className="w-[420px] h-full border-l border-zinc-800 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
        <div className="flex-1 pr-2">
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => updateNodeData('label', e.target.value)}
            className="w-full bg-transparent font-semibold text-sm text-zinc-100 hover:bg-zinc-800/40 focus:bg-zinc-800/80 px-1.5 py-0.5 rounded outline-none border-b border-transparent focus:border-blue-500"
          />
          <div className="flex items-center gap-2 mt-0.5 px-1.5">
            <span className="text-[10px] font-mono uppercase text-blue-400 font-medium">
              {node.data.type}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">ID: {node.id}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs bg-zinc-950/40">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Configuração
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'test'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Testar Nó
        </button>
        <button
          onClick={() => setActiveTab('policy')}
          className={`flex-1 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === 'policy'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Políticas & Erros
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'config' && (
          <>
            {/* 1. Webhook Config */}
            {node.data.type === 'webhook' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Caminho da URL (Path)</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-mono text-[11px]">/api/webhooks/</span>
                    <input
                      type="text"
                      value={node.data.config?.path || ''}
                      onChange={(e) => updateConfig('path', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Método HTTP</label>
                  <CustomSelect
                    value={node.data.config?.method || 'POST'}
                    onChange={(val) => updateConfig('method', val)}
                    options={[
                      { value: 'POST', label: 'POST (Padrão para Webhooks)' },
                      { value: 'GET', label: 'GET' },
                    ]}
                    size="sm"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium">URL Pública para Disparo:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(webhookFullUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 1500);
                      }}
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-300 break-all select-all bg-zinc-900 p-1.5 rounded">
                    {webhookFullUrl}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Segredo de Assinatura HMAC (Opcional)</label>
                  <input
                    type="password"
                    placeholder="whsec_..."
                    value={node.data.config?.hmacSecret || ''}
                    onChange={(e) => updateConfig('hmacSecret', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 font-mono focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Se preenchido, valida o header X-Hub-Signature-256 com crypto.timingSafeEqual.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Schedule (Cron) Config */}
            {node.data.type === 'schedule' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Expressão Cron (5 campos)</label>
                  <input
                    type="text"
                    value={node.data.config?.cronExpression || '0 * * * *'}
                    onChange={(e) => updateConfig('cronExpression', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-emerald-400 font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <span className="block text-zinc-400 text-[11px] mb-1.5">Atalhos rápidos de agendamento:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'A cada 1 minuto', cron: '* * * * *' },
                      { label: 'A cada 15 minutos', cron: '*/15 * * * *' },
                      { label: 'A cada 1 hora', cron: '0 * * * *' },
                      { label: 'Todo dia à meia-noite', cron: '0 0 * * *' },
                    ].map((p) => (
                      <button
                        key={p.cron}
                        type="button"
                        onClick={() => updateConfig('cronExpression', p.cron)}
                        className="text-left text-[11px] p-2 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                      >
                        <div className="font-medium text-zinc-200">{p.label}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{p.cron}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Fuso Horário</label>
                  <CustomSelect
                    value={node.data.config?.timezone || 'America/Sao_Paulo'}
                    onChange={(val) => updateConfig('timezone', val)}
                    options={[
                      { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (UTC-3)', icon: Clock },
                      { value: 'UTC', label: 'UTC (Padrão)', icon: Globe },
                      { value: 'America/New_York', label: 'America/New_York (EST)', icon: Clock },
                    ]}
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* 3. Manual Trigger Config */}
            {node.data.type === 'manual' && (
              <div className="space-y-3 text-xs">
                <label className="block text-zinc-300 font-medium">Payload Padrão de Teste (JSON)</label>
                <textarea
                  rows={8}
                  value={node.data.config?.testPayload || '{}'}
                  onChange={(e) => updateConfig('testPayload', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                />
                <p className="text-[11px] text-zinc-500">
                  Este payload será injetado no workflow quando o botão &quot;Run Now&quot; for acionado.
                </p>
              </div>
            )}

            {/* 4. HTTP Request Config */}
            {node.data.type === 'http_request' && (
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <div className="w-32">
                    <label className="block text-zinc-300 font-medium mb-1">Método</label>
                    <CustomSelect
                      value={node.data.config?.method || 'GET'}
                      onChange={(val) => updateConfig('method', val)}
                      options={[
                        { value: 'GET', label: 'GET' },
                        { value: 'POST', label: 'POST' },
                        { value: 'PUT', label: 'PUT' },
                        { value: 'DELETE', label: 'DELETE' },
                        { value: 'PATCH', label: 'PATCH' },
                      ]}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-zinc-300 font-medium">URL de Destino</label>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetFieldForVariable('url');
                          setShowVariablePicker(true);
                        }}
                        className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline"
                      >
                        <Braces className="w-3 h-3" /> Variável
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="https://api.exemplo.com/v1/resource"
                      value={node.data.config?.url || ''}
                      onChange={(e) => updateConfig('url', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 p-2 rounded">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Proteção SSRF Ativa: hosts privados e metadados de nuvem bloqueados.</span>
                </div>

                {/* Authentication */}
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Autenticação</label>
                  <CustomSelect
                    value={node.data.config?.authType || 'none'}
                    onChange={(val) => updateConfig('authType', val)}
                    options={[
                      { value: 'none', label: 'Sem Autenticação' },
                      { value: 'bearer', label: 'Bearer Token', icon: Lock },
                      { value: 'basic', label: 'Basic Auth', icon: Lock },
                      { value: 'credential', label: 'Credencial Salva (AES-256-GCM)', icon: ShieldCheck },
                    ]}
                    size="sm"
                  />

                  {node.data.config?.authType === 'bearer' && (
                    <input
                      type="password"
                      placeholder="Token Bearer"
                      value={node.data.config?.bearerToken || ''}
                      onChange={(e) => updateConfig('bearerToken', e.target.value)}
                      className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                    />
                  )}

                  {node.data.config?.authType === 'credential' && (
                    <div className="mt-2">
                      <CustomSelect
                        value={node.data.config?.credentialId || ''}
                        onChange={(val) => updateConfig('credentialId', val)}
                        options={[
                          { value: '', label: 'Selecione uma credencial salva...' },
                          ...credentials.map((c) => ({
                            value: c.id,
                            label: c.displayName || c.providerName,
                            description: c.providerName,
                            icon: ShieldCheck,
                          })),
                        ]}
                        size="sm"
                        placeholder="Selecione uma credencial salva..."
                      />
                    </div>
                  )}
                </div>

                {/* Body (for POST/PUT/PATCH) */}
                {['POST', 'PUT', 'PATCH'].includes(node.data.config?.method?.toUpperCase() || 'GET') && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-zinc-300 font-medium">Corpo da Requisição (JSON)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetFieldForVariable('jsonBody');
                          setShowVariablePicker(true);
                        }}
                        className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline"
                      >
                        <Braces className="w-3 h-3" /> Inserir Variável
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={node.data.config?.jsonBody || '{}'}
                      onChange={(e) => updateConfig('jsonBody', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5. Unified API Connector */}
            {node.data.type === 'unified_api' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Agregador de Integração</label>
                  <CustomSelect
                    value={node.data.config?.provider || 'apideck'}
                    onChange={(val) => updateConfig('provider', val)}
                    options={[
                      { value: 'apideck', label: 'Apideck (Vault Embedded)', icon: Layers },
                      { value: 'unified', label: 'Unified.to (Connect Widget)', icon: Globe },
                    ]}
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Categoria de Serviço</label>
                  <CustomSelect
                    value={node.data.config?.serviceCategory || 'crm'}
                    onChange={(val) => updateConfig('serviceCategory', val)}
                    options={[
                      { value: 'crm', label: 'CRM (Contatos, Leads, Deals)' },
                      { value: 'accounting', label: 'Contabilidade (Faturas, Notas)' },
                      { value: 'messaging', label: 'Mensageria (Slack, Teams, SMS)' },
                      { value: 'hr', label: 'RH & Funcionários (Employees)' },
                    ]}
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Ação / Endpoint</label>
                  <input
                    type="text"
                    value={node.data.config?.actionEndpoint || 'contacts.create'}
                    onChange={(e) => updateConfig('actionEndpoint', e.target.value)}
                    placeholder="contacts.create ou messages.send"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-300 font-medium">Payload de Sincronização</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetFieldForVariable('payload');
                        setShowVariablePicker(true);
                      }}
                      className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Braces className="w-3 h-3" /> Inserir Variável
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={node.data.config?.payload || '{}'}
                    onChange={(e) => updateConfig('payload', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 6. Code Runner Config */}
            {node.data.type === 'code_runner' && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-300 font-medium">Código JavaScript (Sandbox)</label>
                    <span className="text-[10px] text-zinc-500 font-mono">input =&gt; return output</span>
                  </div>
                  <textarea
                    rows={12}
                    value={node.data.config?.code || ''}
                    onChange={(e) => updateConfig('code', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-indigo-300 font-mono text-[11px] focus:border-blue-500 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Tempo Limite de Execução (Timeout: {node.data.config?.timeoutMs || 3000}ms)
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={node.data.config?.timeoutMs || 3000}
                    onChange={(e) => updateConfig('timeoutMs', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 7. If/Else Config */}
            {node.data.type === 'if_else' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Combinador</label>
                  <CustomSelect
                    value={node.data.config?.combinator || 'AND'}
                    onChange={(val) => updateConfig('combinator', val)}
                    options={[
                      { value: 'AND', label: 'AND (Todas as condições devem ser verdadeiras)' },
                      { value: 'OR', label: 'OR (Ao menos uma condição verdadeira)' },
                    ]}
                    size="sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-zinc-300 font-medium">Regras de Validação</label>
                  {(node.data.config?.conditions || []).map((cond: any, idx: number) => (
                    <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Campo (ex: statusCode)"
                          value={cond.field || ''}
                          onChange={(e) => {
                            const updated = [...node.data.config.conditions];
                            updated[idx].field = e.target.value;
                            updateConfig('conditions', updated);
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                        />
                        <div className="w-36">
                          <CustomSelect
                            value={cond.operator || 'equals'}
                            onChange={(val) => {
                              const updated = [...node.data.config.conditions];
                              updated[idx].operator = val;
                              updateConfig('conditions', updated);
                            }}
                            options={[
                              { value: 'equals', label: 'Igual a (=)' },
                              { value: 'not_equals', label: 'Diferente (!=)' },
                              { value: 'contains', label: 'Contém' },
                              { value: 'greater_than', label: 'Maior que (>)' },
                              { value: 'less_than', label: 'Menor que (<)' },
                              { value: 'is_empty', label: 'Está vazio' },
                              { value: 'is_not_empty', label: 'Não está vazio' },
                            ]}
                            size="xs"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Valor esperado (ex: 200)"
                          value={cond.value || ''}
                          onChange={(e) => {
                            const updated = [...node.data.config.conditions];
                            updated[idx].value = e.target.value;
                            updateConfig('conditions', updated);
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = node.data.config.conditions.filter((_: any, i: number) => i !== idx);
                            updateConfig('conditions', updated);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const current = node.data.config?.conditions || [];
                      updateConfig('conditions', [...current, { field: 'status', operator: 'equals', value: '' }]);
                    }}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Condição
                  </button>
                </div>
              </div>
            )}

            {/* 8. Set Fields Config */}
            {node.data.type === 'set_fields' && (
              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={node.data.config?.keepExisting !== false}
                    onChange={(e) => updateConfig('keepExisting', e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0"
                  />
                  <span>Preservar campos existentes do nó anterior</span>
                </label>

                <div className="space-y-2">
                  <label className="block text-zinc-300 font-medium">Campos Personalizados</label>
                  {(node.data.config?.fields || []).map((f: any, idx: number) => (
                    <div key={idx} className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder="Nome do campo"
                        value={f.key || ''}
                        onChange={(e) => {
                          const updated = [...node.data.config.fields];
                          updated[idx].key = e.target.value;
                          updateConfig('fields', updated);
                        }}
                        className="w-1/3 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Valor ou {{var}}"
                        value={f.value || ''}
                        onChange={(e) => {
                          const updated = [...node.data.config.fields];
                          updated[idx].value = e.target.value;
                          updateConfig('fields', updated);
                        }}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
                      />
                      <div className="w-24">
                        <CustomSelect
                          value={f.type || 'string'}
                          onChange={(val) => {
                            const updated = [...node.data.config.fields];
                            updated[idx].type = val;
                            updateConfig('fields', updated);
                          }}
                          options={[
                            { value: 'string', label: 'String' },
                            { value: 'number', label: 'Number' },
                            { value: 'boolean', label: 'Boolean' },
                            { value: 'json', label: 'JSON' },
                          ]}
                          size="xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = node.data.config.fields.filter((_: any, i: number) => i !== idx);
                          updateConfig('fields', updated);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const current = node.data.config?.fields || [];
                      updateConfig('fields', [...current, { key: '', value: '', type: 'string' }]);
                    }}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Campo
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Test Single Node */}
        {activeTab === 'test' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Payload de Entrada para Teste (JSON)</label>
              <textarea
                rows={5}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] focus:border-blue-500 outline-none"
              />
            </div>

            <button
              onClick={handleTestSingleNode}
              disabled={isTesting}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {isTesting ? 'Executando Teste...' : 'Executar Este Nó'}
            </button>

            {testError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-mono">
                {testError}
              </div>
            )}

            {testOutput && (
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 font-medium">Saída do Nó (Resultado):</span>
                <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(testOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Policies & Retries */}
        {activeTab === 'policy' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(node.data.continueOnFail)}
                  onChange={(e) => updateNodeData('continueOnFail', e.target.checked)}
                  className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="text-zinc-200 font-medium block">Continuar em Caso de Falha (continueOnFail)</span>
                  <span className="text-[11px] text-zinc-500">
                    Se marcado, erros neste nó não interrompem a execução do workflow e o erro é repassado aos nós seguintes.
                  </span>
                </div>
              </label>

              <div className="border-t border-zinc-800/80 pt-3">
                <label className="block text-zinc-300 font-medium mb-1">
                  Tentativas de Repetição (Retries: {node.data.maxAttempts || 1})
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={node.data.maxAttempts || 1}
                  onChange={(e) => updateNodeData('maxAttempts', Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Intervalo de Backoff Exponencial ({node.data.backoffMs || 200}ms)
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={node.data.backoffMs || 200}
                  onChange={(e) => updateNodeData('backoffMs', Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <button
          onClick={() => onDeleteNode(node.id)}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Excluir Nó
        </button>

        <button
          onClick={onClose}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-1.5 rounded-lg transition-colors font-medium"
        >
          Salvar & Fechar
        </button>
      </div>

      {/* Variable Picker Modal */}
      {showVariablePicker && (
        <VariablePicker
          currentNodeId={node.id}
          nodes={allNodes}
          upstreamNodeIds={upstreamIds}
          onSelectVariable={handleInsertVariable}
          onClose={() => setShowVariablePicker(false)}
        />
      )}
    </div>
  );
};
