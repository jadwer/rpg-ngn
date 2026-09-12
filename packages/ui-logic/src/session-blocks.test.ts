import { beforeAll, describe, expect, it } from 'vitest'
import { speechTextOf } from './blocks.js'
import { fortuneLabel, LABELS, sessionBlocks } from './session-blocks.js'
import { loadPilot, sessionOf, type Pilot } from './pilot.test-helpers.js'

let pilot: Pilot
beforeAll(async () => {
  pilot = await loadPilot()
})

describe('sessionBlocks con el pack piloto', () => {
  it('la sesion 002 (jugada): briefing, intro de la party, recap partido, registro, cabos, reglas y Fortuna', () => {
    const session = sessionOf(pilot.pack, '002')
    const blocks = sessionBlocks({ pack: pilot.pack, session, state: pilot.state, events: pilot.events })
    const kinds = blocks.map((b) => b.kind)

    expect(blocks[0]).toMatchObject({ kind: 'system', id: '002:briefing', title: session.title, text: session.briefing })

    const intros = blocks.filter((b) => b.kind === 'dialogue')
    expect(intros.map((b) => b.speaker.name)).toEqual(['Calder', 'Narivyl', 'Zahira'])
    expect(intros.every((b) => b.speaker.portrait?.startsWith('portraits/'))).toBe(true)

    const recap = blocks.filter((b) => b.kind === 'narration')
    expect(recap.length).toBeGreaterThan(2)
    expect(recap.map((b) => b.text).join(' ')).toBe(session.recap)
    expect(recap.every((b) => b.text.length <= 320)).toBe(true)

    const rolls = blocks.filter((b) => b.kind === 'roll')
    expect(rolls).toHaveLength(11)
    expect(rolls[0]).toMatchObject({ rollKind: 'fortune', result: 6, label: 'Fortuna', actor: { name: 'Zahira' } })
    expect(rolls[0]!.text).toBe('Zahira tira 1d20 de Fortuna: 6 (Incómodo).')
    expect(rolls.find((r) => r.id === '002:roll:evt-00010')!.text).toBe('Zahira tira 1d20 de sigilo con desventaja: 7.')
    expect(rolls.find((r) => r.id === '002:roll:evt-00009')!.text).toBe('Narivyl tira 1d20 (social) contra Osric: 15.')
    expect(rolls.find((r) => r.id === '002:roll:evt-00013')!.text).toBe('Narivyl tira 1d20 de medicina contra Zahira: 14.')

    const worldEvents = blocks.filter((b) => b.kind === 'system' && b.title === LABELS.worldEvent)
    expect(worldEvents).toHaveLength(2)

    const threads = blocks.find((b) => b.kind === 'system' && b.title === LABELS.openThreads)!
    expect(threads.kind === 'system' && threads.items).toEqual(session.openThreads)

    const howTo = blocks.find((b) => b.id === '002:how-to-play')!
    expect(howTo.kind === 'system' && howTo.items).toEqual(session.howToPlay)
    const fortune = blocks.find((b) => b.id === '002:fortune')!
    expect(fortune.kind === 'system' && fortune.items[0]).toBe('1-3: Mala suerte')
    expect(blocks.find((b) => b.id === '002:notes')).toMatchObject({ kind: 'system', text: session.notes })

    expect(kinds.indexOf('narration')).toBeGreaterThan(kinds.lastIndexOf('dialogue'))
    expect(kinds.indexOf('roll')).toBeGreaterThan(kinds.lastIndexOf('narration'))
    expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length)
  })

  it('la sesion 003 (planeada): solo briefing, como se juega, Fortuna y notas; sin recap, cabos ni dialogos', () => {
    const session = sessionOf(pilot.pack, '003')
    const blocks = sessionBlocks({ pack: pilot.pack, session, state: pilot.state, events: pilot.events })
    expect(blocks.map((b) => b.id)).toEqual(['003:briefing', '003:how-to-play', '003:fortune', '003:notes'])
    expect(blocks.every((b) => b.kind === 'system')).toBe(true)
  })

  it('la sesion 001 no tiene eventos en el log: recap y cabos, sin registro', () => {
    const session = sessionOf(pilot.pack, '001')
    const blocks = sessionBlocks({ pack: pilot.pack, session, state: pilot.state, events: pilot.events })
    expect(blocks.some((b) => b.kind === 'roll')).toBe(false)
    expect(blocks.some((b) => b.id === '001:ledger')).toBe(false)
    expect(blocks.filter((b) => b.kind === 'narration').length).toBeGreaterThan(0)
    expect(blocks.filter((b) => b.kind === 'dialogue').map((b) => b.speaker.name)).toEqual(['Calder', 'Narivyl'])
  })

  it('sin eventos ni estado sigue produciendo la sesion', () => {
    const blocks = sessionBlocks({ pack: pilot.pack, session: sessionOf(pilot.pack, '002') })
    expect(blocks.some((b) => b.kind === 'narration')).toBe(true)
    expect(blocks.some((b) => b.kind === 'roll')).toBe(false)
  })

  it('un evento de la capa dm nunca entra al registro', () => {
    const session = sessionOf(pilot.pack, '002')
    const secret = { ...pilot.events[1]!, id: 'evt-99999', visibility: { layer: 'dm' as const } } as (typeof pilot.events)[number]
    const blocks = sessionBlocks({ pack: pilot.pack, session, events: [...pilot.events, secret] })
    expect(blocks.some((b) => b.id.endsWith('evt-99999'))).toBe(false)
  })

  it('todos los bloques tienen texto para el TTS', () => {
    const blocks = sessionBlocks({ pack: pilot.pack, session: sessionOf(pilot.pack, '002'), events: pilot.events })
    for (const block of blocks) expect(speechTextOf(block).length, block.id).toBeGreaterThan(0)
    expect(speechTextOf(blocks[0]!)).toContain(sessionOf(pilot.pack, '002').briefing)
  })
})

describe('fortuneLabel', () => {
  it('resuelve rangos y el 20 suelto', () => {
    const session = sessionOf(pilot.pack, '002')
    expect(fortuneLabel(session, 1)).toBe('Mala suerte')
    expect(fortuneLabel(session, 6)).toBe('Incómodo')
    expect(fortuneLabel(session, 14)).toBe('Normal')
    expect(fortuneLabel(session, 20)).toBe('Destino')
    expect(fortuneLabel(session, 21)).toBeNull()
  })
})
