import type { DmPreset, DmProviderChoice } from '@rpg-ngn/api-client'

/**
 * Presets del DM que ofrece el servidor (config/engine.php de la API): como
 * se nombran y cual se manda al crear la mesa. Las claves nunca salen de la
 * API; aqui solo se elige cual usar.
 */

const NAMES: Record<string, string> = {
  scripted: 'DM con guion (sin modelo)',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  ollama: 'Ollama (modelo local en la red)',
}

export function describePreset(name: string): string {
  return NAMES[name] ?? name
}

/**
 * Presets que se pueden elegir al crear la mesa: los configurados en el
 * servidor y los que tienen clave propia de quien crea (Gabino, 25-09: con su
 * clave guardada, la pantalla de crear mesa no la ofrecia). El del servidor
 * primero; si hay clave propia, esos antes.
 */
export function selectablePresets(presets: readonly DmPreset[], ownKeys: readonly string[] = []): DmPreset[] {
  const own = new Set(ownKeys)
  return [...presets]
    .filter((p) => p.configured || own.has(p.name))
    .sort((a, b) => Number(own.has(b.name)) - Number(own.has(a.name)) || Number(b.default) - Number(a.default))
}

/**
 * Lo que se manda al crear la mesa. Desde la entrega 7 el proveedor es
 * obligatorio al crear: se manda siempre el preset elegido, aunque sea el
 * del servidor. Quien abre la mesa decide con que se narra y que cuesta, y
 * eso queda escrito en la mesa en vez de depender de la configuracion del
 * servidor en ese momento.
 *
 * `defaultPreset` sigue en la firma porque la UI lo usa para preseleccionar,
 * y devolvemos null solo si no hay ninguno elegido (la API lo rechaza).
 */
export function providerForNewTable(preset: string, defaultPreset: string): DmProviderChoice | null {
  const chosen = preset || defaultPreset
  if (!chosen) return null
  return { preset: chosen, model: null }
}

/**
 * Etiqueta de un preset en un selector: nombre, con que clave narra y su
 * modelo. Con clave propia manda eso: la mesa no usa la del servidor.
 */
export function presetOptionLabel(preset: DmPreset, ownKey = false): string {
  const whose = ownKey ? ' (con tu clave, no gasta cupo)' : preset.default ? ' (el del servidor)' : ''
  return `${describePreset(preset.name)}${whose}${preset.model ? `, ${preset.model}` : ''}`
}

/** Mensaje tras guardar el proveedor de la mesa. */
export function savedProviderText(choice: DmProviderChoice | null): string {
  if (!choice) return 'La mesa usa el DM del servidor.'
  return `Guardado: ${describePreset(choice.preset)}${choice.model ? `, modelo ${choice.model}` : ''}.`
}
