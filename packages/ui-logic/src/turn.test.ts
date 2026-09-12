import { beforeAll, describe, expect, it } from 'vitest'
import type { LoadedPack } from '@rpg-ngn/content'
import { loadPilot } from './pilot.test-helpers.js'
import { groupBlocks } from './views.js'
import { speechQueue } from './tts.js'
import { apiBlockId, blocksFromApi, packSpeakerResolver, turnProgress, turnStatusLine, type ApiBlockEnvelope, type TurnSummary } from './turn.js'

/** Los cuatro bloques que dejo el smoke real contra API y engine (turno 1 de la sesion 003). */
const envelopes: ApiBlockEnvelope[] = [
  { id: 1, block: { type: 'system', text: 'Turno 1: el DM escucha a la mesa.' } },
  { id: 2, block: { type: 'dialogue', speaker: 'Calder', speakerRef: 'character:calder', text: 'La sigo de cerca, con la llave en la mano.' } },
  { id: 3, block: { type: 'dialogue', speaker: 'Zahira', speakerRef: 'character:zahira', text: 'Miro la campana de bronce con cuidado.' } },
  { id: 4, block: { type: 'narration', text: 'El DM toma nota de lo que Calder y Zahira declaran. La mesa tiene la palabra.' } },
]

describe('blocksFromApi', () => {
  let pack: LoadedPack
  beforeAll(async () => {
    pack = (await loadPilot()).pack
  })

  it('convierte los bloques del contrato en bloques de ui-logic con retrato del pack', () => {
    const blocks = blocksFromApi(envelopes, packSpeakerResolver(pack))
    expect(blocks.map((b) => b.kind)).toEqual(['system', 'dialogue', 'dialogue', 'narration'])
    expect(blocks.map((b) => b.id)).toEqual(['api:1', 'api:2', 'api:3', 'api:4'])
    const calder = blocks[1]
    expect(calder?.kind === 'dialogue' && calder.speaker).toEqual({ ref: 'character:calder', name: 'Calder', portrait: 'portraits/calder.jpg' })
    expect(apiBlockId(9)).toBe('api:9')
  })

  it('un hablante que no esta en el pack conserva el nombre que escribio el engine', () => {
    const blocks = blocksFromApi([{ id: 5, block: { type: 'dialogue', speaker: 'Osric', speakerRef: 'npc:osric', text: 'Vete.' } }], packSpeakerResolver(pack))
    expect(blocks[0]?.kind === 'dialogue' && blocks[0].speaker).toEqual({ ref: 'npc:osric', name: 'Osric', portrait: null })
    const noPack = blocksFromApi([{ id: 6, block: { type: 'dialogue', speaker: 'Zahira', speakerRef: 'character:zahira', text: 'Hola.' } }], packSpeakerResolver(null))
    expect(noPack[0]?.kind === 'dialogue' && noPack[0].speaker.name).toBe('Zahira')
  })

  it('las tiradas y el sistema entran a las vistas y a la cola de TTS como los offline', () => {
    const roll: ApiBlockEnvelope = { id: 7, block: { type: 'roll', text: 'Zahira tira 1d20: 14.', actor: 'character:zahira', die: '1d20', result: 14 } }
    const blocks = blocksFromApi([...envelopes, roll], packSpeakerResolver(pack))
    const groups = groupBlocks(blocks, 'dialogue')
    expect(groups.map((g) => g.kind)).toEqual(['system', 'dialogue', 'prose', 'roll'])
    const last = blocks[4]
    expect(last?.kind === 'roll' && last.actor?.name).toBe('Zahira')
    expect(speechQueue(blocks).map((i) => i.text)[1]).toBe('Calder: La sigo de cerca, con la llave en la mano.')
  })
})

describe('turnProgress', () => {
  const open: TurnSummary = { status: 'open', required: ['zahira', 'calder'], responded: ['calder'], error: null }
  const nameOf = (id: string) => ({ zahira: 'Zahira', calder: 'Calder' })[id] ?? id

  it('sin turno no se puede nada', () => {
    const progress = turnProgress(null, { role: 'player', characterId: 'zahira' })
    expect(progress).toMatchObject({ canRespond: false, canClose: false, pending: [] })
    expect(turnStatusLine(null, progress, nameOf)).toBe('No hay turno abierto.')
  })

  it('el que falta puede responder; el que ya respondio, no; nadie cierra todavia', () => {
    const zahira = turnProgress(open, { role: 'player', characterId: 'zahira' })
    expect(zahira).toMatchObject({ pending: ['zahira'], responded: ['calder'], complete: false, canRespond: true, hasResponded: false, canClose: false, canForceClose: false })
    expect(turnStatusLine(open, zahira, nameOf)).toBe('Faltan: Zahira.')

    const calder = turnProgress(open, { role: 'player', characterId: 'calder' })
    expect(calder).toMatchObject({ canRespond: false, hasResponded: true, canClose: false })
  })

  it('el DM sin personaje no responde pero puede forzar el cierre con faltantes', () => {
    const dm = turnProgress(open, { role: 'host', characterId: null })
    expect(dm).toMatchObject({ canRespond: false, canClose: false, canForceClose: true })
  })

  it('con todos los obligatorios cualquiera cierra, incluso quien no fue interpelado', () => {
    const complete: TurnSummary = { ...open, responded: ['calder', 'zahira'] }
    const other = turnProgress(complete, { role: 'player', characterId: 'kael' })
    expect(other).toMatchObject({ complete: true, canRespond: true, canClose: true, canForceClose: false })
    expect(turnStatusLine(complete, other, nameOf)).toBe('Todos respondieron; cualquiera puede cerrar el turno.')
  })

  it('mientras el DM narra no se responde ni se cierra, y el error del engine reabre', () => {
    const closing = turnProgress({ ...open, status: 'closing' }, { role: 'player', characterId: 'zahira' })
    expect(closing).toMatchObject({ narrating: true, canRespond: false, canClose: false })
    expect(turnStatusLine({ ...open, status: 'closing' }, closing, nameOf)).toBe('El DM esta narrando...')

    const reopened: TurnSummary = { status: 'open', required: ['zahira'], responded: ['zahira'], error: 'el DM propuso un evento invalido' }
    const progress = turnProgress(reopened, { role: 'player', characterId: 'zahira' })
    expect(progress).toMatchObject({ canClose: true, hasResponded: true })
    expect(reopened.error).toContain('invalido')
  })
})
