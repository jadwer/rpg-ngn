import { describe, expect, it } from 'vitest'
import { latestRecap, latestSceneImage, withoutImages, type TurnBlock } from './blocks.js'

const recap = (id: string, text: string): TurnBlock => ({ kind: 'system', id, title: 'Anteriormente...', text, items: [], audience: 'table', tone: 'info', detail: null, recap: true })

describe('latestRecap', () => {
  it('devuelve el ultimo "Anteriormente..." y null si no hay', () => {
    const narration: TurnBlock = { kind: 'narration', id: 'n', text: 'Amanece.' }
    expect(latestRecap([narration])).toBeNull()
    expect(latestRecap([recap('a', 'Sesion 1'), narration, recap('b', 'Sesion 2'), narration])?.text).toBe('Sesion 2')
  })
})

describe('latestSceneImage', () => {
  it('la ultima ilustracion es el fondo y sale del texto', () => {
    const image = (id: string): TurnBlock => ({ kind: 'image', id, url: `/api/v1/scenes/${id}.webp`, alt: id, caption: null })
    const narration: TurnBlock = { kind: 'narration', id: 'n', text: 'Amanece.' }
    const blocks = [image('a'), narration, image('b'), narration]
    expect(latestSceneImage(blocks)?.id).toBe('b')
    expect(latestSceneImage([narration])).toBeNull()
    expect(withoutImages(blocks).map((b) => b.kind)).toEqual(['narration', 'narration'])
  })
})
