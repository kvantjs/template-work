/**
 * Security: SSRF (Server-Side Request Forgery) Protection
 * Section 4.3 of Technical Specification.
 * Blocks private IP subnets, loopback, and cloud metadata endpoints (AWS/GCP 169.254.169.254).
 */

export interface SsrfValidationResult {
  allowed: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

// Banned hostnames, suffixes, and metadata endpoints
const BANNED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS / GCP / Azure metadata service
  'metadata.google.internal',
  'metadata.google.internal.',
  'instance-data',
  'localtest.me',
  'vcap.me',
  'nip.io',
  'sslip.io',
]);

/**
 * Checks whether an IPv4 address belongs to a private/reserved subnet.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN) || parts.some((p) => p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private A)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private B)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private C)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/**
 * Validates a target URL against SSRF rules before dispatching HTTP Request nodes.
 */
export function validateUrlForSsrf(rawUrl: string): SsrfValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { allowed: false, reason: 'URL inválida ou vazia.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { allowed: false, reason: 'URL malformada.' };
  }

  // Must be http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      allowed: false,
      reason: `Protocolo '${parsed.protocol}' rejeitado por segurança. Apenas http: e https: são permitidos.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Check explicit banned hostnames
  if (BANNED_HOSTNAMES.has(hostname)) {
    return {
      allowed: false,
      reason: `Acesso bloqueado por proteção SSRF: host restrito (${hostname}). Acesso a metadados de nuvem e loopback é proibido.`,
    };
  }

  // Check if hostname is directly an IPv4 address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return {
        allowed: false,
        reason: `Acesso bloqueado por proteção SSRF: IP privado ou reservado detectado (${hostname}).`,
      };
    }
  }

  // Check IPv6 loopback / unique local / link-local
  if (
    hostname === '::1' ||
    hostname.startsWith('fe80:') ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fd00:')
  ) {
    return {
      allowed: false,
      reason: 'Acesso bloqueado por proteção SSRF: endereço IPv6 privado ou link-local.',
    };
  }

  return {
    allowed: true,
    sanitizedUrl: parsed.toString(),
  };
}
