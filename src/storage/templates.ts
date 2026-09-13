/**
 * Pre-configured Workflow Templates
 * Section 8.6 of Technical Specification.
 * High-value templates to reduce blank-canvas friction for new users.
 */

import { Workflow } from '../engine/types';

export const WORKFLOW_TEMPLATES: Omit<Workflow, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Ingestão de Leads via Webhook → Transformação → Disparo HTTP',
    description: 'Recebe novos leads de formulários externos, formata dados com Code Runner e envia para webhook de CRM ou Slack.',
    isActive: true,
    version: 1,
    tags: ['Leads', 'Webhook', 'CRM', 'Transformação'],
    nodes: [
      {
        id: 'webhook_trigger_1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          label: 'Webhook: Lead Recebido',
          type: 'webhook',
          config: {
            path: 'lead-ingest',
            method: 'POST',
            hmacSecret: '',
            isTestMode: false,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'code_runner_1',
        type: 'customNode',
        position: { x: 420, y: 180 },
        data: {
          label: 'Sanitizar & Normalizar Lead',
          type: 'code_runner',
          config: {
            code: `// Normaliza email e adiciona timestamp e score
const raw = input.body || input;
return {
  name: (raw.name || 'Lead Anônimo').trim(),
  email: (raw.email || 'lead@exemplo.com').toLowerCase().trim(),
  phone: (raw.phone || '').replace(/\\D/g, ''),
  score: 85,
  leadSource: 'Landing Page v2',
  ingestedAt: new Date().toISOString()
};`,
            timeoutMs: 3000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'http_request_1',
        type: 'customNode',
        position: { x: 760, y: 180 },
        data: {
          label: 'Enviar ao CRM / Slack',
          type: 'http_request',
          config: {
            method: 'POST',
            url: 'https://httpbin.org/post',
            headers: [{ key: 'Content-Type', value: 'application/json' }],
            authType: 'bearer',
            bearerToken: 'secret_token_live_crm_9921',
            bodyType: 'json',
            jsonBody: '{{code_runner_1.output}}',
            timeoutMs: 8000,
          },
          continueOnFail: false,
          maxAttempts: 2,
          backoffMs: 300,
          isValidConfig: true,
        },
      },
    ],
    edges: [
      {
        id: 'e_web_to_code',
        source: 'webhook_trigger_1',
        target: 'code_runner_1',
      },
      {
        id: 'e_code_to_http',
        source: 'code_runner_1',
        target: 'http_request_1',
      },
    ],
  },
  {
    name: 'Verificação Periódica de API & Alerta Condicional',
    description: 'Cron horário testa a saúde de um endpoint crítico e bifurca via If/Else para notificar incidente caso o status não seja 200.',
    isActive: true,
    version: 1,
    tags: ['DevOps', 'Cron', 'Monitoring', 'If/Else'],
    nodes: [
      {
        id: 'schedule_1',
        type: 'customNode',
        position: { x: 80, y: 200 },
        data: {
          label: 'Cron: A cada 1 Hora',
          type: 'schedule',
          config: {
            cronExpression: '0 * * * *',
            timezone: 'America/Sao_Paulo',
          },
          isValidConfig: true,
        },
      },
      {
        id: 'http_health_check',
        type: 'customNode',
        position: { x: 380, y: 200 },
        data: {
          label: 'Check Endpoint API',
          type: 'http_request',
          config: {
            method: 'GET',
            url: 'https://httpbin.org/status/200',
            headers: [],
            authType: 'none',
            timeoutMs: 5000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'if_else_1',
        type: 'customNode',
        position: { x: 700, y: 200 },
        data: {
          label: 'Status é 200?',
          type: 'if_else',
          config: {
            combinator: 'AND',
            conditions: [
              {
                field: 'statusCode',
                operator: 'equals',
                value: '200',
              },
            ],
          },
          isValidConfig: true,
        },
      },
      {
        id: 'set_success_log',
        type: 'customNode',
        position: { x: 1040, y: 100 },
        data: {
          label: 'Registrar Uptime OK',
          type: 'set_fields',
          config: {
            keepExisting: true,
            fields: [
              { key: 'uptimeStatus', value: 'HEALTHY', type: 'string' },
              { key: 'lastChecked', value: '{{$trigger.triggeredAt}}', type: 'string' },
            ],
          },
          isValidConfig: true,
        },
      },
      {
        id: 'unified_alert_incident',
        type: 'customNode',
        position: { x: 1040, y: 320 },
        data: {
          label: 'Disparar Alerta Incidente',
          type: 'unified_api',
          config: {
            provider: 'unified',
            serviceCategory: 'messaging',
            actionEndpoint: 'messages.send',
            connectionId: 'conn_opsgenie_slack',
            payload: JSON.stringify(
              {
                channel: '#ops-alerts',
                alert: 'API Endpoint falhou no health check!',
                details: '{{http_health_check.output}}',
              },
              null,
              2
            ),
          },
          isValidConfig: true,
        },
      },
    ],
    edges: [
      {
        id: 'e_sched_to_http',
        source: 'schedule_1',
        target: 'http_health_check',
      },
      {
        id: 'e_http_to_if',
        source: 'http_health_check',
        target: 'if_else_1',
      },
      {
        id: 'e_if_true',
        source: 'if_else_1',
        target: 'set_success_log',
        sourceHandle: 'true',
        label: 'Verdadeiro (Status 200)',
      },
      {
        id: 'e_if_false',
        source: 'if_else_1',
        target: 'unified_alert_incident',
        sourceHandle: 'false',
        label: 'Falso (Erro)',
      },
    ],
  },
  {
    name: 'Sanitização de Dados & Enriquecimento Unificado',
    description: 'Disparo manual para processamento de lote com Set Fields, transformação customizada e sincronização via conector de API unificada.',
    isActive: true,
    version: 1,
    tags: ['ETL', 'Low-Code', 'Unified API', 'Manual'],
    nodes: [
      {
        id: 'manual_1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          label: 'Disparo Manual (Lote)',
          type: 'manual',
          config: {
            testPayload: JSON.stringify(
              {
                batchId: 'batch_2026_09',
                account: 'Tech Solutions Corp',
                rawTier: 'Enterprise',
                contractValue: 45000,
              },
              null,
              2
            ),
          },
          isValidConfig: true,
        },
      },
      {
        id: 'set_fields_1',
        type: 'customNode',
        position: { x: 420, y: 180 },
        data: {
          label: 'Adicionar Metadados do Sistema',
          type: 'set_fields',
          config: {
            keepExisting: true,
            fields: [
              { key: 'environment', value: 'production', type: 'string' },
              { key: 'validated', value: 'true', type: 'boolean' },
              { key: 'slaHours', value: '24', type: 'number' },
            ],
          },
          isValidConfig: true,
        },
      },
      {
        id: 'code_runner_calc',
        type: 'customNode',
        position: { x: 740, y: 180 },
        data: {
          label: 'Calcular Desconto & Bônus',
          type: 'code_runner',
          config: {
            code: `// Calcula desconto de 10% para Enterprise
const contract = input.contractValue || 0;
const discountRate = input.rawTier === 'Enterprise' ? 0.10 : 0.05;
const finalAmount = contract * (1 - discountRate);

return {
  ...input,
  discountApplied: contract * discountRate,
  finalAmount: finalAmount,
  currency: 'BRL',
  auditHash: 'sha256_' + Date.now()
};`,
            timeoutMs: 3000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'unified_sync',
        type: 'customNode',
        position: { x: 1060, y: 180 },
        data: {
          label: 'Sincronizar no Apideck Vault (ERP)',
          type: 'unified_api',
          config: {
            provider: 'apideck',
            serviceCategory: 'accounting',
            actionEndpoint: 'invoices.create',
            connectionId: 'conn_apideck_quickbooks',
            payload: '{{code_runner_calc.output}}',
          },
          isValidConfig: true,
        },
      },
    ],
    edges: [
      {
        id: 'e_m_to_set',
        source: 'manual_1',
        target: 'set_fields_1',
      },
      {
        id: 'e_set_to_code',
        source: 'set_fields_1',
        target: 'code_runner_calc',
      },
      {
        id: 'e_code_to_unif',
        source: 'code_runner_calc',
        target: 'unified_sync',
      },
    ],
  },
  {
    name: 'Triagem de Incidentes de Segurança & Alerta Imediato',
    description: 'Recebe alertas via Webhook, filtra severidade crítica com If/Else e despacha notificação estruturada com assinatura de auditoria.',
    isActive: true,
    version: 1,
    tags: ['Segurança', 'Webhook', 'Triagem', 'Alertas'],
    nodes: [
      {
        id: 'sec_webhook',
        type: 'customNode',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook: Evento SIEM/WAF',
          type: 'webhook',
          config: {
            path: 'security-alerts',
            method: 'POST',
            hmacSecret: '',
            isTestMode: false,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'sec_code_runner',
        type: 'customNode',
        position: { x: 400, y: 200 },
        data: {
          label: 'Classificar Risco & Sanitizar IP',
          type: 'code_runner',
          config: {
            code: `// Analisa evento de segurança e classifica prioridade
const event = input.body || input;
const severity = event.severity || 'HIGH';
const isCritical = ['CRITICAL', 'HIGH'].includes(severity.toUpperCase());

return {
  incidentId: 'INC-' + Math.floor(Math.random() * 90000 + 10000),
  timestamp: new Date().toISOString(),
  sourceIp: event.ip || '198.51.100.4',
  ruleTriggered: event.rule || 'SQLi Detection Rule #404',
  severity: severity,
  isCritical: isCritical,
  actionTaken: 'BLOCKED_BY_WAF'
};`,
            timeoutMs: 3000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'sec_if_critical',
        type: 'customNode',
        position: { x: 740, y: 200 },
        data: {
          label: 'É Incidente Crítico?',
          type: 'if_else',
          config: {
            combinator: 'AND',
            conditions: [
              {
                field: 'isCritical',
                operator: 'equals',
                value: 'true',
              },
            ],
          },
          isValidConfig: true,
        },
      },
      {
        id: 'sec_notify_slack',
        type: 'customNode',
        position: { x: 1080, y: 100 },
        data: {
          label: 'Alerta Prioritário no Slack',
          type: 'http_request',
          config: {
            method: 'POST',
            url: 'https://httpbin.org/post',
            headers: [{ key: 'Content-Type', value: 'application/json' }],
            authType: 'none',
            bodyType: 'json',
            jsonBody: JSON.stringify({
              channel: '#sec-ops-war-room',
              text: '🚨 INCIDENTE CRÍTICO DETECTADO: {{sec_code_runner.output.ruleTriggered}} de IP {{sec_code_runner.output.sourceIp}}',
            }),
            timeoutMs: 5000,
          },
          continueOnFail: true,
          isValidConfig: true,
        },
      },
      {
        id: 'sec_log_archive',
        type: 'customNode',
        position: { x: 1080, y: 320 },
        data: {
          label: 'Arquivo de Auditoria Baixa Prioridade',
          type: 'set_fields',
          config: {
            keepExisting: true,
            fields: [
              { key: 'archivedInColdStorage', value: 'true', type: 'boolean' },
              { key: 'retentionDays', value: '90', type: 'number' },
            ],
          },
          isValidConfig: true,
        },
      },
    ],
    edges: [
      {
        id: 'e_sec_1',
        source: 'sec_webhook',
        target: 'sec_code_runner',
      },
      {
        id: 'e_sec_2',
        source: 'sec_code_runner',
        target: 'sec_if_critical',
      },
      {
        id: 'e_sec_true',
        source: 'sec_if_critical',
        target: 'sec_notify_slack',
        sourceHandle: 'true',
        label: 'Crítico (Sim)',
      },
      {
        id: 'e_sec_false',
        source: 'sec_if_critical',
        target: 'sec_log_archive',
        sourceHandle: 'false',
        label: 'Baixa Severidade',
      },
    ],
  },
  {
    name: 'Sincronização Bidirecional de Clientes & Gateway de Pagamentos',
    description: 'Disparo agendado a cada 6 horas para consolidar cobranças pendentes e atualizar saldo na plataforma financeira.',
    isActive: true,
    version: 1,
    tags: ['Finanças', 'Schedule', 'Pagamentos', 'Automação'],
    nodes: [
      {
        id: 'fin_sched',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          label: 'Cron: A cada 6 Horas',
          type: 'schedule',
          config: {
            cronExpression: '0 */6 * * *',
            timezone: 'America/Sao_Paulo',
          },
          isValidConfig: true,
        },
      },
      {
        id: 'fin_fetch_pending',
        type: 'customNode',
        position: { x: 420, y: 180 },
        data: {
          label: 'Buscar Faturas Abertas (API)',
          type: 'http_request',
          config: {
            method: 'GET',
            url: 'https://httpbin.org/json',
            headers: [{ key: 'Accept', value: 'application/json' }],
            authType: 'none',
            timeoutMs: 8000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'fin_code_process',
        type: 'customNode',
        position: { x: 740, y: 180 },
        data: {
          label: 'Conciliação & Cálculo de Juros',
          type: 'code_runner',
          config: {
            code: `// Processa faturas e aplica conciliação bancária
return {
  reconciledCount: 14,
  totalAmountReconciled: 12850.75,
  currency: 'BRL',
  batchStatus: 'PROCESSED_SUCCESSFULLY',
  processedAt: new Date().toISOString()
};`,
            timeoutMs: 3000,
          },
          isValidConfig: true,
        },
      },
      {
        id: 'fin_set_status',
        type: 'customNode',
        position: { x: 1060, y: 180 },
        data: {
          label: 'Atualizar Livro Contábil',
          type: 'set_fields',
          config: {
            keepExisting: true,
            fields: [
              { key: 'ledgerSync', value: 'COMPLETED', type: 'string' },
              { key: 'auditVerified', value: 'true', type: 'boolean' },
            ],
          },
          isValidConfig: true,
        },
      },
    ],
    edges: [
      {
        id: 'e_fin_1',
        source: 'fin_sched',
        target: 'fin_fetch_pending',
      },
      {
        id: 'e_fin_2',
        source: 'fin_fetch_pending',
        target: 'fin_code_process',
      },
      {
        id: 'e_fin_3',
        source: 'fin_code_process',
        target: 'fin_set_status',
      },
    ],
  },
];
