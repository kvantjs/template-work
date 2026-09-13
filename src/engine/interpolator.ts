/**
 * Engine: Safe Variable & Expression Interpolation
 * Section 5.4 of Technical Specification.
 * Resolves expressions like {{node_id.output.data.email}} and {{$trigger.body.id}}
 * using purely safe path traversal without ever invoking eval or new Function.
 */

/**
 * Safely resolves a dot/bracket path against a scope object.
 * Example: getByPath(scope, "webhook_1.output.user.email")
 */
export function getByPath(target: any, path: string): any {
  if (!target || !path) return undefined;

  // Normalize path: replace [0] with .0, then split by .
  const normalizedPath = path
    .trim()
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '');

  const segments = normalizedPath.split('.');
  let current = target;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Interpolates an expression string using available scope.
 * Scope includes:
 *   - [node_id]: node outputs
 *   - $trigger: trigger payload
 *   - $env: public workflow envs
 */
export function interpolateString(template: string, scope: Record<string, any>): any {
  if (typeof template !== 'string') return template;

  const expressionRegex = /\{\{([^}]+)\}\}/g;

  // If the whole template is a single variable, preserve the raw type (object, number, bool, etc.)
  const exactMatch = template.trim().match(/^\{\{([^}]+)\}\}$/);
  if (exactMatch) {
    const expr = exactMatch[1].trim();
    const resolved = getByPath(scope, expr);
    return resolved !== undefined ? resolved : '';
  }

  // Otherwise perform string interpolation
  return template.replace(expressionRegex, (_, expr) => {
    const cleanExpr = expr.trim();
    const val = getByPath(scope, cleanExpr);
    if (val === undefined || val === null) {
      return '';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  });
}

/**
 * Recursively interpolates all string fields inside an object, array, or primitive.
 */
export function interpolateDeep<T>(value: T, scope: Record<string, any>): T {
  if (typeof value === 'string') {
    return interpolateString(value, scope) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateDeep(item, scope)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateDeep(val, scope);
    }
    return result as unknown as T;
  }

  return value;
}
