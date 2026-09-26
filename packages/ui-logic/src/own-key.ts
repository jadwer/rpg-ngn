import type { OwnKey } from '@rpg-ngn/api-client'
import { describePreset } from './dm-presets.js'

/**
 * Clave propia del usuario (BYOK): lo que la pantalla necesita saber sin
 * tocar React. La credencial nunca llega del servidor, solo `hint` con las
 * ultimas cuatro letras, asi que aqui no hay nada secreto que cuidar.
 */

/** Donde se saca cada clave, para no mandar a nadie a buscarla a ciegas. */
const CONSOLES: Record<string, string> = {
  anthropic: 'console.anthropic.com',
  openai: 'platform.openai.com',
  deepseek: 'platform.deepseek.com',
}

export function keyConsole(preset: string): string | null {
  return CONSOLES[preset] ?? null
}

/** Nombre del proveedor en la pantalla de claves. */
export function ownKeyLabel(key: OwnKey): string {
  return describePreset(key.preset)
}

/**
 * Lo que se lee debajo del nombre: si hay clave, como reconocerla; si no,
 * que pasa si la pone.
 */
export function ownKeyStatus(key: OwnKey): string {
  if (!key.configured) return 'Sin clave propia. Tus mesas usan el DM del servidor.'
  const cola = key.hint ? ` terminada en ${key.hint}` : ''
  const modelo = key.model ? `, modelo ${key.model}` : ''
  return `Clave guardada${cola}${modelo}. Tus mesas la usan y no gastan cupo.`
}

/** Si ya hay alguna clave propia puesta. */
export function hasOwnKey(keys: readonly OwnKey[]): boolean {
  return keys.some((k) => k.configured)
}

/**
 * Comprobacion local antes de mandar la clave, para no gastar una llamada
 * al proveedor con algo que obviamente no es una clave. No valida el
 * formato de cada proveedor a proposito: los prefijos cambian y rechazar
 * una clave buena es peor que dejar que el servidor la compruebe.
 */
export function ownKeyProblem(credential: string): string | null {
  const limpia = credential.trim()
  if (limpia === '') return 'Escribe tu clave.'
  if (limpia.length < 12) return 'Esa clave es demasiado corta.'
  if (/\s/.test(limpia)) return 'La clave no debe llevar espacios ni saltos de línea.'
  return null
}

/** Lo que se avisa antes de quitar una clave. */
export function removeOwnKeyWarning(key: OwnKey): string {
  return `Se borrará tu clave de ${describePreset(key.preset)}. Tus mesas volverán al DM del servidor y gastarán cupo.`
}

/**
 * Si un proveedor se puede elegir para la mesa: con clave en el servidor, o
 * con la tuya guardada (la API la acepta; VAM 26-09, D8: la web y la app lo
 * bloqueaban igual y solo decian "sin configurar"). Si no, que hacer.
 */
export function presetAvailability(preset: { name: string; configured: boolean }, ownKeys: readonly Pick<OwnKey, 'preset' | 'configured'>[]): { selectable: boolean; note: string | null } {
  if (preset.configured) return { selectable: true, note: null }
  if (ownKeys.some((k) => k.preset === preset.name && k.configured)) return { selectable: true, note: 'con tu clave' }
  return { selectable: false, note: 'sin clave en el servidor: guarda la tuya en Mi cuenta' }
}
