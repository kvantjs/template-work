/**
 * Engine: Topological Sort & DAG Cycle Detection
 * Section 5.2 of Technical Specification.
 * Orders nodes starting from triggers, detects cycles, and indexes dependencies.
 */

import { WorkflowNode, WorkflowEdge } from './types';

export interface TopologicalSortResult {
  sortedNodes: WorkflowNode[];
  sortedNodeIds: string[];
  adjacency: Map<string, string[]>;
  predecessors: Map<string, string[]>;
  hasCycle: boolean;
  error?: string;
}

/**
 * Computes topological ordering of a workflow DAG using Kahn's algorithm.
 */
export function sortNodesTopologically(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): TopologicalSortResult {
  const nodeMap = new Map<string, WorkflowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const adjacency = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adjacency.set(n.id, []);
    predecessors.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  // Populate edges
  edges.forEach((edge) => {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      predecessors.get(edge.target)!.push(edge.source);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });

  // Queue initial nodes with 0 in-degree.
  // Prioritize trigger nodes (webhook, schedule, manual) first
  const queue: string[] = [];
  const triggerTypes = new Set(['webhook', 'schedule', 'manual']);

  nodes.forEach((node) => {
    if ((inDegree.get(node.id) || 0) === 0) {
      if (triggerTypes.has(node.data.type)) {
        queue.unshift(node.id);
      } else {
        queue.push(node.id);
      }
    }
  });

  const sortedNodeIds: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    sortedNodeIds.push(currentId);

    const neighbors = adjacency.get(currentId) || [];
    for (const neighborId of neighbors) {
      const currentInDegree = inDegree.get(neighborId)! - 1;
      inDegree.set(neighborId, currentInDegree);
      if (currentInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  const hasCycle = sortedNodeIds.length < nodes.length;

  return {
    sortedNodes: sortedNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean),
    sortedNodeIds,
    adjacency,
    predecessors,
    hasCycle,
    error: hasCycle ? 'Detectado ciclo no grafo de execução do workflow' : undefined,
  };
}

/**
 * Finds all upstream node IDs that precede a given target node.
 * Used by the Variable Picker tree in the UI!
 */
export function getUpstreamNodeIds(
  targetNodeId: string,
  predecessors: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const queue = [...(predecessors.get(targetNodeId) || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      const parents = predecessors.get(current) || [];
      queue.push(...parents);
    }
  }

  return Array.from(visited);
}
