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

/** Presets que se pueden elegir al crear la mesa: los configurados, con el del servidor primero. */
export function selectablePresets(presets: readonly DmPreset[]): DmPreset[] {
  return [...presets].filter((p) => p.configured).sort((a, b) => Number(b.default) - Number(a.default))
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

/** Etiqueta de un preset en un selector: nombre, si es el del servidor y su modelo. */
export function presetOptionLabel(preset: DmPreset): string {
  return `${describePreset(preset.name)}${preset.default ? ' (el del servidor)' : ''}${preset.model ? `, ${preset.model}` : ''}`
}

/** Mensaje tras guardar el proveedor de la mesa. */
export function savedProviderText(choice: DmProviderChoice | null): string {
  if (!choice) return 'La mesa usa el DM del servidor.'
  return `Guardado: ${describePreset(choice.preset)}${choice.model ? `, modelo ${choice.model}` : ''}.`
}
