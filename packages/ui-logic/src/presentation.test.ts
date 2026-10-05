import { describe, expect, it } from 'vitest'
import type { Chronicle } from '@rpg-ngn/api-client'
import { buildSlides, captionAt, captionsFor, presentationFormat } from './presentation.js'

const chronicle: Chronicle = {
  title: 'La mina',
  pack: { id: 'pilot', version: '1', name: 'Los Nueve Viajeros' },
  players: null,
  sessions: [
    { code: '001', turns: [{ number: 1, actions: [], blocks: [
      { type: 'narration', text: 'La *campana* suena.', audioUrl: '/a1.mp3' },
      { type: 'image', url: '/i1.webp', alt: '' },
      { type: 'roll', text: 'tira', actor: 'Zahira', die: '1d20', result: 3 },
      { type: 'dialogue', speaker: 'Bren', text: 'Nadie baja hoy.' },
    ] }] },
    { code: '002', turns: [{ number: 2, actions: [], blocks: [{ type: 'image', url: '/i2.webp', alt: '' }, { type: 'narration', text: 'Amanece.' }] }] },
  ],
}

describe('presentacion de la cronica', () => {
  it('cada bloque narrado es una diapositiva con la ilustracion vista, y la primera usa la primera de la historia', () => {
    const slides = buildSlides(chronicle)
    expect(slides).toEqual([
      { image: '/i1.webp', text: 'La campana suena.', speaker: null, audioUrl: '/a1.mp3' },
      { image: '/i1.webp', text: 'Nadie baja hoy.', speaker: 'Bren', audioUrl: null },
      { image: '/i2.webp', text: 'Amanece.', speaker: null, audioUrl: null },
    ])
    expect(buildSlides(chronicle, '002').map((s) => s.text)).toEqual(['Amanece.'])
  })

  it('lo que el jugador escribio como accion no sale: la historia la cuenta el GM, y lo que el GM le hace decir si', () => {
    const played: Chronicle = {
      ...chronicle,
      sessions: [
        { code: '001', turns: [{ number: 2, actions: [{ character: 'Emiliano', text: 'Le pregunto de frente qué quiere en realidad.' }], blocks: [
          { type: 'dialogue', speaker: 'Emiliano', text: 'Le pregunto de frente qué quiere en realidad.', declared: true },
          { type: 'narration', text: 'Rogelio deja el pastel sobre la mesa.' },
          { type: 'dialogue', speaker: 'Emiliano', text: '¿Qué quieres en realidad, papá?' },
        ] }] },
      ],
    }
    expect(buildSlides(played).map((s) => s.text)).toEqual(['Rogelio deja el pastel sobre la mesa.', '¿Qué quieres en realidad, papá?'])
  })

  it('los subtitulos van de dos lineas y se reparten por lo que miden', () => {
    const captions = captionsFor('uno dos tres cuatro cinco seis siete ocho nueve diez', 10)
    expect(captions.map((c) => c.lines)).toEqual([['uno dos', 'tres'], ['cuatro', 'cinco seis'], ['siete ocho', 'nueve diez']])
    expect(captions[0]!.start).toBe(0)
    expect(captionAt(captions, 0)).toBe(0)
    expect(captionAt(captions, 0.5)).toBe(1)
    expect(captionAt(captions, 0.99)).toBe(2)
  })

  it('cada oracion empieza subtitulo y una larga se corta en las comas', () => {
    const text = 'La campana suena. Nadie baja hoy, dice Bren, mientras cierra la reja con dos vueltas de llave oxidada.'
    expect(captionsFor(text, 34).map((c) => c.lines.join(' '))).toEqual([
      'La campana suena.',
      'Nadie baja hoy, dice Bren,',
      'mientras cierra la reja con dos vueltas de llave oxidada.',
    ])
    // Una oracion que cabe no se parte aunque tenga comas.
    expect(captionsFor('Sí, claro, vamos.', 34)).toHaveLength(1)
  })

  it('una oracion larga sin comas se reparte parejo y no termina en articulo', () => {
    const text = 'Tu sangre infernal te permite distinguir en la penumbra el contorno de una puerta baja que nadie ha abierto en años.'
    const captions = captionsFor(text, 34)
    const endings = captions.map((c) => c.lines.join(' ').split(' ').pop())
    expect(endings.slice(0, -1).some((w) => ['el', 'la', 'de', 'una', 'en'].includes(w!))).toBe(false)
    expect(captions.map((c) => c.lines.join(' ')).join(' ')).toBe(text)
    // En vertical caben tres lineas: menos cortes.
    expect(captionsFor(text, 34, 3).length).toBeLessThan(captions.length + 1)
  })

  it('el formato por omision es vertical', () => {
    expect(presentationFormat(null)).toBe('vertical')
    expect(presentationFormat('horizontal')).toBe('horizontal')
  })
})
