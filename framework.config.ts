import type { AppConfig } from '@kvantjs/ryvax.js';

export default {
  poweredBy: false,
  cache: {
    enabled: true,
    defaultTtl: 30,
    staleWhileRevalidate: 60,
    maxEntries: 10_000,
  },
  observability: {
    requestId: true,
    requestLogging: true,
  },
  limits: {
    bodyBytes: 10 * 1024 * 1024, // 10MB para payloads de webhooks e dados de workflow
    requestTimeoutMs: 30_000,
    shutdownTimeoutMs: 10_000,
  },
} satisfies AppConfig;
