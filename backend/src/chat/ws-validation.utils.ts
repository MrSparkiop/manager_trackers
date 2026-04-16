export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0
}

export function isValidMessageType(val: unknown): boolean {
  return typeof val === 'string' && ['TEXT', 'VOICE', 'CALL'].includes(val)
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

export function isNonNegativeNumber(val: unknown): val is number {
  return typeof val === 'number' && val >= 0
}
