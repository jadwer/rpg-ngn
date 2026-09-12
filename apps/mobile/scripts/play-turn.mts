/**
 * Juega un turno completo contra la API y el engine vivos usando solo
 * @rpg-ngn/api-client (lo mismo que hace la app): mesa nueva, amistades e
 * invitaciones (aqui por fetch directo, para que el smoke no dependa de la
 * UI), sesion abierta por el anfitrion, respuestas de jaz y armando, cierre,
 * polling hasta que el engine narra y el turno 2 abre, y cierre de sesion
 * por el anfitrion. El asiento se llama `dm` en la API; el DM es la IA.
 */
import { ApiError, createApiClient, memberOf, type ApiClient } from '@rpg-ngn/api-client'

const API = process.env['RPG_API_URL'] ?? 'http://127.0.0.1:8010'

async function loginAs(email: string): Promise<{ api: ApiClient; id: string }> {
  let token: string | null = null
  const api = createApiClient({ baseUrl: API, tokenProvider: () => token })
  const result = await api.login(email, 'password', 'play-turn')
  token = result.token
  return { api, id: result.user.id }
}

async function command(token: string, path: string, body: unknown): Promise<number> {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  return r.status
}

async function rawToken(email: string): Promise<string> {
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password: 'password', device_name: 'play-turn-raw' }) })
  return ((await r.json()) as { token: string }).token
}

const log = (label: string, value: unknown) => console.log(`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)

async function main(): Promise<void> {
  const host = await loginAs('gabino@example.com')
  const jaz = await loginAs('jaz@example.com')
  const armando = await loginAs('armando@example.com')
  const hostToken = await rawToken('gabino@example.com')

  // Mesa nueva por JSON:API, como hace la pantalla Crear mesa.
  const created = await fetch(`${API}/api/v1/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ data: { type: 'tables', attributes: { name: `Play ${new Date().toISOString().slice(11, 19)}`, packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0' } } }),
  })
  const tableId = ((await created.json()) as { data: { id: string } }).data.id
  log('mesa', tableId)

  for (const [player, character] of [[jaz, 'zahira'], [armando, 'calder']] as const) {
    const friendship = await fetch(`${API}/api/v1/friendships`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${hostToken}` }, body: JSON.stringify({ friend_id: Number(player.id) }) })
    const friendshipId = ((await friendship.json()) as { data?: { id: number } }).data?.id
    const accepted = await command(await rawToken(player.id === jaz.id ? 'jaz@example.com' : 'armando@example.com'), `/api/v1/friendships/${friendshipId}/accept`, {})
    const invited = await command(hostToken, `/api/v1/tables/${tableId}/members`, { user_id: Number(player.id), character_id: character })
    log(`amistad e invitacion (${character})`, { accepted, invited })
  }

  const table = await jaz.api.table(tableId)
  log('mesa vista por jaz', { campaignId: table.campaignId, me: memberOf(table, jaz.id), members: table.members.map((m) => `${m.userName}:${m.role}:${m.characterId}`) })
  const campaignId = table.campaignId!

  const forbidden = await jaz.api.openSession(campaignId, '003').catch((e: unknown) => e)
  log('jaz intenta abrir sesion', forbidden instanceof ApiError ? `${forbidden.status} ${forbidden.message}` : 'sin error (mal)')

  const turn = await host.api.openSession(campaignId, '003', 'Valdoria, tres dias despues')
  log('sesion abierta por el anfitrion', { turn: turn.id, number: turn.number, status: turn.status, required: turn.required })

  const r1 = await jaz.api.respond(turn.id, 'Miro la campana de bronce con cuidado.')
  const r2 = await armando.api.respond(turn.id, 'La sigo de cerca, con la llave en la mano.')
  const dup = await jaz.api.respond(turn.id, 'Otra cosa.').catch((e: unknown) => e)
  log('respuestas', { zahira: r1.created, calder: r2.created, segundaDeZahira: dup instanceof ApiError ? `${dup.status} ${dup.message}` : 'aceptada (mal)' })

  const state1 = await armando.api.tableState(tableId)
  log('estado antes de cerrar', { turn: state1.turn?.status, responded: state1.turn?.responded, blocks: state1.blocks.length })

  const closed = await jaz.api.closeTurn(turn.id)
  const again = await armando.api.closeTurn(turn.id).catch((e: unknown) => e)
  log('cierre', { status: closed.status, segundo: again instanceof ApiError ? `${again.status} ${again.message}` : 'aceptado (mal)' })

  let after = 0
  let blocks = 0
  let last = state1
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    last = await armando.api.tableState(tableId, after)
    if (last.blocks.length > 0) {
      blocks += last.blocks.length
      after = last.lastBlockId
      for (const b of last.blocks) log(`  bloque ${b.id}`, `${b.block.type}: ${b.block.text.slice(0, 70)}`)
    }
    if (last.turn && last.turn.number === 2 && last.turn.status === 'open') break
  }
  log('tras el polling', { headSeq: last.campaign.headSeq, turn: last.turn && { number: last.turn.number, status: last.turn.status, required: last.turn.required, error: last.turn.error }, bloquesRecibidos: blocks, lastBlockId: after })

  const mine = await jaz.api.playerProjection(campaignId, 'zahira')
  const world = await armando.api.worldProjection(campaignId)
  const ajena = await jaz.api.playerProjection(campaignId, 'calder').catch((e: unknown) => e)
  log('proyecciones', { propia: { seq: mine.seq, hp: mine.projection.character.hp }, mundo: { seq: world.seq, calder: world.projection.characters['calder']?.hp }, ajena: ajena instanceof ApiError ? `${ajena.status}` : 'permitida (mal)' })

  const sessions = await host.api.listSessions(campaignId)
  const open = sessions.find((s) => s.status === 'open')!
  const ended = await host.api.closeSession(open.id, 'La campana suena sola.')
  const final = await jaz.api.tableState(tableId, after)
  log('sesion cerrada', { ...ended, sessionAhora: final.session, turnAhora: final.turn })

  const anon = createApiClient({ baseUrl: API, tokenProvider: () => 'caducado' })
  const unauthorized = await anon.tableState(tableId).catch((e: unknown) => e)
  log('token invalido', unauthorized instanceof ApiError ? `${unauthorized.status} isUnauthorized=${unauthorized.isUnauthorized}` : 'sin error (mal)')
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
