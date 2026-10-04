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

async function login(email: string): Promise<{ token: string; id: string }> {
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password: 'password', device_name: 'play-session' }) })
  const body = (await r.json()) as { token: string; user: { id: number | string } }
  return { token: body.token, id: String(body.user.id) }
}

const rawToken = async (email: string) => (await login(email)).token

async function client(email: string): Promise<{ api: ApiClient; token: string; id: string }> {
  const { token, id } = await login(email)
  const api = createApiClient({ baseUrl: API, tokenProvider: () => token })
  return { api, token, id }
}

async function post(token: string, path: string, body: unknown, media = 'application/json'): Promise<{ status: number; json: unknown }> {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': media, Accept: media, Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json().catch(() => null) }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

async function main(): Promise<void> {
  const host = await client('gabino@example.com')
  const jaz = await client('jaz@example.com')
  const armando = await client('armando@example.com')

  const created = await post(host.token, '/api/v1/tables', { data: { type: 'tables', attributes: { name: `Sesion corta ${new Date().toISOString().slice(11, 19)}`, packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', settings: { provider: { preset: 'anthropic' }, language: 'es', dice: 'engine', countdown: 0 } } } }, 'application/vnd.api+json')
  const tableId = (created.json as { data?: { id: string } }).data?.id
  if (!tableId) throw new Error(`no se creo la mesa: ${created.status} ${JSON.stringify(created.json)}`)
  console.log('mesa', tableId)

  for (const [player, email, character] of [[jaz, 'jaz@example.com', 'zahira'], [armando, 'armando@example.com', 'calder']] as const) {
    const friendship = await post(host.token, '/api/v1/friendships', { friend_id: Number(player.id) })
    const friendshipId = (friendship.json as { data?: { id: number } }).data?.id
    if (friendshipId) await post(await rawToken(email), `/api/v1/friendships/${friendshipId}/accept`, {})
    const invited = await post(host.token, `/api/v1/tables/${tableId}/members`, { user_id: Number(player.id), character_id: character })
    console.log('invitado', character, invited.status)
  }

  const table = await host.api.table(tableId)
  await host.api.openSession(table.campaignId!, '001')
  console.log('sesion 001 abierta')

  let after = 0
  let lastTurn = 0
  const perTurn = new Map<number, { words: number; milestones: string[] }>()
  let ended: unknown = null
  const players = [jaz, armando]

  for (let tick = 0; tick < 600 && !ended; tick++) {
    await sleep(2000)
    const state: TableState = await jaz.api.tableState(tableId, after)
    for (const envelope of state.blocks) {
      after = envelope.id
      const block = envelope.block
      const number = state.turn?.number ?? lastTurn
      const entry = perTurn.get(envelope.turnId) ?? { words: 0, milestones: [] }
      if (block.type === 'narration' || (block.type === 'dialogue' && !block.speakerRef?.startsWith('character:'))) entry.words += words(block.text)
      if (block.type === 'milestone') entry.milestones.push(block.title)
      if (block.type === 'ending') ended = block
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
      const idea = mine.suggestions[0] ?? 'Observo con cuidado lo que pasa.'
      await p.api.respond(turn.id, idea).catch((e: unknown) => console.log('respuesta fallo', String(e)))
    }
    await jaz.api.closeTurn(turn.id).catch((e: unknown) => console.log('cierre fallo', String(e)))
  }

  console.log('\nresumen por turno (id de turno: palabras del director, logros)')
  for (const [id, entry] of perTurn) console.log(`  ${id}: ${entry.words} palabras${entry.milestones.length ? `, logro: ${entry.milestones.join(' | ')}` : ''}`)
  console.log('\nfin:', JSON.stringify(ended, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
