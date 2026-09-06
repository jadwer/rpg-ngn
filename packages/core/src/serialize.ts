/**
 * JSON determinista: claves ordenadas, sin `undefined`, indentacion fija.
 * Es lo que hace comparables byte a byte dos snapshots (BA2): el mismo
 * estado produce siempre el mismo texto, venga de donde venga.
 */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(normalize(value), null, indent) + '\n'
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : normalize(item)))
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      const item = record[key]
      if (item !== undefined) out[key] = normalize(item)
    }
    return out
  }
  return value
}
