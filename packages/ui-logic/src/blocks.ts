/**
 * Bloques tipados de un turno (docs/09, "Lectura"). Un turno del DM, o una
 * sesion offline construida desde el pack, es un array de bloques; cada
 * vista (narrativa, dialogo) decide como pinta cada tipo y el TTS los lee
 * de uno en uno. Nada aqui sabe de React ni de Expo.
 */

export interface Speaker {
  /** `character:zahira`, `npc:osric`. */
  ref: string
  name: string
  /** Ruta relativa al pack, o null si no hay retrato. */
  portrait: string | null
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
  /** Etiqueta corta para la UI: `Fortuna`, `sigilo`, `medicina`. */
  label: string
  advantage: 'advantage' | 'disadvantage' | null
  /** Frase completa, lista para pintar y para leer en voz alta. */
  text: string
}

export interface SystemBlock {
  kind: 'system'
  id: string
  title: string | null
  text: string | null
  /** Lista de puntos (como se juega, cabos sueltos, tabla de Fortuna). */
  items: string[]
}

export type TurnBlock = NarrationBlock | DialogueBlock | RollBlock | SystemBlock
export type BlockKind = TurnBlock['kind']

export function narration(id: string, text: string): NarrationBlock {
  return { kind: 'narration', id, text }
}

export function dialogue(id: string, speaker: Speaker, text: string): DialogueBlock {
  return { kind: 'dialogue', id, speaker, text }
}

export function system(id: string, fields: { title?: string | null; text?: string | null; items?: string[] }): SystemBlock {
  return { kind: 'system', id, title: fields.title ?? null, text: fields.text ?? null, items: fields.items ?? [] }
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
  }
}
