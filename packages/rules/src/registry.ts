import { fantasyD20Lite } from './fantasy-d20-lite.js'
import type { Ruleset } from './ruleset.js'

const rulesets: ReadonlyArray<Ruleset> = [fantasyD20Lite]

/**
 * Resuelve `id` o `id@version`. Sin version devuelve la unica disponible;
 * con version exige coincidencia exacta (BA2: reproyectar con otra version
 * del ruleset produce otro mundo, y eso tiene que ser una decision).
 */
export function resolveRuleset(ref: string): Ruleset {
  const [id, version] = ref.split('@')
  const candidates = rulesets.filter((r) => r.id === id)
  if (candidates.length === 0) {
    throw new Error(`ruleset desconocido: ${ref}`)
  }
  if (version) {
    const exact = candidates.find((r) => r.version === version)
    if (!exact) {
      throw new Error(`ruleset ${id} no tiene la version ${version} (disponibles: ${candidates.map((r) => r.version).join(', ')})`)
    }
    return exact
  }
  return candidates[0]!
}
