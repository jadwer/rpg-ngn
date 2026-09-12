import type { DmPreset, DmProviderChoice } from '@rpg-ngn/api-client'

/** Nombres legibles de los presets del servidor (config/engine.php de la API). */
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
 * Lo que se manda al crear la mesa: nada si el anfitrion dejo el preset del
 * servidor (asi la mesa sigue al servidor si cambia), o el preset elegido.
 */
export function providerForNewTable(preset: string, defaultPreset: string): DmProviderChoice | null {
  if (!preset || preset === defaultPreset) return null
  return { preset, model: null }
}
