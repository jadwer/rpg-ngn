import type { PackCharacter, TableMember } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { freeRemoteCharacters, remoteCharacterNames, remotePortraitOf, speakerResolverFor } from './remote-pack.js'

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

describe('speakerResolverFor', () => {
  const characters = [{ id: 'shiho', name: 'Shiho', race: 'Humana', characterClass: 'Dama', quote: '', roles: [], portrait: 'portraits/shiho.webp' }]
  const npcs = [{ id: 'maomao', name: 'Maomao', portrait: 'portraits/maomao.webp' }, { id: 'suirei', name: 'Suirei', portrait: null }]
  const uriOf = (path: string) => `/api/v1/packs/private-botica/${path}`
  const resolve = speakerResolverFor({ pack: null, characters, npcs, portraitUriOf: uriOf })

  it('un NPC de un pack remoto habla con su cara, como URL de la API', () => {
    expect(resolve('npc:maomao', 'Maomao')).toEqual({ ref: 'npc:maomao', name: 'Maomao', portrait: null, portraitUri: '/api/v1/packs/private-botica/portraits/maomao.webp' })
    expect(resolve('character:shiho', null)).toEqual({ ref: 'character:shiho', name: 'Shiho', portrait: null, portraitUri: '/api/v1/packs/private-botica/portraits/shiho.webp' })
  })

  it('sin retrato en el pack, o sin estar en el pack, no inventa una cara y conserva el nombre del engine', () => {
    expect(resolve('npc:suirei', 'Suirei')).toEqual({ ref: 'npc:suirei', name: 'Suirei', portrait: null })
    expect(resolve('npc:un-eunuco', 'Un eunuco')).toEqual({ ref: 'npc:un-eunuco', name: 'Un eunuco', portrait: null })
    expect(resolve(null, 'Alguien')).toEqual({ ref: 'unknown:Alguien', name: 'Alguien', portrait: null })
  })

  it('lo que escribio el engine manda sobre el nombre del pack', () => {
    expect(resolve('npc:maomao', 'La boticaria').name).toBe('La boticaria')
  })
})
