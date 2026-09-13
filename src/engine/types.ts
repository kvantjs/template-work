/**
 * Workflow Engine SaaS — Core Types & Contracts
 * Compliant with Prisma schema specification and execution engine contracts.
 */

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type TriggerType = 'WEBHOOK' | 'SCHEDULE' | 'MANUAL';
export type NodeExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type NodeType =
  | 'webhook'
  | 'schedule'
  | 'manual'
  | 'http_request'
  | 'unified_api'
  | 'code_runner'
  | 'if_else'
  | 'set_fields';

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  config: Record<string, any>;
  continueOnFail?: boolean;
  maxAttempts?: number;
  backoffMs?: number;
  // Execution status preview state
  executionStatus?: NodeExecutionStatus;
  lastOutputPreview?: any;
  lastErrorPreview?: string;
  isValidConfig?: boolean;
}

export interface WorkflowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface Workflow {
  id: string;
  userId: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastExecutionStatus?: ExecutionStatus;
  lastExecutedAt?: string;
}

export interface NodeExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  input?: any;
  output?: any;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: ExecutionStatus;
  triggerType: TriggerType;
  triggerPayload?: any;
  nodesSnapshot: WorkflowNode[];
  edgesSnapshot: WorkflowEdge[];
  finalOutput?: any;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  executionTimeMs?: number | null;
  createdAt: string;
  nodeLogs: NodeExecutionLog[];
}

export interface IntegrationCredential {
  id: string;
  userId: string;
  providerName: string; // 'apideck' | 'unified' | 'custom_bearer' | 'basic_auth' | 'api_key'
  displayName?: string | null;
  encryptedData: string; // ciphertext
  iv: string; // initialization vector
  authTag: string; // GCM authentication tag
  expiresAt?: string | null;
  scopes: string[];
  lastValidatedAt?: string | null;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWebhook {
  id: string;
  workflowId: string;
  webhookPath: string;
  method: 'POST' | 'GET';
  isTestMode: boolean;
  hmacSecret?: string;
  createdAt: string;
}

export interface DecryptedCredential {
  id: string;
  providerName: string;
  data: Record<string, any>;
}

export interface NodeExecutionContext {
  workflowId: string;
  executionId: string;
  getCredential: (credentialId: string) => Promise<DecryptedCredential | null>;
  allOutputs: Record<string, any>;
  triggerPayload: any;
  onNodeProgress?: (nodeId: string, status: NodeExecutionStatus, input?: any, output?: any, error?: string) => void;
}

export interface NodeExecutionResult {
  output?: any;
  branches?: Record<string, any>; // e.g. { true: output } or { false: output }
  error?: string;
}

export interface NodeExecutor<Config = any> {
  type: NodeType;
  name: string;
  category: 'trigger' | 'action' | 'logic' | 'data';
  description: string;
  defaultConfig: Config;
  validateConfig: (config: Config) => { valid: boolean; errors: string[] };
  execute(params: {
    nodeId: string;
    config: Config;
    input: any;
    context: NodeExecutionContext;
  }): Promise<NodeExecutionResult>;
}
