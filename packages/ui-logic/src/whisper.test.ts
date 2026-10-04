import { describe, expect, it } from 'vitest'
import type { TurnBlock } from './blocks.js'
import { blocksForSeat, groupBlocks } from './views.js'

/** Lo privado en los clientes (docs/26, H7): la defensa detras del filtro de la API. */
describe('susurros en la mesa', () => {
  const blocks: TurnBlock[] = [
    { kind: 'narration', id: '1', text: 'La campana suena.' },
    { kind: 'narration', id: '2', text: 'Solo tú notas el cordel.', to: ['zahira'] },
  ]

  it('cada quien ve solo los suyos, y la pantalla compartida ninguno', () => {
    expect(blocksForSeat(blocks, false, { characterId: 'zahira' }).map((b) => b.id)).toEqual(['1', '2'])
    expect(blocksForSeat(blocks, true, { characterId: 'calder' }).map((b) => b.id)).toEqual(['1'])
    expect(blocksForSeat(blocks, false, { characterId: 'zahira', shared: true }).map((b) => b.id)).toEqual(['1'])
  })

  it('un susurro va en su propio grupo, no mezclado con la narracion', () => {
    expect(groupBlocks(blocks, 'narrative').map((g) => g.kind)).toEqual(['prose', 'whisper'])
  })
})
