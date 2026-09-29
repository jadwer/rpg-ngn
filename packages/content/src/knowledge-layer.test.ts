import { describe, expect, it } from 'vitest'
import { KnowledgeLayer } from './event.js'

describe('capa de conocimiento', () => {
  it('lee la capa con el nombre de antes del renombre a GM y la guarda como gm', () => {
    expect(KnowledgeLayer.parse('dm')).toBe('gm')
    expect(KnowledgeLayer.parse('gm')).toBe('gm')
    expect(KnowledgeLayer.safeParse('mazmorra').success).toBe(false)
  })
})
