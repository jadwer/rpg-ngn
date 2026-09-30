import { t } from '@rpg-ngn/i18n'
import type { GmPreset, GmProviderChoice } from '@rpg-ngn/api-client'

/**
 * Presets del GM que ofrece el servidor (config/engine.php de la API): como
 * se nombran y cual se manda al crear la mesa. Las claves nunca salen de la
 * API; aqui solo se elige cual usar.
 */

// Getters: se leen en el idioma vigente (i18n). Los nombres de marca no se traducen.
const NAMES: Record<string, string> = {
  get scripted() { return t('account.presets.scripted') },
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  get ollama() { return t('account.presets.ollama') },
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
export function selectablePresets(presets: readonly GmPreset[], ownKeys: readonly string[] = []): GmPreset[] {
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
export function providerForNewTable(preset: string, defaultPreset: string): GmProviderChoice | null {
  const chosen = preset || defaultPreset
  if (!chosen) return null
  return { preset: chosen, model: null }
}

/**
 * Etiqueta de un preset en un selector: nombre, con que clave narra y su
 * modelo. Con clave propia manda eso: la mesa no usa la del servidor.
 */
export function presetOptionLabel(preset: GmPreset, ownKey = false): string {
  const whose = ownKey ? t('account.presets.withYourKey') : preset.default ? t('account.presets.server') : ''
  return `${describePreset(preset.name)}${whose}${preset.model ? `, ${preset.model}` : ''}`
}

/**
 * El mismo preset partido para pintarlo como opcion: el nombre arriba y, en
 * pequeño, quien paga y el modelo. En una sola linea se leia como cadena
 * tecnica ("Anthropic (Claude) (con tu clave, no gasta cupo), claude-sonnet-5", 27-09).
 */
export function presetOptionParts(preset: GmPreset, ownKey = false): { title: string; detail: string | null } {
  const whose = ownKey ? t('account.presets.withYourKeyShort') : preset.default ? t('account.presets.serverShort') : null
  const detail = [whose, preset.model].filter((part): part is string => !!part).join(' · ')
  return { title: describePreset(preset.name), detail: detail || null }
}

/** Mensaje tras guardar el proveedor de la mesa. */
export function savedProviderText(choice: GmProviderChoice | null): string {
  if (!choice) return t('account.presets.usesServer')
  return t('account.presets.saved', { preset: describePreset(choice.preset), model: choice.model ? t('account.presets.model', { model: choice.model }) : '' })
}
