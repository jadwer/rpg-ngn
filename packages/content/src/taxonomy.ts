/**
 * Vocabularios controlados del catalogo (docs/26, H8). El mundo los declara
 * por slug en su `catalog`; las etiquetas traducidas viven en i18n
 * (`taxonomy.*`) y, desde H9, el indice para filtrar vive en atomo/taxonomy.
 * Un slug nuevo se agrega aqui primero: el validador rechaza los demas.
 */

/** Formato de la historia. Ya existia como `catalog.format`. */
export const STORY_FORMATS = ['one-shot', 'aventura', 'campaña'] as const

/** Largo de sesion que recomienda el mundo; la mesa lo puede cambiar si la sesion no trae arco. */
export const SESSION_LENGTHS = ['corta', 'media', 'larga'] as const

/** Generos: de uno a tres por mundo. */
export const GENRES = ['misterio', 'policiaca', 'terror', 'romance', 'drama', 'comedia', 'fantasia', 'ciencia-ficcion', 'intriga', 'aventura', 'venganza', 'historico'] as const

/**
 * Como se cuenta: `historia` (te la cuentan desde el protagonista, con
 * cierre y sin mision que cumplir), `mision` (un objetivo abierto que la
 * mesa persigue) o `libre` (el mundo y su gente; la mesa decide).
 */
export const STORY_STYLES = ['historia', 'mision', 'libre'] as const

/** Un jugador, grupo o ambos: se deriva de `players`, no se declara. */
export const PLAY_MODES = ['solo', 'grupo'] as const

export type Genre = (typeof GENRES)[number]
export type StoryStyle = (typeof STORY_STYLES)[number]
export type PlayMode = (typeof PLAY_MODES)[number]

/** Para quien es un mundo segun sus jugadores: max 1 es solo, min 2 es grupo, si no, ambos. */
export function playModesOf(players: { min: number; max: number }): PlayMode[] {
  if (players.max <= 1) return ['solo']
  if (players.min >= 2) return ['grupo']
  return ['solo', 'grupo']
}
