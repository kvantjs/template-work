/**
 * FluxFlow — Ryvax.js Integration Layer
 * Powered by @kvantjs/ryvax.js v2.1.3
 * 
 * Exposes core Ryvax architecture:
 * - Rate limiting (createRateLimiter)
 * - Circuit breaker protection for external node execution (createCircuitBreaker)
 * - Safe URL assertion with policy controls (assertSafeUrl)
 * - High-speed LRU response cache (ResponseCache)
 * - Request ID generator & traces (createRequestId)
 * - Health check registry (createHealthRegistry)
 * - SSE streaming encoder (createSseStream, encodeSse)
 */

import {
  createRateLimiter,
  createCircuitBreaker,
  assertSafeUrl,
  ResponseCache,
  createRequestId,
  createHealthRegistry,
  createSseStream,
  encodeSse,
  createLogger,
} from '@kvantjs/ryvax.js';

// 1. Ryvax Logger instance
export const ryvaxLogger = createLogger({ service: 'fluxflow-ryvax' });

// 2. Ryvax Rate Limiter: 100 requests per minute window for API & Webhooks
export const ryvaxRateLimiter = createRateLimiter({
  limit: 120,
  windowMs: 60_000,
  maxKeys: 5000,
});

// 3. Ryvax Circuit Breaker for outbound HTTP requests
export const ryvaxHttpCircuitBreaker = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 15_000,
});

// 4. Ryvax Response Cache for idempotent node requests
export const ryvaxCache = new ResponseCache({
  maxEntries: 2000,
});

// 5. Ryvax Health Registry
export const ryvaxHealthRegistry = createHealthRegistry();
ryvaxHealthRegistry.register('memory', async () => {
  const mem = process.memoryUsage();
  return {
    status: mem.heapUsed < 400 * 1024 * 1024 ? 'ok' : 'degraded',
    detail: `Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    tags: ['infra', 'memory'],
  };
});
ryvaxHealthRegistry.register('engine', async () => {
  return {
    status: 'ok',
    detail: 'Ryvax.js v2.1.3 Workflow Engine ready',
    tags: ['engine', 'kvant'],
  };
});

export {
  assertSafeUrl,
  createRequestId,
  createSseStream,
  encodeSse,
};
