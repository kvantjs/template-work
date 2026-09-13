/**
 * Engine: Core Execution Orchestrator
 * Section 5.2 - 5.6 of Technical Specification.
 * Handles topological execution, conditional branches, retries, continueOnFail,
 * secret masking, and real-time step streaming.
 */

import {
  Workflow,
  WorkflowExecution,
  NodeExecutionLog,
  NodeExecutionContext,
  TriggerType,
  DecryptedCredential,
  NodeExecutionStatus,
} from './types';
import { sortNodesTopologically } from './topologicalSort';
import { getExecutor } from './registry';
import { interpolateDeep } from './interpolator';
import { maskSecrets } from './crypto';

export interface ExecuteWorkflowOptions {
  getCredential?: (id: string) => Promise<DecryptedCredential | null>;
  onNodeProgress?: (
    nodeId: string,
    status: NodeExecutionStatus,
    input?: any,
    output?: any,
    error?: string
  ) => void;
  knownSecrets?: string[];
}

/**
 * Executes a workflow end-to-end.
 */
export async function executeWorkflow(
  workflow: Workflow,
  triggerType: TriggerType,
  triggerPayload: any = {},
  options: ExecuteWorkflowOptions = {}
): Promise<WorkflowExecution> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = new Date().toISOString();
  const startTime = performance.now();

  const nodeLogs: NodeExecutionLog[] = [];
  const allOutputs: Record<string, any> = {};

  // Initialize scope with trigger payload
  allOutputs['$trigger'] = triggerPayload;

  // Topological sorting
  const sortResult = sortNodesTopologically(workflow.nodes, workflow.edges);
  if (sortResult.hasCycle) {
    const finishedAt = new Date().toISOString();
    return {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'FAILED',
      triggerType,
      triggerPayload,
      nodesSnapshot: workflow.nodes,
      edgesSnapshot: workflow.edges,
      errorMessage: sortResult.error || 'Ciclo detectado no grafo',
      startedAt,
      finishedAt,
      executionTimeMs: Math.round(performance.now() - startTime),
      createdAt: startedAt,
      nodeLogs: [],
    };
  }

  // Track skipped nodes (due to inactive conditional branches or prior failure)
  const skippedNodes = new Set<string>();
  // Track inactive branches for If/Else nodes: map of nodeId -> Set of disabled handle names
  const inactiveHandlesByNode = new Map<string, Set<string>>();

  let overallStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
  let executionErrorMessage: string | null = null;
  let finalOutput: any = null;

  // Context for node execution
  const context: NodeExecutionContext = {
    workflowId: workflow.id,
    executionId,
    getCredential: options.getCredential || (async () => null),
    allOutputs,
    triggerPayload,
    onNodeProgress: options.onNodeProgress,
  };

  // Execute nodes in topological order
  for (const node of sortResult.sortedNodes) {
    const nodeId = node.id;
    const nodeType = node.data.type;
    const logId = `log_${Date.now()}_${nodeId}`;

    // Check if node is preceded by any inactive edge
    const incomingEdges = workflow.edges.filter((e) => e.target === nodeId);
    const isSkippedDueToBranch = incomingEdges.length > 0 && incomingEdges.every((edge) => {
      const sourceInactiveHandles = inactiveHandlesByNode.get(edge.source);
      if (sourceInactiveHandles && edge.sourceHandle && sourceInactiveHandles.has(edge.sourceHandle)) {
        return true;
      }
      return skippedNodes.has(edge.source);
    });

    if (skippedNodes.has(nodeId) || isSkippedDueToBranch) {
      skippedNodes.add(nodeId);
      const skippedLog: NodeExecutionLog = {
        id: logId,
        executionId,
        nodeId,
        nodeType,
        status: 'SKIPPED',
        errorMessage: 'Ignorado devido a ramificação condicional ou falha em nó anterior.',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
      };
      nodeLogs.push(skippedLog);
      options.onNodeProgress?.(nodeId, 'SKIPPED');
      continue;
    }

    // Prepare node inputs from predecessors
    let nodeInput: any = null;
    if (incomingEdges.length === 1) {
      const parentId = incomingEdges[0].source;
      nodeInput = allOutputs[parentId] !== undefined ? allOutputs[parentId] : null;
    } else if (incomingEdges.length > 1) {
      nodeInput = {};
      incomingEdges.forEach((e) => {
        nodeInput[e.source] = allOutputs[e.source];
      });
    } else {
      // Trigger nodes have no incoming edges
      nodeInput = triggerPayload;
    }

    // Build interpolation scope
    const interpolationScope: Record<string, any> = {
      ...allOutputs,
      $trigger: triggerPayload,
      $input: nodeInput,
      $env: {
        APP_NAME: 'FluxFlow',
        NOW: new Date().toISOString(),
      },
    };

    // Interpolate node configuration
    const interpolatedConfig = interpolateDeep(node.data.config, interpolationScope);

    // Notify UI node is RUNNING
    options.onNodeProgress?.(nodeId, 'RUNNING', nodeInput);

    const nodeStartTime = performance.now();
    const nodeStartedAt = new Date().toISOString();
    let nodeExecutionSuccess = false;
    let nodeOutput: any = null;
    let nodeErrorMsg: string | null = null;

    const maxAttempts = node.data.maxAttempts || 1;
    const backoffMs = node.data.backoffMs || 200;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const executor = getExecutor(nodeType);
        const result = await executor.execute({
          nodeId,
          config: interpolatedConfig,
          input: nodeInput,
          context,
        });

        nodeOutput = result.output;
        nodeExecutionSuccess = true;

        // If node is If/Else, register inactive handles
        if (nodeType === 'if_else' && result.branches) {
          const chosenBranch = Object.keys(result.branches)[0]; // 'true' or 'false'
          const inactiveSet = new Set<string>();
          if (chosenBranch === 'true') {
            inactiveSet.add('false');
          } else {
            inactiveSet.add('true');
          }
          inactiveHandlesByNode.set(nodeId, inactiveSet);
        }

        break;
      } catch (err: any) {
        nodeErrorMsg = err.message || 'Erro durante a execução do nó';
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, backoffMs * attempt));
        }
      }
    }

    const nodeDurationMs = Math.round(performance.now() - nodeStartTime);
    const nodeFinishedAt = new Date().toISOString();

    if (nodeExecutionSuccess) {
      allOutputs[nodeId] = nodeOutput;
      finalOutput = nodeOutput;

      // Mask sensitive credentials before logging
      const maskedInput = maskSecrets(nodeInput, options.knownSecrets);
      const maskedOutput = maskSecrets(nodeOutput, options.knownSecrets);

      nodeLogs.push({
        id: logId,
        executionId,
        nodeId,
        nodeType,
        status: 'SUCCESS',
        input: maskedInput,
        output: maskedOutput,
        startedAt: nodeStartedAt,
        finishedAt: nodeFinishedAt,
        durationMs: nodeDurationMs,
      });

      options.onNodeProgress?.(nodeId, 'SUCCESS', maskedInput, maskedOutput);
    } else {
      const continueOnFail = Boolean(node.data.continueOnFail);

      const maskedInput = maskSecrets(nodeInput, options.knownSecrets);
      nodeLogs.push({
        id: logId,
        executionId,
        nodeId,
        nodeType,
        status: 'FAILED',
        input: maskedInput,
        output: null,
        errorMessage: nodeErrorMsg,
        startedAt: nodeStartedAt,
        finishedAt: nodeFinishedAt,
        durationMs: nodeDurationMs,
      });

      options.onNodeProgress?.(nodeId, 'FAILED', maskedInput, null, nodeErrorMsg || undefined);

      if (continueOnFail) {
        // Pass error as output and allow downstream nodes to proceed
        allOutputs[nodeId] = { error: nodeErrorMsg, continueOnFail: true };
      } else {
        overallStatus = 'FAILED';
        executionErrorMessage = `Falha no nó [${node.data.label || nodeId}]: ${nodeErrorMsg}`;

        // Mark all downstream nodes as SKIPPED
        const downstream = sortResult.sortedNodes.slice(sortResult.sortedNodes.indexOf(node) + 1);
        downstream.forEach((d) => skippedNodes.add(d.id));
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const totalDuration = Math.round(performance.now() - startTime);

  return {
    id: executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: overallStatus,
    triggerType,
    triggerPayload: maskSecrets(triggerPayload, options.knownSecrets),
    nodesSnapshot: workflow.nodes,
    edgesSnapshot: workflow.edges,
    finalOutput: maskSecrets(finalOutput, options.knownSecrets),
    errorMessage: executionErrorMessage,
    startedAt,
    finishedAt,
    executionTimeMs: totalDuration,
    createdAt: startedAt,
    nodeLogs,
  };
}
