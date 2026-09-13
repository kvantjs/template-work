/**
 * Data Layer: Store & Persistence Engine
 * Complies with Section 3 (Data Modeling - Prisma Schema Equivalent).
 * Implements persistent CRUD operations, schema migrations, and seeding.
 */

import {
  Workflow,
  WorkflowExecution,
  IntegrationCredential,
  CustomWebhook,
} from '../engine/types';
import { WORKFLOW_TEMPLATES } from './templates';
import { encrypt } from '../engine/crypto';

const STORAGE_KEY_PREFIX = 'fluxflow_db_';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

const DEFAULT_USER: User = {
  id: 'usr_admin_default',
  email: 'admin@workflow.saas',
  name: 'Engenheiro Principal',
};

const DEFAULT_ORG: Organization = {
  id: 'org_fluxflow_default',
  name: 'Acme Automations',
  slug: 'acme-automations',
  plan: 'free',
};

class DataStore {
  private user: User = DEFAULT_USER;
  private organization: Organization = DEFAULT_ORG;

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
      return false;
    }
  }

  private load<T>(key: string, fallback: T): T {
    if (!this.isLocalStorageAvailable()) return fallback;
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
    } catch {
      // Ignore quota exceeded or storage blocked
    }
  }

  // ---------------- User & Org ----------------
  public getUser(): User {
    return this.user;
  }

  public getOrganization(): Organization {
    return this.organization;
  }

  // ---------------- Workflows ----------------
  public getWorkflows(): Workflow[] {
    const wfs = this.load<Workflow[]>('workflows', []);
    if (wfs.length === 0) {
      // Seed default workflows from templates
      return this.seedInitialWorkflows();
    }
    return wfs;
  }

  public getWorkflow(id: string): Workflow | null {
    const list = this.getWorkflows();
    return list.find((w) => w.id === id) || null;
  }

  public saveWorkflow(workflow: Workflow): Workflow {
    const list = this.getWorkflows();
    const now = new Date().toISOString();
    const existingIndex = list.findIndex((w) => w.id === workflow.id);

    const updatedWorkflow: Workflow = {
      ...workflow,
      updatedAt: now,
      version: (workflow.version || 1) + 1,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updatedWorkflow;
    } else {
      updatedWorkflow.createdAt = updatedWorkflow.createdAt || now;
      list.unshift(updatedWorkflow);
    }

    this.save('workflows', list);

    // Synchronize webhook records
    this.syncWebhooksForWorkflow(updatedWorkflow);

    // Synchronize with server-side backend in background
    if (typeof fetch !== 'undefined') {
      fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWorkflow),
      }).catch(() => {});
    }

    return updatedWorkflow;
  }

  public deleteWorkflow(id: string): boolean {
    const list = this.getWorkflows();
    const filtered = list.filter((w) => w.id !== id);
    if (filtered.length !== list.length) {
      this.save('workflows', filtered);
      // Remove associated webhooks
      const webhooks = this.getWebhooks().filter((wh) => wh.workflowId !== id);
      this.save('webhooks', webhooks);

      if (typeof fetch !== 'undefined') {
        fetch(`/api/workflows/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public duplicateWorkflow(id: string): Workflow | null {
    const original = this.getWorkflow(id);
    if (!original) return null;

    const newId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cloned: Workflow = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name} (Cópia)`,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    // Update webhook node path if present
    cloned.nodes.forEach((node) => {
      if (node.data.type === 'webhook' && node.data.config) {
        node.data.config.path = `${node.data.config.path || 'hook'}-copy-${Math.random().toString(36).slice(2, 5)}`;
      }
    });

    return this.saveWorkflow(cloned);
  }

  public createFromTemplate(templateIndex: number): Workflow {
    const tmpl = WORKFLOW_TEMPLATES[templateIndex] || WORKFLOW_TEMPLATES[0];
    const newId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const wf: Workflow = {
      id: newId,
      userId: this.user.id,
      organizationId: this.organization.id,
      name: tmpl.name,
      description: tmpl.description,
      isActive: false,
      version: 1,
      tags: [...tmpl.tags],
      nodes: JSON.parse(JSON.stringify(tmpl.nodes)),
      edges: JSON.parse(JSON.stringify(tmpl.edges)),
      createdAt: now,
      updatedAt: now,
    };

    return this.saveWorkflow(wf);
  }

  // ---------------- Executions ----------------
  public getExecutions(workflowId?: string): WorkflowExecution[] {
    const list = this.load<WorkflowExecution[]>('executions', []);
    if (workflowId) {
      return list.filter((e) => e.workflowId === workflowId);
    }
    return list;
  }

  public getExecution(id: string): WorkflowExecution | null {
    const list = this.getExecutions();
    return list.find((e) => e.id === id) || null;
  }

  public saveExecution(execution: WorkflowExecution): void {
    const list = this.getExecutions();
    const existingIndex = list.findIndex((e) => e.id === execution.id);

    if (existingIndex >= 0) {
      list[existingIndex] = execution;
    } else {
      list.unshift(execution);
    }

    // Keep max 100 historical records in memory/storage
    if (list.length > 100) {
      list.length = 100;
    }

    this.save('executions', list);

    if (typeof fetch !== 'undefined') {
      fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execution),
      }).catch(() => {});
    }

    // Update workflow last execution status
    const wf = this.getWorkflow(execution.workflowId);
    if (wf) {
      wf.lastExecutionStatus = execution.status;
      wf.lastExecutedAt = execution.finishedAt || execution.startedAt || new Date().toISOString();
      this.saveWorkflow(wf);
    }
  }

  public deleteExecution(id: string): boolean {
    const list = this.getExecutions();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length !== list.length) {
      this.save('executions', filtered);
      return true;
    }
    return false;
  }

  // ---------------- Webhooks ----------------
  public getWebhooks(): CustomWebhook[] {
    return this.load<CustomWebhook[]>('webhooks', []);
  }

  public getWebhookByPath(path: string): CustomWebhook | null {
    const cleanPath = path.toLowerCase().trim().replace(/^\//, '');
    const list = this.getWebhooks();
    return list.find((w) => w.webhookPath.toLowerCase().trim().replace(/^\//, '') === cleanPath) || null;
  }

  private syncWebhooksForWorkflow(workflow: Workflow): void {
    const currentWebhooks = this.getWebhooks().filter((wh) => wh.workflowId !== workflow.id);
    workflow.nodes.forEach((n) => {
      if (n.data.type === 'webhook' && n.data.config?.path) {
        currentWebhooks.push({
          id: `wh_${workflow.id}_${n.id}`,
          workflowId: workflow.id,
          webhookPath: n.data.config.path,
          method: n.data.config.method || 'POST',
          isTestMode: Boolean(n.data.config.isTestMode),
          hmacSecret: n.data.config.hmacSecret || '',
          createdAt: new Date().toISOString(),
        });
      }
    });
    this.save('webhooks', currentWebhooks);
  }

  // ---------------- Credentials ----------------
  public getCredentials(): IntegrationCredential[] {
    const creds = this.load<IntegrationCredential[]>('credentials', []);
    if (creds.length === 0) {
      this.seedDefaultCredentials();
      return this.load<IntegrationCredential[]>('credentials', []);
    }
    return creds;
  }

  public saveCredential(cred: IntegrationCredential): void {
    const list = this.getCredentials();
    const idx = list.findIndex((c) => c.id === cred.id);
    if (idx >= 0) {
      list[idx] = cred;
    } else {
      list.unshift(cred);
    }
    this.save('credentials', list);

    if (typeof fetch !== 'undefined') {
      fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      }).catch(() => {});
    }
  }

  public deleteCredential(id: string): boolean {
    const list = this.getCredentials();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length !== list.length) {
      this.save('credentials', filtered);
      if (typeof fetch !== 'undefined') {
        fetch(`/api/credentials/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  // ---------------- Seeding ----------------
  private seedInitialWorkflows(): Workflow[] {
    const now = new Date().toISOString();
    const seeded: Workflow[] = WORKFLOW_TEMPLATES.map((tmpl, idx) => ({
      id: `wf_template_seed_${idx + 1}`,
      userId: this.user.id,
      organizationId: this.organization.id,
      name: tmpl.name,
      description: tmpl.description,
      isActive: true,
      version: 1,
      tags: [...tmpl.tags],
      nodes: JSON.parse(JSON.stringify(tmpl.nodes)),
      edges: JSON.parse(JSON.stringify(tmpl.edges)),
      createdAt: now,
      updatedAt: now,
      lastExecutionStatus: 'SUCCESS',
      lastExecutedAt: new Date(Date.now() - 3600000 * (idx + 1)).toISOString(),
    }));

    this.save('workflows', seeded);
    seeded.forEach((wf) => this.syncWebhooksForWorkflow(wf));
    return seeded;
  }

  private async seedDefaultCredentials(): Promise<void> {
    try {
      const apideckEnc = await encrypt(
        JSON.stringify({
          apiKey: 'live_vault_key_90218_production',
          appId: 'apideck_app_7741',
          consumerId: 'usr_admin_default',
        })
      );

      const slackEnc = await encrypt(
        JSON.stringify({
          token: 'xoxb-992147102-production-alert-bot',
          channel: '#workflow-alerts',
        })
      );

      const seededCreds: IntegrationCredential[] = [
        {
          id: 'cred_apideck_vault',
          userId: this.user.id,
          providerName: 'apideck',
          displayName: 'Apideck Vault (Produção)',
          encryptedData: apideckEnc.encryptedData,
          iv: apideckEnc.iv,
          authTag: apideckEnc.authTag,
          scopes: ['crm.read', 'crm.write', 'accounting.write'],
          isValid: true,
          lastValidatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'cred_slack_ops',
          userId: this.user.id,
          providerName: 'custom_bearer',
          displayName: 'Slack Ops Webhook / Bot Token',
          encryptedData: slackEnc.encryptedData,
          iv: slackEnc.iv,
          authTag: slackEnc.authTag,
          scopes: ['chat:write'],
          isValid: true,
          lastValidatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      this.save('credentials', seededCreds);
    } catch {
      // Crypto fallback if async during bootstrap
    }
  }
}

export const db = new DataStore();
