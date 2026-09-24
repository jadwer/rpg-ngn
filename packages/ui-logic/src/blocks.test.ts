import { describe, expect, it } from 'vitest'
import { latestRecap, type TurnBlock } from './blocks.js'

const recap = (id: string, text: string): TurnBlock => ({ kind: 'system', id, title: 'Anteriormente...', text, items: [], audience: 'table', tone: 'info', detail: null, recap: true })

describe('latestRecap', () => {
  it('devuelve el ultimo "Anteriormente..." y null si no hay', () => {
    const narration: TurnBlock = { kind: 'narration', id: 'n', text: 'Amanece.' }
    expect(latestRecap([narration])).toBeNull()
    expect(latestRecap([recap('a', 'Sesion 1'), narration, recap('b', 'Sesion 2'), narration])?.text).toBe('Sesion 2')
  })
})
