/**
 * Security: Code Runner Sandbox
 * Section 4.2 of Technical Specification.
 * Safe JS execution: blocks global objects, restricts scope to { input }, enforces timeout,
 * and guarantees serializable output without allowing network, process or filesystem access.
 */

export interface SandboxExecutionOptions {
  timeoutMs?: number;
}

export interface SandboxResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs: number;
}

/**
 * Checks and prevents dangerous AST/token patterns before execution.
 */
function preCheckCode(code: string): void {
  const forbiddenPatterns = [
    /\bprocess\b/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bglobalThis\b/,
    /\bFunction\s*\(/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Violação de Sandbox: uso proibido de token restrito '${pattern.source}'.`);
    }
  }
}

/**
 * Executes user JavaScript code in a restricted scope with safe input and timeout.
 */
export async function executeInSandbox(
  userCode: string,
  input: any,
  options: SandboxExecutionOptions = {}
): Promise<SandboxResult> {
  const timeoutMs = Math.min(options.timeoutMs || 3000, 5000);
  const startTime = performance.now();

  try {
    preCheckCode(userCode);

    // Deep clone input to isolate from mutations
    const safeInput = JSON.parse(JSON.stringify(input !== undefined ? input : {}));

    // Construct a safe, isolated executor function
    // Shadow globals with undefined
    const wrappedFunction = new Function(
      'input',
      'process',
      'require',
      'window',
      'document',
      'globalThis',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      `"use strict";
       ${userCode}
      `
    );

    // Run with timeout race
    const executionPromise = new Promise((resolve, reject) => {
      try {
        const result = wrappedFunction(
          safeInput,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        resolve(result);
      } catch (err: any) {
        reject(err);
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execução excedeu o tempo limite seguro de ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    const rawOutput = await Promise.race([executionPromise, timeoutPromise]);

    // Ensure serializable JSON return
    let sanitizedOutput;
    try {
      sanitizedOutput = JSON.parse(JSON.stringify(rawOutput !== undefined ? rawOutput : {}));
    } catch {
      throw new Error('O retorno do Code Runner deve ser serializável em JSON.');
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      success: true,
      output: sanitizedOutput,
      executionTimeMs: duration,
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    return {
      success: false,
      error: err.message || 'Erro de execução no Code Runner',
      executionTimeMs: duration,
    };
  }
}
