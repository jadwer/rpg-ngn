/**
 * Juega una sesion corta completa contra la API y el engine vivos (docs/26,
 * H1): mesa nueva del piloto con sesiones cortas, dos jugadores que
 * responden con la primera idea del director, y polling hasta que el
 * director cierra la sesion. Imprime por turno lo que mide el plan: palabras
 * del director, logros, ilustraciones pedidas y el bloque de fin.
 *
 *   RPG_API_URL=http://127.0.0.1:8010 npx tsx scripts/play-session.mts
 */
import { createApiClient, type ApiClient, type TableState } from '@rpg-ngn/api-client'

const API = process.env['RPG_API_URL'] ?? 'http://127.0.0.1:8010'
const MAX_TURNS = Number(process.env['MAX_TURNS'] ?? 14)
/** Mundo y sesiones a jugar (por omision, el piloto en su sesion 001 con dos jugadores). */
const PACK = process.env['PACK'] ?? 'pilot'
const PACK_VERSION = process.env['PACK_VERSION'] ?? '0.4.0'
const RULESET = process.env['RULESET'] ?? 'fantasy-d20-lite@1.0.0'
const SESSIONS = (process.env['SESSIONS'] ?? '001').split(',')
const SEATS = (process.env['SEATS'] ?? 'jaz@example.com:zahira,armando@example.com:calder').split(',').map((s) => s.split(':') as [string, string])
/** Si esta, el primer jugador responde siempre esto en vez de la primera idea del GM. */
const ACTION = process.env['ACTION'] ?? null
/** Quien tira los dados. Por omision `dice`, como las mesas de produccion: el GM pide la tirada y el jugador la suelta. */
const DICE = process.env['DICE'] ?? 'dice'
/** Que idea elige cada jugador: la primera (prudente) o la segunda (atrevida). */
const PICK = Number(process.env['PICK'] ?? 0)

async function login(email: string): Promise<{ token: string; id: string }> {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password',
      device_name: 'play-session',
    }),
  })
  const body = (await r.json()) as {
    token: string
    user: { id: number | string }
  }
  return { token: body.token, id: String(body.user.id) }
}

const rawToken = async (email: string) => (await login(email)).token

async function client(email: string): Promise<{ api: ApiClient; token: string; id: string }> {
  const { token, id } = await login(email)
  const api = createApiClient({ baseUrl: API, tokenProvider: () => token })
  return { api, token, id }
}

async function post(token: string, path: string, body: unknown, media = 'application/json'): Promise<{ status: number; json: unknown }> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': media,
      Accept: media,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  return { status: r.status, json: await r.json().catch(() => null) }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

