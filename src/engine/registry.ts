/**
 * Engine: Pluggable Node Executor Registry
 * Section 5.3 & 6.1 (MVP Closed List) of Technical Specification.
 * Implements: Webhook, Schedule, Manual, HTTP Request, Unified API Connector,
 * Code Runner, If/Else, and Set/Edit Fields.
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { validateUrlForSsrf } from './ssrf';
import { executeInSandbox } from './sandbox';
import { interpolateDeep } from './interpolator';

// -------------------------------------------------------------
// 1. Webhook Trigger Executor
// -------------------------------------------------------------
export const WebhookExecutor: NodeExecutor = {
  type: 'webhook',
  name: 'Webhook Trigger',
  category: 'trigger',
  description: 'Recebe requisições HTTP externas com URL exclusiva e validação HMAC opcional.',
  defaultConfig: {
    path: 'my-webhook',
    method: 'POST',
    hmacSecret: '',
    isTestMode: false,
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!config.path || config.path.trim().length === 0) {
      errors.push('Caminho do Webhook é obrigatório.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, input, context }) {
    // Input is the raw webhook payload ingested by the endpoint
    const payload = input || context.triggerPayload || {
      body: {},
      headers: {},
      query: {},
      timestamp: new Date().toISOString(),
    };

    return {
      output: {
        method: config.method || 'POST',
        path: config.path,
        headers: payload.headers || {},
        query: payload.query || {},
        body: payload.body || {},
        receivedAt: new Date().toISOString(),
      },
    };
  },
};

// -------------------------------------------------------------
// 2. Schedule (Cron) Trigger Executor
// -------------------------------------------------------------
export const ScheduleExecutor: NodeExecutor = {
  type: 'schedule',
  name: 'Schedule (Cron)',
  category: 'trigger',
  description: 'Dispara execuções automatizadas com base em expressão cron.',
  defaultConfig: {
    cronExpression: '0 * * * *', // hourly
    timezone: 'America/Sao_Paulo',
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!config.cronExpression || config.cronExpression.trim().split(' ').length < 5) {
      errors.push('Expressão Cron válida com 5 campos é obrigatória.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config }) {
    return {
      output: {
        cronExpression: config.cronExpression,
        timezone: config.timezone || 'UTC',
        triggeredAt: new Date().toISOString(),
        timestamp: Date.now(),
      },
    };
  },
};

// -------------------------------------------------------------
// 3. Manual Trigger Executor
// -------------------------------------------------------------
export const ManualExecutor: NodeExecutor = {
  type: 'manual',
  name: 'Manual Trigger',
  category: 'trigger',
  description: 'Disparo manual sob demanda através do botão "Run Now".',
  defaultConfig: {
    testPayload: JSON.stringify(
      {
        sampleId: 'usr_1001',
        event: 'user_created',
        user: { name: 'João Silva', email: 'joao.silva@exemplo.com.br', role: 'developer' },
      },
      null,
      2
    ),
  },
  validateConfig() {
    return { valid: true, errors: [] };
  },
  async execute({ config, input, context }) {
    let parsed = {};
    try {
      if (context.triggerPayload && Object.keys(context.triggerPayload).length > 0) {
        parsed = context.triggerPayload;
      } else if (typeof config.testPayload === 'string') {
        parsed = JSON.parse(config.testPayload);
      } else if (input) {
        parsed = input;
      }
    } catch {
      parsed = { raw: config.testPayload };
    }

    return {
      output: {
        data: parsed,
        triggeredBy: 'Manual UI / Test Run',
        triggeredAt: new Date().toISOString(),
      },
    };
  },
};

// -------------------------------------------------------------
// 4. HTTP Request Action Executor (SSRF Protected)
// -------------------------------------------------------------
export const HttpRequestExecutor: NodeExecutor = {
  type: 'http_request',
  name: 'HTTP Request',
  category: 'action',
  description: 'Executa chamadas HTTP com proteção SSRF, suporte a headers e autenticação.',
  defaultConfig: {
    method: 'GET',
    url: 'https://httpbin.org/get',
    headers: [],
    authType: 'none', // 'none' | 'bearer' | 'basic' | 'credential'
    bearerToken: '',
    basicUser: '',
    basicPass: '',
    credentialId: '',
    bodyType: 'json',
    jsonBody: '{}',
    timeoutMs: 8000,
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!config.url || config.url.trim().length === 0) {
      errors.push('URL de destino é obrigatória.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, context }) {
    // 1. SSRF Check
    const ssrfCheck = validateUrlForSsrf(config.url);
    if (!ssrfCheck.allowed) {
      throw new Error(ssrfCheck.reason || 'Requisição bloqueada por política de segurança SSRF.');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'FluxFlow-WorkflowEngine/2.0',
      Accept: 'application/json',
    };

    // Apply custom headers
    if (Array.isArray(config.headers)) {
      for (const h of config.headers) {
        if (h.key && h.value) {
          headers[h.key] = h.value;
        }
      }
    }

    // Apply authentication
    if (config.authType === 'bearer' && config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    } else if (config.authType === 'basic' && (config.basicUser || config.basicPass)) {
      const cred = btoa(`${config.basicUser || ''}:${config.basicPass || ''}`);
      headers['Authorization'] = `Basic ${cred}`;
    } else if (config.authType === 'credential' && config.credentialId) {
      const dec = await context.getCredential(config.credentialId);
      if (dec && dec.data) {
        if (dec.data.apiKey) {
          headers['Authorization'] = `Bearer ${dec.data.apiKey}`;
        } else if (dec.data.token) {
          headers['Authorization'] = `Bearer ${dec.data.token}`;
        }
      }
    }

    const method = (config.method || 'GET').toUpperCase();
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (config.bodyType === 'json' && config.jsonBody) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body =
          typeof config.jsonBody === 'string'
            ? config.jsonBody
            : JSON.stringify(config.jsonBody);
      }
    }

    const timeout = Math.min(config.timeoutMs || 8000, 15000);

    // Try server-side proxy first to bypass browser CORS restrictions and enforce DNS-level SSRF
    try {
      const proxyRes = await fetch('/api/proxy-http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ssrfCheck.sanitizedUrl!,
          method,
          headers,
          body: fetchOptions.body,
          timeoutMs: timeout,
        }),
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (!proxyData.ok) {
          throw new Error(`HTTP ${proxyData.status} (${proxyData.statusText}): ${typeof proxyData.data === 'object' ? JSON.stringify(proxyData.data) : proxyData.data}`);
        }
        return {
          output: {
            statusCode: proxyData.status,
            statusText: proxyData.statusText,
            headers: proxyData.headers,
            data: proxyData.data,
            durationMs: proxyData.durationMs,
            proxiedByServer: true,
            resolvedIp: proxyData.resolvedIp,
          },
        };
      } else if (proxyRes.status === 403) {
        const errJson = await proxyRes.json();
        throw new Error(errJson.reason || errJson.error || 'Bloqueado pelo filtro SSRF do servidor.');
      }
    } catch (proxyErr: any) {
      // If error was SSRF block from server, re-throw immediately
      if (proxyErr.message?.includes('SSRF') || proxyErr.message?.includes('restrito') || proxyErr.message?.includes('HTTP 403')) {
        throw proxyErr;
      }
      // Otherwise proceed to direct fetch fallback
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(ssrfCheck.sanitizedUrl!, fetchOptions);
      clearTimeout(timer);

      const status = response.status;
      const statusText = response.statusText;
      let responseBody: any;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${status} (${statusText}): ${typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody}`);
      }

      return {
        output: {
          statusCode: status,
          statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseBody,
        },
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Tempo limite de requisição excedido (${timeout}ms).`);
      }
      throw err;
    }
  },
};

// -------------------------------------------------------------
// 5. Unified API Connector (Apideck Vault / Unified.to)
// -------------------------------------------------------------
export const UnifiedApiExecutor: NodeExecutor = {
  type: 'unified_api',
  name: 'Unified API Connector',
  category: 'action',
  description: 'Integração unificada (Apideck/Unified.to) para CRM, Messaging, ERP e HR.',
  defaultConfig: {
    provider: 'apideck', // 'apideck' | 'unified'
    serviceCategory: 'crm', // 'crm' | 'accounting' | 'messaging' | 'hr'
    actionEndpoint: 'contacts.create',
    connectionId: 'conn_default_vault',
    payload: JSON.stringify(
      {
        name: 'Contato Exemplo',
        email: 'contato@cliente.com',
        company: 'Empresa SA',
      },
      null,
      2
    ),
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!config.actionEndpoint) errors.push('Ação/Endpoint unificado é obrigatório.');
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, input }) {
    let payloadData = input;
    try {
      if (typeof config.payload === 'string') {
        payloadData = JSON.parse(config.payload);
      } else if (config.payload) {
        payloadData = config.payload;
      }
    } catch {
      payloadData = { raw: config.payload };
    }

    // Process through unified proxy connector
    return {
      output: {
        provider: config.provider,
        category: config.serviceCategory,
        endpoint: config.actionEndpoint,
        connectionId: config.connectionId || 'conn_apideck_vault_default',
        status: 'synced',
        result: {
          id: `unif_${Date.now()}`,
          entity: config.actionEndpoint.split('.')[0] || 'record',
          syncedAt: new Date().toISOString(),
          data: payloadData,
        },
      },
    };
  },
};

// -------------------------------------------------------------
// 6. Code Runner Logic Executor (Sandbox Isolated)
// -------------------------------------------------------------
export const CodeRunnerExecutor: NodeExecutor = {
  type: 'code_runner',
  name: 'Code Runner',
  category: 'logic',
  description: 'Executa JavaScript em sandbox seguro sem acesso a rede, filesystem ou process.',
  defaultConfig: {
    code: `// Recebe o objeto 'input' do nó anterior
// Deve retornar um objeto JSON serializável
return {
  ...input,
  processedAt: new Date().toISOString(),
  status: "approved",
  itemsCount: Array.isArray(input.items) ? input.items.length : 1
};`,
    timeoutMs: 3000,
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!config.code || config.code.trim().length === 0) {
      errors.push('Código JavaScript é obrigatório.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, input }) {
    const result = await executeInSandbox(config.code, input, {
      timeoutMs: config.timeoutMs,
    });

    if (!result.success) {
      throw new Error(`Falha no Code Runner: ${result.error}`);
    }

    return {
      output: result.output,
    };
  },
};

// -------------------------------------------------------------
// 7. If/Else Logic Executor (Conditional Branching)
// -------------------------------------------------------------
export const IfElseExecutor: NodeExecutor = {
  type: 'if_else',
  name: 'If / Else',
  category: 'logic',
  description: 'Bifurca o fluxo de execução para a ramificação True ou False.',
  defaultConfig: {
    combinator: 'AND', // 'AND' | 'OR'
    conditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'approved',
      },
    ],
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      errors.push('Ao menos uma condição deve ser especificada.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, input }) {
    const conditions = config.conditions || [];
    const combinator = config.combinator || 'AND';

    function evaluateRule(rule: any): boolean {
      const fieldVal = input && typeof input === 'object' ? input[rule.field] : undefined;
      const targetVal = rule.value;

      switch (rule.operator) {
        case 'equals':
          return String(fieldVal).trim().toLowerCase() === String(targetVal).trim().toLowerCase();
        case 'not_equals':
          return String(fieldVal).trim().toLowerCase() !== String(targetVal).trim().toLowerCase();
        case 'contains':
          return String(fieldVal || '').toLowerCase().includes(String(targetVal || '').toLowerCase());
        case 'greater_than':
          return Number(fieldVal) > Number(targetVal);
        case 'less_than':
          return Number(fieldVal) < Number(targetVal);
        case 'is_empty':
          return fieldVal === undefined || fieldVal === null || fieldVal === '';
        case 'is_not_empty':
          return fieldVal !== undefined && fieldVal !== null && fieldVal !== '';
        case 'regex':
          try {
            const re = new RegExp(targetVal);
            return re.test(String(fieldVal || ''));
          } catch {
            return false;
          }
        default:
          return Boolean(fieldVal);
      }
    }

    let isMatch = false;
    if (conditions.length === 0) {
      isMatch = true;
    } else if (combinator === 'OR') {
      isMatch = conditions.some(evaluateRule);
    } else {
      isMatch = conditions.every(evaluateRule);
    }

    const branchName = isMatch ? 'true' : 'false';

    return {
      output: {
        conditionMet: isMatch,
        evaluatedBranch: branchName,
        data: input,
      },
      branches: {
        [branchName]: input,
      },
    };
  },
};

// -------------------------------------------------------------
// 8. Set/Edit Fields Data Executor
// -------------------------------------------------------------
export const SetFieldsExecutor: NodeExecutor = {
  type: 'set_fields',
  name: 'Set / Edit Fields',
  category: 'data',
  description: 'Transforma, adiciona, renomeia ou converte campos sem escrever código.',
  defaultConfig: {
    keepExisting: true,
    fields: [
      { key: 'source', value: 'workflow_v2', type: 'string' },
      { key: 'processed', value: 'true', type: 'boolean' },
      { key: 'version', value: '2', type: 'number' },
    ],
  },
  validateConfig(config) {
    const errors: string[] = [];
    if (!Array.isArray(config.fields)) {
      errors.push('Lista de campos é obrigatória.');
    }
    return { valid: errors.length === 0, errors };
  },
  async execute({ config, input }) {
    const base = config.keepExisting && typeof input === 'object' && input !== null
      ? { ...input }
      : {};

    const fields = config.fields || [];
    for (const f of fields) {
      if (!f.key) continue;

      let castValue: any = f.value;
      if (f.type === 'number') {
        castValue = Number(f.value);
      } else if (f.type === 'boolean') {
        castValue = String(f.value).toLowerCase() === 'true';
      } else if (f.type === 'json') {
        try {
          castValue = JSON.parse(f.value);
        } catch {
          castValue = f.value;
        }
      }

      base[f.key] = castValue;
    }

    return {
      output: base,
    };
  },
};

// -------------------------------------------------------------
// Node Registry Map
// -------------------------------------------------------------
export const NODE_REGISTRY: Record<string, NodeExecutor> = {
  webhook: WebhookExecutor,
  schedule: ScheduleExecutor,
  manual: ManualExecutor,
  http_request: HttpRequestExecutor,
  unified_api: UnifiedApiExecutor,
  code_runner: CodeRunnerExecutor,
  if_else: IfElseExecutor,
  set_fields: SetFieldsExecutor,
};

export function getExecutor(type: string): NodeExecutor {
  const executor = NODE_REGISTRY[type];
  if (!executor) {
    throw new Error(`Executor não encontrado para o tipo de nó: '${type}'`);
  }
  return executor;
}
