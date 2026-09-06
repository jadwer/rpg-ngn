import { describe, expect, it } from 'vitest'
import { splitNarration, splitParagraphs, splitSentences } from './narration.js'

describe('splitSentences', () => {
  it('corta tras punto, exclamacion, interrogacion y puntos suspensivos', () => {
    expect(splitSentences('Llovía. ¿Quién anda ahí? ¡Nadie! Silencio… Y luego nada.')).toEqual([
      'Llovía.',
      '¿Quién anda ahí?',
      '¡Nadie!',
      'Silencio…',
      'Y luego nada.',
    ])
  })

  it('no corta ante minuscula ni en cifras decimales', () => {
    expect(splitSentences('Pagó 3.5 monedas. y se fue. Nadie lo vio.')).toEqual(['Pagó 3.5 monedas. y se fue.', 'Nadie lo vio.'])
  })

  it('mantiene las comillas de cierre con su oracion', () => {
    expect(splitSentences('Dijo "vete." Y se fue.')).toEqual(['Dijo "vete."', 'Y se fue.'])
  })

  it('devuelve el resto sin puntuacion final como ultima oracion', () => {
    expect(splitSentences('Una frase. Otra sin punto')).toEqual(['Una frase.', 'Otra sin punto'])
  })
})

describe('splitParagraphs', () => {
  it('separa por lineas en blanco y normaliza espacios', () => {
    expect(splitParagraphs('Uno\ndos.\n\n\n  Tres.  \n')).toEqual(['Uno dos.', 'Tres.'])
  })
})

describe('splitNarration', () => {
  it('agrupa oraciones sin pasar del maximo y nunca mezcla parrafos', () => {
    const text = 'Aaaa aaaa. Bbbb bbbb. Cccc cccc.\n\nDddd dddd.'
    expect(splitNarration(text, { maxChars: 22 })).toEqual(['Aaaa aaaa. Bbbb bbbb.', 'Cccc cccc.', 'Dddd dddd.'])
  })

  it('deja entera una oracion mas larga que el maximo', () => {
    expect(splitNarration('Una oración larguísima que no cabe. Corta.', { maxChars: 10 })).toEqual(['Una oración larguísima que no cabe.', 'Corta.'])
  })

  it('devuelve vacio para texto vacio', () => {
    expect(splitNarration('   \n\n ')).toEqual([])
  })
})
