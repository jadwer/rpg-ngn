import type { PackOption } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { characterNameFrom, packOptionLabel, packSummaryText, premisePlaceholder, tableCardMeta, tableNamePlaceholder } from './table-copy.js'

const pack = (over: Partial<PackOption> = {}): PackOption => ({
  id: 'pilot',
  version: '0.4.0',
  type: 'campaign',
  name: 'Los Nueve Viajeros',
  tagline: 'Diferentes caminos, un mismo destino',
  system: 'fantasy-d20-lite',
  characters: 9,
  sessions: 3,
  ...over,
})

describe('table-copy', () => {
  it('los ejemplos hablan del pack elegido, no siempre del piloto', () => {
    const botica = pack({ name: 'El té que nadie probó', tagline: 'Alguien sabía que ella no estaría' })

    expect(tableNamePlaceholder(botica)).toBe('El té que nadie probó, sábado')
    expect(premisePlaceholder(botica)).toContain('El té que nadie probó')
    expect(premisePlaceholder(botica)).toContain('Alguien sabía que ella no estaría')
    // Lo que no puede pasar: que el ejemplo hable de otro mundo.
    expect(premisePlaceholder(botica)).not.toContain('Valdoria')
  })

  it('sin pack todavia, el ejemplo es neutro y no menciona ninguno', () => {
    expect(tableNamePlaceholder(null)).toBe('La mesa del sábado')
    expect(premisePlaceholder(null)).not.toContain('Valdoria')
    expect(premisePlaceholder(null)).not.toContain('Nueve Viajeros')
  })

  it('un pack sin lema no deja un hueco raro en el ejemplo', () => {
    const sinLema = pack({ name: 'Algo', tagline: null })
    expect(premisePlaceholder(sinLema)).toContain('Jugamos Algo.')
    expect(premisePlaceholder(sinLema)).not.toContain('..')
  })

  it('el lema no se pega a la frase siguiente ni anida comillas', () => {
    // Se leia: "Jugamos Los Nueve Viajeros. Diferentes caminos Tono de misterio".
    expect(premisePlaceholder(pack())).toContain('Diferentes caminos, un mismo destino. Tono de misterio')
    // El ejemplo entero ya va entre comillas; el lema no lleva las suyas.
    expect(premisePlaceholder(pack())).not.toContain('"Diferentes')
    // Un lema que ya trae punto no acaba con dos.
    expect(premisePlaceholder(pack({ tagline: 'Alguien sabía que ella no estaría.' }))).not.toContain('..')
  })

  it('la opcion del selector no lleva la version ni el nombre del sistema', () => {
    expect(packOptionLabel(pack())).toBe('Los Nueve Viajeros (campaña)')
    expect(packOptionLabel(pack({ type: 'setting', name: 'Valdoria' }))).toBe('Valdoria (mundo)')
    expect(packOptionLabel(pack())).not.toContain('0.4.0')
    expect(packOptionLabel(pack())).not.toContain('fantasy-d20-lite')
  })

  it('resume el pack en lo que le importa a quien elige', () => {
    expect(packSummaryText(pack())).toBe('Diferentes caminos, un mismo destino (9 personajes, 3 sesiones escritas)')
    // Singulares bien puestos.
    expect(packSummaryText(pack({ characters: 1, sessions: 1 }))).toContain('1 personaje, 1 sesión escrita')
    // Sin lema, al menos se dice con qué sistema se juega.
    expect(packSummaryText(pack({ tagline: null }))).toContain('Sistema fantasy-d20-lite')
    expect(packSummaryText(null)).toBeNull()
  })

  it('el nombre remoto gana cuando el cliente no lleva ese pack dentro', () => {
    const piloto = { characters: new Map([['narivyl', { name: 'Narivyl' }]]) }
    const remoto = { shiho: 'Shiho' }

    // Lo que se veia en produccion: "juegas a shiho", con el id en minuscula.
    expect(characterNameFrom(piloto, remoto, 'shiho')).toBe('Shiho')
    // El pack empaquetado sigue mandando sobre el catalogo remoto.
    expect(characterNameFrom(piloto, { narivyl: 'Otro' }, 'narivyl')).toBe('Narivyl')
    // Sin nadie que lo conozca, el id es lo unico que queda.
    expect(characterNameFrom(piloto, {}, 'nadie')).toBe('nadie')
    expect(characterNameFrom(null, remoto, 'shiho')).toBe('Shiho')
  })

  it('la tarjeta de mesa dice el nombre del pack, no su id y version', () => {
    const packs = [pack(), pack({ id: 'private-botica', name: 'El té que nadie probó' })]

    expect(tableCardMeta({ packId: 'private-botica', packVersion: '0.1.0', premise: 'Algo' }, packs)).toBe('El té que nadie probó · con premisa')
    expect(tableCardMeta({ packId: 'pilot', packVersion: '0.4.0' }, packs)).toBe('Los Nueve Viajeros')
    // Sin catalogo cargado, el id es mejor que nada y no rompe la tarjeta.
    expect(tableCardMeta({ packId: 'pilot', packVersion: '0.4.0' })).toBe('pilot')
  })
})
