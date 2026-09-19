import { blocksForSeat, narration, speechQueue, system } from '@rpg-ngn/ui-logic'
import { describe, expect, it } from 'vitest'

/**
 * El modo pantalla es un asiento, no un estilo. Lo que se comparte por OBS
 * (y lo que el TTS lee en voz alta) tiene que ser lo que veria un jugador.
 * Antes el bloque de anfitrion se escondia con CSS y la voz lo leia igual.
 */
describe('modo pantalla como asiento', () => {
  const bloques = [
    narration('b1', 'La posada huele a estofado.'),
    system('b2', { text: 'El DM propuso 1 linea que no se pudo aplicar.', audience: 'host', detail: 'revela el secreto osric-esta-abajo' }),
    narration('b3', 'Afuera suena la campana.'),
  ]

  it('en pantalla, el anfitrion deja de ver y de oir los bloques solo para el', () => {
    const isHost = true
    const screen = true
    const visibles = blocksForSeat(bloques, isHost && !screen)
    expect(visibles.map((b) => b.id)).toEqual(['b1', 'b3'])

    // La cola de voz sale de los mismos bloques, asi que tampoco los lee.
    const cola = speechQueue(visibles)
    expect(cola.map((i) => i.text).join(' ')).not.toContain('osric')
    expect(cola.map((i) => i.text).join(' ')).not.toContain('no se pudo aplicar')
  })

  it('fuera de pantalla, el anfitrion sigue viendo sus avisos', () => {
    const isHost = true
    const screen = false
    const visibles = blocksForSeat(bloques, isHost && !screen)
    expect(visibles.map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])
  })

  it('un jugador nunca los ve, este o no en pantalla', () => {
    expect(blocksForSeat(bloques, false).map((b) => b.id)).toEqual(['b1', 'b3'])
  })
})
