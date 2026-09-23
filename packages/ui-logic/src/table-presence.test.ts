import { describe, expect, it } from 'vitest'
import { COUNTDOWN_SECONDS, countdown, countdownLine, seats, seatsSummary, waitingPhrase, WAITING_PHRASES, type SeatMember } from './table-presence.js'
import { turnProgress, type TurnSummary } from './turn.js'

const nameOf = (id: string) => ({ zahira: 'Zahira', calder: 'Calder', kael: 'Kael' })[id] ?? id

const members: SeatMember[] = [
  { id: 1, role: 'host', characterId: 'zahira', userName: 'Jaz' },
  { id: 2, role: 'player', characterId: 'calder', userName: 'Armando' },
  { id: 3, role: 'player', characterId: 'kael', userName: 'Gabi', present: false },
  { id: 4, role: 'player', characterId: null, userName: 'Mirona' },
]

const open: TurnSummary = { status: 'open', required: ['zahira', 'calder', 'kael'], responded: ['zahira'], error: null }

describe('seats', () => {
  it('da un estado por persona: listo, escribiendo, pensando, fuera, mirando', () => {
    const list = seats({ members, turn: open, typing: [{ memberId: 2, characterId: 'calder' }], narrators: [], viewerMemberId: 2, nameOf })
    expect(list.map((s) => [s.name, s.state, s.mine])).toEqual([
      ['Zahira', 'ready', false],
      ['Calder', 'writing', true],
      ['Kael', 'away', false],
      ['Mirona', 'watching', false],
    ])
  })

  it('quien no ha respondido ni escribe esta pensando; narrar manda sobre lo demas', () => {
    const list = seats({ members, turn: open, typing: [], narrators: [{ memberId: 2, characterId: 'calder' }], viewerMemberId: 1, nameOf })
    expect(list[1]?.state).toBe('narrating')
    const sin = seats({ members, turn: open, typing: [], narrators: [], viewerMemberId: 1, nameOf })
    expect(sin[1]?.state).toBe('thinking')
  })

  it('sin turno abierto nadie piensa ni escribe', () => {
    const list = seats({ members, turn: null, typing: [{ memberId: 2, characterId: 'calder' }], narrators: [], viewerMemberId: 1, nameOf })
    expect(list.map((s) => s.state)).toEqual(['ready', 'ready', 'away', 'watching'])
  })

  it('resume la mesa en una frase', () => {
    const base = seats({ members, turn: open, typing: [], narrators: [], viewerMemberId: 1, nameOf })
    expect(seatsSummary(base)).toBe('1 de 2 listos')
    const escribiendo = seats({ members, turn: open, typing: [{ memberId: 2, characterId: 'calder' }], narrators: [], viewerMemberId: 1, nameOf })
    expect(seatsSummary(escribiendo)).toBe('Calder está escribiendo')
    const todos = seats({ members, turn: { ...open, responded: ['zahira', 'calder'] }, typing: [], narrators: [], viewerMemberId: 1, nameOf })
    expect(seatsSummary(todos)).toBe('Todos listos')
    expect(seatsSummary([])).toBe('Nadie sentado todavía')
  })
})

describe('countdown', () => {
  const complete = { status: 'open' as const, required: ['zahira'], responded: ['zahira'], error: null, completedAt: '2026-09-22T23:00:00.000Z' }
  const progress = turnProgress(complete, { role: 'player', characterId: 'zahira' })
  const t0 = 1_000_000
  const at = (now: number, turn = complete, startedAt: number | null = t0) => countdown({ turn, progress: turnProgress(turn, { role: 'player', characterId: 'zahira' }), startedAt, now, nameOf })

  it('corre desde que este cliente vio el turno completo', () => {
    expect(at(t0)).toMatchObject({ active: true, remaining: COUNTDOWN_SECONDS, held: false })
    expect(at(t0 + 3200).remaining).toBe(7)
    expect(at(t0 + 10_000).remaining).toBe(0)
    expect(at(t0 + 60_000).remaining).toBe(0)
  })

  it('no corre mientras falte alguien, ni con el turno cerrado, ni sin completedAt, ni sin arranque', () => {
    expect(at(t0, { ...complete, required: ['zahira', 'calder'] }).active).toBe(false)
    expect(at(t0, { ...complete, status: 'closing' }).active).toBe(false)
    expect(at(t0, { ...complete, completedAt: null }).active).toBe(false)
    expect(at(t0, complete, null).active).toBe(false)
    expect(countdown({ turn: null, progress, startedAt: t0, now: t0 }).active).toBe(false)
  })

  it('en espera se detiene y dice quien la pidio', () => {
    const held = at(t0 + 5000, { ...complete, held: true, heldBy: { characterId: 'calder', name: 'Armando' } })
    expect(held).toEqual({ active: false, remaining: COUNTDOWN_SECONDS, held: true, heldByName: 'Calder' })
    expect(countdownLine(held)).toBe('En espera: Calder pidió un momento.')
    const sinNombre = at(t0, { ...complete, held: true, heldBy: null })
    expect(countdownLine(sinNombre)).toBe('En espera: alguien pidió un momento.')
  })

  it('la frase cuenta y al llegar a cero anuncia', () => {
    expect(countdownLine(at(t0 + 2500))).toBe('El director narra en 8 s')
    expect(countdownLine(at(t0 + 12_000))).toBe('El director narra...')
    expect(countdownLine(countdown({ turn: null, progress, startedAt: t0, now: t0 }))).toBe('')
  })
})

describe('waitingPhrase', () => {
  it('es estable dentro de la ventana y cambia entre ventanas', () => {
    expect(waitingPhrase(3, 1000)).toBe(waitingPhrase(3, 5999))
    expect(waitingPhrase(3, 1000)).not.toBe(waitingPhrase(3, 6001))
    expect(WAITING_PHRASES).toContain(waitingPhrase(9, 123_456))
  })
})
