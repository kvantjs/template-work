/**
 * Security: AES-256-GCM Cryptographic Engine & Log Secret Masking
 * Complies with Section 4.1 & 4.5 of Technical Specification.
 * Never logs raw secrets. Validates authTag for tamper prevention.
 */

export interface EncryptedPayload {
  encryptedData: string; // Base64 ciphertext
  iv: string;            // Base64 12-byte IV
  authTag: string;       // Base64 16-byte authentication tag
}

// Master encryption key fallback for local environment or derived from env
const DEFAULT_KEY_SOURCE = 'WORKFLOW_ENGINE_AES_256_GCM_SECRET_KEY_32_BYTES_V2!!';

async function deriveKey(masterSecret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(masterSecret.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Separates ciphertext and authTag (last 16 bytes of WebCrypto AES-GCM output).
 */
export async function encrypt(
  plaintext: string,
  masterKey: string = DEFAULT_KEY_SOURCE
): Promise<EncryptedPayload> {
  const key = await deriveKey(masterKey);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV for GCM
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  // AES-GCM in WebCrypto appends 16-byte tag to the ciphertext
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128, // 16 bytes authTag
    },
    key,
    encodedPlaintext
  );

  const fullEncryptedBytes = new Uint8Array(encryptedBuffer);
  const tagLength = 16;
  const cipherBytes = fullEncryptedBytes.slice(0, fullEncryptedBytes.length - tagLength);
  const tagBytes = fullEncryptedBytes.slice(fullEncryptedBytes.length - tagLength);

  return {
    encryptedData: bufferToBase64(cipherBytes.buffer),
    iv: bufferToBase64(ivBytes.buffer),
    authTag: bufferToBase64(tagBytes.buffer),
  };
}

/**
 * Decrypts an EncryptedPayload. Validates authTag authenticity.
 * Throws if authTag or data has been tampered with.
 */
export async function decrypt(
  payload: EncryptedPayload,
  masterKey: string = DEFAULT_KEY_SOURCE
): Promise<string> {
  const key = await deriveKey(masterKey);
  const ivBuffer = base64ToBuffer(payload.iv);
  const cipherBuffer = base64ToBuffer(payload.encryptedData);
  const tagBuffer = base64ToBuffer(payload.authTag);

  // Re-combine cipher + tag for WebCrypto decrypt
  const combined = new Uint8Array(cipherBuffer.byteLength + tagBuffer.byteLength);
  combined.set(new Uint8Array(cipherBuffer), 0);
  combined.set(new Uint8Array(tagBuffer), cipherBuffer.byteLength);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
        tagLength: 128,
      },
      key,
      combined
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error('Falha na autenticação AES-GCM: dados ou authTag adulterados');
  }
}

/**
 * Section 4.5: Mask secrets in execution logs.
 * Replaces known credential values and common secret token patterns with '***'.
 */
export function maskSecrets(data: any, knownSecrets: string[] = []): any {
  if (data === null || data === undefined) return data;

  const sanitizedKnownSecrets = knownSecrets
    .filter((s) => typeof s === 'string' && s.trim().length > 3)
    .map((s) => s.trim());

  function maskValue(val: any, keyName = ''): any {
    if (typeof val === 'string') {
      // Check if key name implies a secret
      const lowerKey = keyName.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('authorization')
      ) {
        return '***[MASCARADO]***';
      }

      // Check if string contains any known secret
      let masked = val;
      for (const secret of sanitizedKnownSecrets) {
        if (masked.includes(secret)) {
          masked = masked.split(secret).join('***[MASCARADO]***');
        }
      }
      return masked;
    }

    if (Array.isArray(val)) {
      return val.map((item, idx) => maskValue(item, `item_${idx}`));
    }

    if (typeof val === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        result[k] = maskValue(v, k);
      }
      return result;
    }

    return val;
  }

  return maskValue(data);
}
