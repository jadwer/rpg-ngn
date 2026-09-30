import type { Issue } from './issues.js'

/**
 * Traduccion de un pack (i18n). `i18n/<idioma>/<ruta>` es un parcial del
 * archivo base con solo los textos: el loader lo mezcla antes de validar,
 * asi que ids, referencias, numeros y enums siguen siendo los del original
 * y una campaña jugada en un idioma se entiende en el otro.
 *
 * - Objetos: clave a clave; una clave que el original no tiene se avisa y se ignora.
 * - Listas de objetos con `id`: se casan por `id`; sin `id`, por posicion.
 * - Listas de textos (habilidades, palabras clave): la traduccion las sustituye enteras.
 * - `id`, referencias (`character:zahira`) y rutas de archivo nunca se traducen.
 */
export function applyOverlay(base: unknown, patch: unknown, path: string, issues: Issue[], at = ''): unknown {
  if (patch === undefined) return base

  if (isObject(base) && isObject(patch)) {
    const merged: Record<string, unknown> = { ...base }
    for (const [key, value] of Object.entries(patch)) {
      const where = at ? `${at}.${key}` : key
      if (key === 'id') continue
      if (!(key in base)) {
        issues.push({ level: 'warning', path, message: `${where}: el original no tiene esa clave; se ignora` })
        continue
      }
      merged[key] = applyOverlay(base[key], value, path, issues, where)
    }
    return merged
  }

  if (Array.isArray(base) && Array.isArray(patch)) {
    if (base.every((item) => typeof item === 'string')) {
      if (patch.every((item) => typeof item === 'string')) return patch
      issues.push({ level: 'warning', path, message: `${at}: se esperaba una lista de textos; se ignora` })
      return base
    }
    if (base.every((item) => isObject(item) && typeof item['id'] === 'string')) {
      const byId = new Map(patch.filter(isObject).map((item) => [item['id'], item]))
      for (const id of byId.keys()) {
        if (!base.some((item) => (item as Record<string, unknown>)['id'] === id)) {
          issues.push({ level: 'warning', path, message: `${at}: ${String(id)} no esta en el original; se ignora` })
        }
      }
      return base.map((item) => {
        const id = (item as Record<string, unknown>)['id']
        return applyOverlay(item, byId.get(id), path, issues, `${at}[${String(id)}]`)
      })
    }
    if (patch.length !== base.length) {
      issues.push({ level: 'warning', path, message: `${at}: ${patch.length} elementos contra ${base.length} del original; se ignora` })
      return base
    }
    return base.map((item, i) => applyOverlay(item, patch[i], path, issues, `${at}[${i}]`))
  }

  if (typeof base === 'string' && typeof patch === 'string') {
    if (isRefOrFile(base) && patch !== base) {
      issues.push({ level: 'warning', path, message: `${at}: ${base} es una referencia o un archivo y no se traduce` })
      return base
    }
    return patch
  }

  if (patch !== base) issues.push({ level: 'warning', path, message: `${at}: solo se traducen textos; se ignora` })
  return base
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `character:zahira`, `fact:brorg-pago`, `portraits/zahira.webp`. */
function isRefOrFile(value: string): boolean {
  return /^[a-z]+:[a-z0-9-]+$/.test(value) || /^[\w./-]+\.(webp|png|jpe?g|json)$/i.test(value)
}