async function main(): Promise<void> {
  const host = await client(process.env['HOST'] ?? 'gabino@example.com')
  const seated = await Promise.all(
    SEATS.map(async ([email, character]) => ({
      email,
      character,
      ...(await client(email)),
    })),
  )

  const created = await post(
    host.token,
    '/api/v1/tables',
    {
      data: {
        type: 'tables',
        attributes: {
          name: `Prueba ${PACK} ${new Date().toISOString().slice(11, 19)}`,
          packId: PACK,
          packVersion: PACK_VERSION,
          ruleset: RULESET,
          settings: {
            provider: { preset: 'anthropic' },
            language: 'es',
            dice: DICE,
            countdown: 0,
            // Largo de sesion de la mesa (corta, media, larga); sin el, manda `arc.turns` del mundo o es libre.
            ...(process.env['PACING'] ? { pacing: { length: process.env['PACING'] } } : {}),
          },
        },
      },
    },
    'application/vnd.api+json',
  )
  const tableId = (created.json as { data?: { id: string } }).data?.id
  if (!tableId) throw new Error(`no se creo la mesa: ${created.status} ${JSON.stringify(created.json)}`)
  console.log('mesa', tableId)

  for (const { email, character, ...player } of seated) {
    // El anfitrion tambien puede jugar: elige su propio personaje sin invitarse.
    if (player.id === host.id) {
      console.log('anfitrion juega', character, (await post(host.token, `/api/v1/tables/${tableId}/members`, { user_id: Number(player.id), character_id: character })).status)
      continue
    }
    const friendship = await post(host.token, '/api/v1/friendships', {
      friend_id: Number(player.id),
    })
    const friendshipId = (friendship.json as { data?: { id: number } }).data?.id
    if (friendshipId) await post(await rawToken(email), `/api/v1/friendships/${friendshipId}/accept`, {})
    const invited = await post(host.token, `/api/v1/tables/${tableId}/members`, { user_id: Number(player.id), character_id: character })
    console.log('invitado', character, invited.status)
  }

  const table = await host.api.table(tableId)
  const reader = seated[0]!
  const players = seated
  const seenPrivate = new Set<string>()
  let after = 0
  for (const code of SESSIONS) {
    await host.api.openSession(table.campaignId!, code)
    console.log(`sesion ${code} abierta`)

    let lastTurn = 0
    const perTurn = new Map<number, { words: number; milestones: string[] }>()
    let ended: unknown = null

    for (let tick = 0; tick < 600 && !ended; tick++) {
      await sleep(2000)
      const state: TableState = await reader.api.tableState(tableId, after)
      for (const envelope of state.blocks) {
        after = envelope.id
        const block = envelope.block
        const number = state.turn?.number ?? lastTurn
        const entry = perTurn.get(envelope.turnId) ?? {
          words: 0,
          milestones: [],
        }
        if (block.type === 'narration' || (block.type === 'dialogue' && !block.speakerRef?.startsWith('character:'))) entry.words += words(block.text)
        if (block.type === 'milestone') entry.milestones.push(block.title)
        if (block.type === 'ending') ended = block
        if (block.type === 'narration' && process.env['SHOW_TEXT']) console.log(`    ${block.text}`)
        perTurn.set(envelope.turnId, entry)
        void number
      }
      after = state.lastBlockId
      const turn = state.turn
      if (!turn || turn.status !== 'open' || turn.number === lastTurn) continue
      lastTurn = turn.number
      if (turn.number > MAX_TURNS) break
      console.log(`turno ${turn.number} abierto ${state.pacing ? `(${state.pacing.turn} de ${state.pacing.total})` : ''}`)
      for (const p of players) {
        const mine = await p.api.tableState(tableId, 0)
        // Lo privado que ve cada asiento (susurros con `to`): para comprobar que cada uno recibe lo suyo y nada ajeno.
        if (process.env['SHOW_PRIVATE']) {
          for (const envelope of mine.blocks) {
            const block = envelope.block
            const key = `${p.character}:${envelope.id}`
            if ((block.type === 'narration' || block.type === 'dialogue') && block.to?.length && !seenPrivate.has(key)) {
              seenPrivate.add(key)
              console.log(`  [${p.character} ve privado para ${block.to.join(',')}] ${block.text.slice(0, 110)}`)
            }
          }
        }
        if (mine.suggestions.length === 0) console.log(`  ! ${p.character} abrio el turno ${turn.number} SIN IDEAS`)
        const idea = (p === players[0] && ACTION) || mine.suggestions[PICK] || mine.suggestions[0] || 'Observo con cuidado lo que pasa.'
        // Con tirada pedida, el turno del jugador es soltar el dado (y decir que intenta con el).
        if (mine.rolls.pending) {
          console.log(`  ${p.character} suelta el dado: ${mine.rolls.pending.skill ?? mine.rolls.pending.kind} (${mine.rolls.pending.reason ?? ''})`)
          await p.api.rollRequested(turn.id, mine.suggestions[PICK] ?? mine.suggestions[0]).catch((e: unknown) => console.log('tirada fallo', String(e)))
          continue
        }
        // Roles ocultos (Persefone): en una reunion cada vivo vota. El Huesped
        // vota a un tripulante; la tripulacion, a quien la ultima narracion
        // haya señalado o, si no, al primero que no sea ella misma.
        const game = mine.deduction
        if (game?.phase === 'reunion' && game.me?.role && game.me.alive) {
          const others = game.alive.filter((id) => id !== p.character)
          const suspect = process.env['SUSPECT'] && others.includes(process.env['SUSPECT']) ? process.env['SUSPECT'] : others[0]
          const target = game.me.role === 'huesped' ? (others.find((id) => id !== suspect) ?? null) : (suspect ?? null)
          await p.api.vote(turn.id, target).catch((e: unknown) => console.log('voto fallo', String(e)))
          console.log(`  ${p.character} (${game.me.role}) vota a ${target ?? 'saltar'}`)
        }
        if (game?.me && !game.me.alive && game.phase === 'reunion') continue
        await p.api.respond(turn.id, idea).catch((e: unknown) => console.log('respuesta fallo', String(e)))
      }
      await reader.api.closeTurn(turn.id).catch((e: unknown) => console.log('cierre fallo', String(e)))
    }
    console.log(`\nsesion ${code}: palabras del director y logros por turno`)
    for (const [id, entry] of perTurn) console.log(`  ${id}: ${entry.words} palabras${entry.milestones.length ? `, logro: ${entry.milestones.join(' | ')}` : ''}`)
    console.log(`sesion ${code}, fin:`, JSON.stringify(ended))
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
