import { describe, expect, it } from 'vitest'
import { sceneImagesHint, sceneImagesOn, withSceneImages } from './scene-images.js'

describe('ilustraciones de la mesa', () => {
  it('encendidas si nadie eligio; apagadas solo con false explicito', () => {
    expect(sceneImagesOn(null)).toBe(true)
    expect(sceneImagesOn({ dice: 'engine' })).toBe(true)
    expect(sceneImagesOn({ images: false })).toBe(false)
  })

  it('cambiar el ajuste conserva lo demas', () => {
    expect(withSceneImages({ dice: 'engine', premise: 'x' }, false)).toEqual({ dice: 'engine', premise: 'x', images: false })
  })

  it('el tope del texto sale de la API y no se inventa si falta', () => {
    expect(sceneImagesHint(true, 12)).toContain('hasta 12 por sesión')
    expect(sceneImagesHint(true, null)).not.toMatch(/hasta \d/)
    expect(sceneImagesHint(false, 12)).toBe('La mesa juega solo con texto.')
  })
})
