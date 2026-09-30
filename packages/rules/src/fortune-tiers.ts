import { COURT_TIERS } from './court-intrigue.js'
import { FORTUNE_TIERS } from './fantasy-d20-lite.js'
import { MASQUERADE_TIERS } from './masquerade.js'

/**
 * Un tramo de la tirada de Fortuna. `label` es el texto en español que se
 * guarda en el estado (asi estan las campañas jugadas); `key` es estable y
 * la interfaz lo traduce (i18n, `fortune.<key>`).
 */
export interface FortuneTier {
  min: number
  max: number
  key: string
  label: string
}

/** La clave de traduccion de un tramo a partir del texto guardado; null si no es de ningun ruleset. */
export function fortuneTierKey(label: string): string | null {
  for (const tiers of [FORTUNE_TIERS, COURT_TIERS, MASQUERADE_TIERS]) {
    const tier = tiers.find((t) => t.label === label)
    if (tier) return tier.key
  }
  return null
}
