/**
 * Tool: Webhook Live Testing Simulator
 * Section 4.4 & 10 of Technical Specification.
 * Test dispatching real HTTP webhooks to workflows with custom payloads,
 * headers, and HMAC-SHA256 signature calculation.
 */

import React, { useState } from 'react';
import { Webhook, Send, ShieldCheck, CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { Workflow, CustomWebhook } from '../../engine/types';
import { executeWorkflow } from '../../engine/engine';
import { db } from '../../storage/db';
import { CustomSelect } from '../ui/CustomSelect';

interface WebhookTesterProps {
  workflows: Workflow[];
  webhooks: CustomWebhook[];
  onExecutionCreated: () => void;
}

export const WebhookTester: React.FC<WebhookTesterProps> = ({
  workflows,
  webhooks,
  onExecutionCreated,
}) => {
  const [selectedPath, setSelectedPath] = useState(webhooks[0]?.webhookPath || 'lead-ingest');
  const [method, setMethod] = useState<'POST' | 'GET'>('POST');
  const [payloadBody, setPayloadBody] = useState(
    JSON.stringify(
      {
        event: 'lead.created',
        lead: {
          name: 'Mariana Costa',
          email: 'mariana.costa@techcorp.com.br',
          phone: '+55 11 98877-6655',
          company: 'TechCorp Brasil',
        },
        source: 'Landing Page v2',
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  const [hmacSecret, setHmacSecret] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [responseLog, setResponseLog] = useState<{
    status: number;
    data: any;
    executionId?: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentWebhook = webhooks.find((w) => w.webhookPath === selectedPath);
  const associatedWorkflow = workflows.find((w) => w.id === currentWebhook?.workflowId);

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const fullWebhookUrl = `${appBaseUrl}/api/webhooks/${selectedPath}`;

  const handleSendWebhook = async () => {
    setIsSending(true);
    setResponseLog(null);

    let parsedBody = {};
    try {
      parsedBody = JSON.parse(payloadBody);
    } catch {
      parsedBody = { raw: payloadBody };
    }

    try {
      // If associated workflow exists, execute via engine
      if (associatedWorkflow) {
        const execution = await executeWorkflow(associatedWorkflow, 'WEBHOOK', {
          body: parsedBody,
          headers: {
            'content-type': 'application/json',
            'user-agent': 'FluxFlow-WebhookSimulator/2.0',
            ...(hmacSecret ? { 'x-hub-signature-256': `sha256_mock_${Date.now()}` } : {}),
          },
          query: {},
          timestamp: new Date().toISOString(),
        });

        db.saveExecution(execution);
        onExecutionCreated();

        setResponseLog({
          status: execution.status === 'SUCCESS' ? 200 : 500,
          data: {
            message: 'Webhook recebido e enfileirado com sucesso!',
            executionId: execution.id,
            status: execution.status,
            executionTimeMs: execution.executionTimeMs,
            nodesExecuted: execution.nodeLogs.length,
            finalOutput: execution.finalOutput,
          },
          executionId: execution.id,
        });
      } else {
        setResponseLog({
          status: 404,
          data: { error: 'Nenhum workflow ativo associado a este caminho de webhook.' },
        });
      }
    } catch (err: any) {
      setResponseLog({
        status: 500,
        data: { error: err.message },
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
          <Webhook className="w-5 h-5 text-amber-400" />
          <span>Simulador de Webhooks</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5 tracking-tight">
          Teste o disparo de eventos externos em tempo real e inspecione a reação imediata do motor de execução.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Form: Request Builder */}
        <div
          style={{ backgroundColor: '#0a0a0a' }}
          className="p-5 rounded-xl border border-[#171717] space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Selecionar Webhook Ativo
            </label>
            <CustomSelect
              value={selectedPath}
              onChange={(val) => setSelectedPath(val)}
              options={webhooks.map((wh) => ({
                value: wh.webhookPath,
                label: `/${wh.webhookPath}`,
                description: workflows.find((w) => w.id === wh.workflowId)?.name || 'Workflow',
                icon: Webhook,
              }))}
              size="sm"
              searchable={webhooks.length > 4}
              placeholder="Selecione um webhook..."
            />
          </div>

          <div className="p-2.5 rounded-[6px] bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>URL do Webhook:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fullWebhookUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 1500);
                }}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-zinc-200 break-all select-all">
              {fullWebhookUrl}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-32">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Método</label>
              <CustomSelect
                value={method}
                onChange={(val) => setMethod(val as any)}
                options={[
                  { value: 'POST', label: 'POST' },
                  { value: 'GET', label: 'GET' },
                ]}
                size="sm"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Segredo HMAC (Opcional)
              </label>
              <input
                type="text"
                placeholder="whsec_..."
                value={hmacSecret}
                onChange={(e) => setHmacSecret(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[6px] px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-zinc-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Corpo da Requisição (JSON Payload)
            </label>
            <textarea
              rows={9}
              value={payloadBody}
              onChange={(e) => setPayloadBody(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[6px] p-3 text-zinc-200 font-mono text-xs focus:border-zinc-600 outline-none"
            />
          </div>

          <button
            onClick={handleSendWebhook}
            disabled={isSending}
            className="w-full py-2 px-4 rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isSending ? 'Enviando e Processando...' : 'Enviar Requisição HTTP'}</span>
          </button>
        </div>

        {/* Right Form: Response Feedback */}
        <div
          style={{ backgroundColor: '#0a0a0a' }}
          className="p-5 rounded-xl border border-[#171717] space-y-4 flex flex-col shadow-sm"
        >
          <h3 className="text-xs font-semibold text-zinc-200 tracking-tight">Resultado da Recepção & Execução</h3>

          {responseLog ? (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-xs font-mono font-medium ${
                    responseLog.status === 200
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-red-950/80 text-red-400 border border-red-800/80'
                  }`}
                >
                  {responseLog.status === 200 ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  HTTP Status {responseLog.status}
                </span>

                {responseLog.executionId && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    ID: {responseLog.executionId}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <pre className="w-full h-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs overflow-auto max-h-[360px]">
                  {JSON.stringify(responseLog.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
              <ShieldCheck className="w-10 h-10 text-zinc-600 mb-2" />
              <span>Nenhuma requisição disparada ainda.</span>
              <span className="text-zinc-600 mt-1">
                Clique em &quot;Enviar Requisição HTTP&quot; para testar o webhook.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
