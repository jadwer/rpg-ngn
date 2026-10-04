import { t } from '@rpg-ngn/i18n'
/**
 * Bloques tipados de un turno (docs/09, "Lectura"). Un turno del GM, o una
 * sesion offline construida desde el pack, es un array de bloques; cada
 * vista (narrativa, dialogo) decide como pinta cada tipo y el TTS los lee
 * de uno en uno. Nada aqui sabe de React ni de Expo.
 */

export interface Speaker {
  /** `character:zahira`, `npc:osric`. */
  ref: string
  name: string
  /** Ruta relativa al pack empaquetado, o null si no hay retrato. */
  portrait: string | null
  /**
   * Retrato de un pack que el cliente NO lleva empaquetado, ya como URL que
   * sirve la API. Cuando esta, manda sobre `portrait`.
   */
  portraitUri?: string | null
}

export interface NarrationBlock {
  kind: 'narration'
  id: string
  text: string
}

export interface DialogueBlock {
  kind: 'dialogue'
  id: string
  speaker: Speaker
  text: string
}

export interface RollBlock {
  kind: 'roll'
  id: string
  actor: Speaker | null
  /** `fortune`, `skill`, `social`, `rest`, `attack`... lo que el ruleset registre. */
  rollKind: string
  die: string
  result: number
  /** Cada dado por separado cuando se conocen (ventaja, desventaja, 2d6); null si solo hay total. */
  rolls: number[] | null
  /** Etiqueta corta para la UI: `Fortuna`, `sigilo`, `medicina`. */
  label: string
  advantage: 'advantage' | 'disadvantage' | null
  /** Frase completa, lista para pintar y para leer en voz alta. */
  text: string
  /** La pidio el GM y la resolvio el servidor cuando el jugador solto el dado (modo `dice`). */
  requested?: true
}

export interface SystemBlock {
  kind: 'system'
  id: string
  title: string | null
  text: string | null
  /** Lista de puntos (como se juega, cabos sueltos, tabla de Fortuna). */
  items: string[]
  /** `host` solo lo ve el anfitrion; `table` lo ve todo el mundo. */
  audience: 'table' | 'host'
  /** `action` pide algo a quien lo lee; `info` solo informa. */
  tone: 'info' | 'action'
  /** Explicacion larga, para el anfitrion. */
  detail: string | null
  /** Es el "Anteriormente..." de la apertura (E10c). */
  recap?: boolean
}

/** Ilustracion de la escena (E10a). `url` como la manda la API: relativa a su servidor. */
export interface ImageBlock {
  kind: 'image'
  id: string
  url: string
  alt: string
  caption: string | null
}

/** Un logro de la sesion (docs/26, H1): lo que la mesa acaba de conseguir. */
export interface MilestoneBlock {
  kind: 'milestone'
  id: string
  title: string
}

/** Fin de una sesion, capitulo o historia (docs/26, H1): la pantalla de fin sale de aqui. */
export interface EndingBlock {
  kind: 'ending'
  id: string
  scope: 'session' | 'chapter' | 'story'
  /** Codigo de la sesion que cierra ("003"). */
  session: string
  title: string | null
  text: string | null
  achievements: string[]
  cliffhanger: string | null
  closedBy: 'director' | 'host'
}

export type TurnBlock = NarrationBlock | DialogueBlock | RollBlock | SystemBlock | ImageBlock | MilestoneBlock | EndingBlock
export type BlockKind = TurnBlock['kind']

export function narration(id: string, text: string): NarrationBlock {
  return { kind: 'narration', id, text }
}

export function dialogue(id: string, speaker: Speaker, text: string): DialogueBlock {
  return { kind: 'dialogue', id, speaker, text }
}

export function system(
  id: string,
  fields: { title?: string | null; text?: string | null; items?: string[]; audience?: 'table' | 'host'; tone?: 'info' | 'action'; detail?: string | null },
): SystemBlock {
  return {
    kind: 'system',
    id,
    title: fields.title ?? null,
    text: fields.text ?? null,
    items: fields.items ?? [],
    audience: fields.audience ?? 'table',
    tone: fields.tone ?? 'info',
    detail: fields.detail ?? null,
  }
}

/**
 * Texto que el TTS lee de un bloque. Los dialogos anteponen el nombre para
 * que se entienda quien habla; los bloques de sistema leen titulo, texto y
 * puntos en ese orden.
 */
export function speechTextOf(block: TurnBlock): string {
  switch (block.kind) {
    case 'narration':
      return block.text
    case 'dialogue':
      return `${block.speaker.name}: ${block.text}`
    case 'roll':
      return block.text
    case 'system':
      return [block.title, block.text, ...block.items].filter((part): part is string => !!part).join('. ')
    case 'image':
      // Una imagen no se lee en voz alta: la narracion ya conto la escena.
      return ''
    case 'milestone':
      return t('ending.milestoneSpoken', { title: block.title })
    case 'ending':
      // El fin lo enseña la pantalla completa; la voz no lo repite.
      return ''
  }
}

/** El fin de sesion mas reciente, si es el ultimo bloque que importa: la pantalla de fin sale de aqui. */
export function latestEnding(blocks: readonly TurnBlock[]): EndingBlock | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block?.kind === 'ending') return block
    // Si despues del fin ya hay historia nueva (otra sesion), el fin ya paso.
    if (block && (block.kind === 'narration' || block.kind === 'dialogue')) return null
  }
  return null
}

/**
 * El "Anteriormente..." mas reciente (E10c): lo que se enseña al entrar a
 * una mesa con la sesion abierta. Null si la sesion no trae (la primera de
 * la campaña no tiene nada que resumir).
 */
export function latestRecap(blocks: readonly TurnBlock[]): SystemBlock | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block?.kind === 'system' && block.recap) return block
  }
  return null
}

/**
 * La ilustracion mas reciente (E10a): en la mesa es el fondo de la escena y
 * no un bloque mas entre el texto (Gabino, 24-09). Null si no hay ninguna.
 */
export function latestSceneImage(blocks: readonly TurnBlock[]): ImageBlock | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block?.kind === 'image') return block
  }
  return null
}

/** Los bloques sin ilustraciones: la mesa las pinta de fondo. */
export function withoutImages(blocks: readonly TurnBlock[]): TurnBlock[] {
  return blocks.filter((block) => block.kind !== 'image')
}
