import type { DialogueBlock, NarrationBlock, RollBlock, SystemBlock, TurnBlock } from './blocks.js'
import { splitSentences } from './narration.js'

/**
 * Las dos vistas de docs/09 son dos formas de pintar el mismo array de
 * bloques. Aqui se decide que entra en cada una y como se agrupa; el
 * componente solo recorre grupos. En la narrativa los dialogos van
 * intercalados con la prosa; en la de dialogo la prosa se comprime a un
 * extracto y las intervenciones (dialogos y tiradas) llevan retrato.
 */

export type ViewMode = 'narrative' | 'dialogue'

export interface ProseGroup {
  kind: 'prose'
  id: string
  blocks: NarrationBlock[]
  /** En la vista de dialogo la prosa se pinta comprimida. */
  compressed: boolean
}

export interface DialogueGroup {
  kind: 'dialogue'
  id: string
  blocks: DialogueBlock[]
}

export interface RollGroup {
  kind: 'roll'
  id: string
  block: RollBlock
}

export interface SystemGroup {
  kind: 'system'
  id: string
  block: SystemBlock
}

export type ViewGroup = ProseGroup | DialogueGroup | RollGroup | SystemGroup

export function groupBlocks(blocks: readonly TurnBlock[], mode: ViewMode): ViewGroup[] {
  const groups: ViewGroup[] = []
  for (const block of blocks) {
    const last = groups[groups.length - 1]
    switch (block.kind) {
      case 'narration':
        if (last?.kind === 'prose') {
          last.blocks.push(block)
        } else {
          groups.push({ kind: 'prose', id: `prose:${block.id}`, blocks: [block], compressed: mode === 'dialogue' })
        }
        break
      case 'dialogue':
        if (last?.kind === 'dialogue') {
          last.blocks.push(block)
        } else {
          groups.push({ kind: 'dialogue', id: `dialogue:${block.id}`, blocks: [block] })
        }
        break
      case 'roll':
        groups.push({ kind: 'roll', id: `roll:${block.id}`, block })
        break
      case 'system':
        groups.push({ kind: 'system', id: `system:${block.id}`, block })
        break
    }
  }
  return groups
}

/** Extracto de un grupo de prosa comprimido: la primera oracion y cuantas quedan. */
export function proseExcerpt(group: ProseGroup, maxChars = 140): { excerpt: string; remaining: number } {
  const sentences = group.blocks.flatMap((b) => splitSentences(b.text))
  const first = sentences[0] ?? ''
  const excerpt = first.length > maxChars ? `${first.slice(0, maxChars - 1).trimEnd()}…` : first
  return { excerpt, remaining: Math.max(0, sentences.length - 1) }
}

/** Ids de los bloques que forman un grupo, para resaltar el que el TTS esta leyendo. */
export function groupBlockIds(group: ViewGroup): string[] {
  switch (group.kind) {
    case 'prose':
    case 'dialogue':
      return group.blocks.map((b) => b.id)
    case 'roll':
    case 'system':
      return [group.block.id]
  }
}
