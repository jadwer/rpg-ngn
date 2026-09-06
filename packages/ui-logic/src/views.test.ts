import { describe, expect, it } from 'vitest'
import { dialogue, narration, system, type RollBlock, type TurnBlock } from './blocks.js'
import { groupBlockIds, groupBlocks, proseExcerpt } from './views.js'

const speaker = { ref: 'character:zahira', name: 'Zahira', portrait: 'portraits/zahira.jpg' }
const roll: RollBlock = { kind: 'roll', id: 'r1', actor: speaker, rollKind: 'skill', die: '1d20', result: 7, label: 'Sigilo', advantage: null, text: 'Zahira tira 1d20 de sigilo: 7.' }

const blocks: TurnBlock[] = [
  system('s1', { title: 'Sesión', text: 'Briefing.' }),
  narration('n1', 'Llovía sobre Valdoria.'),
  narration('n2', 'El guardia abrió. Nadie preguntó nada.'),
  dialogue('d1', speaker, 'Pequeña estatura, grandes hazañas.'),
  dialogue('d2', { ...speaker, ref: 'npc:osric', name: 'Osric', portrait: null }, 'Vete.'),
  roll,
  narration('n3', 'Al volver, la casa estaba a oscuras.'),
]

describe('groupBlocks', () => {
  it('en narrativa agrupa la prosa consecutiva y los dialogos consecutivos, sin comprimir', () => {
    const groups = groupBlocks(blocks, 'narrative')
    expect(groups.map((g) => g.kind)).toEqual(['system', 'prose', 'dialogue', 'roll', 'prose'])
    expect(groups[1]).toMatchObject({ kind: 'prose', compressed: false })
    expect(groupBlockIds(groups[1]!)).toEqual(['n1', 'n2'])
    expect(groupBlockIds(groups[2]!)).toEqual(['d1', 'd2'])
    expect(groupBlockIds(groups[3]!)).toEqual(['r1'])
  })

  it('en dialogo son los mismos grupos, con la prosa comprimida', () => {
    const groups = groupBlocks(blocks, 'dialogue')
    expect(groups.map((g) => g.kind)).toEqual(['system', 'prose', 'dialogue', 'roll', 'prose'])
    expect(groups.filter((g) => g.kind === 'prose').every((g) => g.kind === 'prose' && g.compressed)).toBe(true)
  })

  it('no muta los bloques de entrada', () => {
    const copy = structuredClone(blocks)
    groupBlocks(blocks, 'dialogue')
    expect(blocks).toEqual(copy)
  })
})

describe('proseExcerpt', () => {
  it('devuelve la primera oracion y cuantas quedan', () => {
    const prose = groupBlocks(blocks, 'dialogue')[1]!
    expect(prose.kind === 'prose' && proseExcerpt(prose)).toEqual({ excerpt: 'Llovía sobre Valdoria.', remaining: 2 })
  })

  it('recorta una primera oracion demasiado larga', () => {
    const group = groupBlocks([narration('x', 'a'.repeat(200) + '.')], 'dialogue')[0]!
    const { excerpt, remaining } = proseExcerpt(group as never, 20)
    expect(excerpt).toHaveLength(20)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(remaining).toBe(0)
  })
})
