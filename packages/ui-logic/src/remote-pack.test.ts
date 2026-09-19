import type { PackCharacter, TableMember } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { freeRemoteCharacters, remoteCharacterNames, remotePortraitOf } from './remote-pack.js'

const c = (id: string, name: string): PackCharacter => ({ id, name, race: 'Humana', characterClass: 'Dama', quote: '', roles: [], portrait: `portraits/${id}.jpg` })
const m = (id: string, characterId: string | null): TableMember => ({ id, userId: `u-${id}`, userName: id, role: 'player', characterId })

describe('remote-pack', () => {
  const botica = [c('ryomen', 'Ryomen'), c('shiho', 'Shiho'), c('kogen', 'Kogen')]

  it('deja fuera a los que ya juega alguien', () => {
    const members = [m('1', 'shiho'), m('2', null)]
    expect(freeRemoteCharacters(botica, members).map((x) => x.id)).toEqual(['ryomen', 'kogen'])
  })

  it('da los nombres por id, para que la mesa no diga "shiho"', () => {
    expect(remoteCharacterNames(botica)).toEqual({ ryomen: 'Ryomen', shiho: 'Shiho', kogen: 'Kogen' })
  })

  it('encuentra el retrato por id y no se cae sin id', () => {
    expect(remotePortraitOf(botica, 'kogen')).toBe('portraits/kogen.jpg')
    expect(remotePortraitOf(botica, 'nadie')).toBeNull()
    expect(remotePortraitOf(botica, null)).toBeNull()
  })
})
