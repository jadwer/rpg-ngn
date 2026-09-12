import { describe, expect, it, vi } from 'vitest'
import { createApiClient, memberOf, randomKey } from './client.js'
import { ApiError, describeError, NetworkError } from './errors.js'
import type { FetchLike, HttpRequestInit } from './http.js'

interface Call {
  url: string
  init: HttpRequestInit
}

/** Un fetch de mentira que responde por ruta y guarda lo que le pidieron. */
function fakeFetch(routes: Record<string, { status?: number; body?: unknown } | ((init: HttpRequestInit) => { status?: number; body?: unknown })>) {
  const calls: Call[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init })
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    const match = Object.entries(routes).find(([key]) => `${init.method} ${path}` === key)
    if (!match) return { status: 404, ok: false, headers: { get: () => null }, text: async () => JSON.stringify({ message: `sin ruta para ${init.method} ${path}` }) }
    const spec = typeof match[1] === 'function' ? match[1](init) : match[1]
    const status = spec.status ?? 200
    return { status, ok: status >= 200 && status < 300, headers: { get: () => 'application/json' }, text: async () => (spec.body === undefined ? '' : JSON.stringify(spec.body)) }
  }
  return { fetch, calls }
}

const tablesDocument = {
  data: [
    {
      type: 'tables',
      id: '2',
      attributes: { name: 'Smoke', packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', status: 'active', oneShot: false },
      relationships: {
        members: { data: [{ type: 'table-members', id: '4' }, { type: 'table-members', id: '5' }] },
        campaign: { data: { type: 'campaigns', id: '2' } },
      },
    },
  ],
  included: [
    { type: 'table-members', id: '4', attributes: { role: 'host', characterId: null }, relationships: { user: { data: { type: 'users', id: '2' } } } },
    { type: 'table-members', id: '5', attributes: { role: 'player', characterId: 'zahira' }, relationships: { user: { data: { type: 'users', id: '4' } } } },
    { type: 'users', id: '2', attributes: { name: 'Gabino', email: 'gabino@example.com' } },
    { type: 'users', id: '4', attributes: { name: 'Jaz', email: 'jaz@example.com' } },
    { type: 'campaigns', id: '2', attributes: { headSeq: 4 } },
  ],
}

function client(routes: Parameters<typeof fakeFetch>[0], token: string | null = 'tok') {
  const { fetch, calls } = fakeFetch(routes)
  const api = createApiClient({ baseUrl: 'http://api.test/', tokenProvider: () => token, fetch, idempotencyKey: () => 'key-1' })
  return { api, calls }
}

describe('login y perfil', () => {
  it('manda device_name sin token y devuelve el token con el usuario', async () => {
    const { api, calls } = client({
      'POST /api/auth/login': { body: { message: 'ok', token: '12|abc', token_type: 'Bearer', expires_at: '2026-10-06T00:00:00+00:00', user: { id: 4, name: 'Jaz', email: 'jaz@example.com' } } },
    })
    const result = await api.login('jaz@example.com', 'password', 'expo-test')
    expect(result).toEqual({ token: '12|abc', expiresAt: '2026-10-06T00:00:00+00:00', user: { id: '4', name: 'Jaz', email: 'jaz@example.com' } })
    expect(calls[0]?.url).toBe('http://api.test/api/auth/login')
    expect(calls[0]?.init.headers['Authorization']).toBeUndefined()
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ email: 'jaz@example.com', password: 'password', device_name: 'expo-test' })
  })

  it('un login invalido es un ApiError 422 con mensaje legible', async () => {
    const { api } = client({ 'POST /api/auth/login': { status: 422, body: { message: 'validation.min.string', errors: { password: ['validation.min.string'] } } } })
    const error = await api.login('a@b.c', 'x', 'd').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).isValidation).toBe(true)
    expect((error as ApiError).message).toBe('Revisa el campo password.')
  })

  it('el perfil aplana el recurso JSON:API y manda el Bearer', async () => {
    const { api, calls } = client({ 'GET /api/v1/profile': { body: { data: { type: 'users', id: '4', attributes: { name: 'Jaz', email: 'jaz@example.com', role: 'customer' } } } } })
    expect(await api.profile()).toEqual({ id: '4', name: 'Jaz', email: 'jaz@example.com', role: 'customer' })
    expect(calls[0]?.init.headers['Authorization']).toBe('Bearer tok')
    expect(calls[0]?.init.headers['Accept']).toBe('application/json')
  })

  it('un 401 se distingue para volver al login', async () => {
    const { api } = client({ 'GET /api/v1/profile': { status: 401, body: { message: 'Unauthenticated.' } } }, null)
    const error = await api.profile().catch((e: unknown) => e)
    expect((error as ApiError).isUnauthorized).toBe(true)
    expect((error as ApiError).message).toBe('Unauthenticated.')
  })
})

describe('mesas', () => {
  it('lista mesas con campaña y miembros aplanados', async () => {
    const { api, calls } = client({ 'GET /api/v1/tables?include=campaign%2Cmembers.user&page%5Bsize%5D=50': { body: tablesDocument } })
    const tables = await api.listTables()
    expect(calls[0]?.init.headers['Accept']).toBe('application/vnd.api+json')
    expect(tables).toHaveLength(1)
    const table = tables[0]!
    expect(table).toMatchObject({ id: '2', name: 'Smoke', packId: 'pilot', campaignId: '2' })
    expect(table.members).toEqual([
      { id: '4', role: 'host', characterId: null, userId: '2', userName: 'Gabino' },
      { id: '5', role: 'player', characterId: 'zahira', userId: '4', userName: 'Jaz' },
    ])
    expect(memberOf(table, 4)).toMatchObject({ role: 'player', characterId: 'zahira' })
    expect(memberOf(table, '99')).toBeNull()
  })

  it('el estado de la mesa lleva after solo cuando hay ultimo bloque y expone lastBlockId', async () => {
    const state = { campaign: { id: 2, headSeq: 4 }, session: { code: '003', status: 'open' }, turn: { id: 2, session: '003', number: 2, status: 'open', required: ['zahira', 'calder'], responded: [], error: null, openedAt: null }, blocks: [{ id: 3, turnId: 1, seq: 3, block: { type: 'narration', text: 'Hola.' } }] }
    const { api, calls } = client({
      'GET /api/v1/tables/2/state': { body: { data: state, meta: { lastBlockId: 3 } } },
      'GET /api/v1/tables/2/state?after=3': { body: { data: { ...state, blocks: [] }, meta: { lastBlockId: 3 } } },
    })
    const first = await api.tableState(2)
    expect(first.lastBlockId).toBe(3)
    expect(first.blocks[0]?.block).toEqual({ type: 'narration', text: 'Hola.' })
    const second = await api.tableState('2', 3)
    expect(second.blocks).toEqual([])
    expect(calls.map((c) => c.url)).toEqual(['http://api.test/api/v1/tables/2/state', 'http://api.test/api/v1/tables/2/state?after=3'])
  })

  it('expone la premisa de settings y null cuando no hay', async () => {
    const withPremise = { ...tablesDocument, data: [{ ...tablesDocument.data[0], attributes: { ...tablesDocument.data[0]!.attributes, settings: { premise: '  Esta noche esperan a Calder. ', provider: { kind: 'scripted' } } } }] }
    const { api } = client({ 'GET /api/v1/tables?include=campaign%2Cmembers.user&page%5Bsize%5D=50': { body: withPremise } })
    const [table] = await api.listTables()
    expect(table?.premise).toBe('Esta noche esperan a Calder.')
    const { api: plain } = client({ 'GET /api/v1/tables?include=campaign%2Cmembers.user&page%5Bsize%5D=50': { body: tablesDocument } })
    expect((await plain.listTables())[0]?.premise).toBeNull()
  })

  it('crea la mesa como JSON:API con la premisa en settings y devuelve la mesa aplanada', async () => {
    const created = {
      data: { type: 'tables', id: '9', attributes: { name: 'Posada', packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', status: 'active', oneShot: false, settings: { premise: 'La posada al caer la noche.' } }, relationships: { members: { data: [{ type: 'table-members', id: '20' }] }, campaign: { data: { type: 'campaigns', id: '9' } } } },
      included: [{ type: 'table-members', id: '20', attributes: { role: 'host', characterId: null }, relationships: { user: { data: { type: 'users', id: '2' } } } }, { type: 'users', id: '2', attributes: { name: 'Gabino', email: 'gabino@example.com' } }],
    }
    const { api, calls } = client({ 'POST /api/v1/tables?include=campaign%2Cmembers.user': { status: 201, body: created } })
    const table = await api.createTable({ name: 'Posada', packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', premise: ' La posada al caer la noche. ' })
    expect(calls[0]?.init.headers['Content-Type']).toBe('application/vnd.api+json')
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ data: { type: 'tables', attributes: { name: 'Posada', packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', settings: { premise: 'La posada al caer la noche.' } } } })
    expect(table).toMatchObject({ id: '9', name: 'Posada', premise: 'La posada al caer la noche.', campaignId: '9' })
    expect(table.members).toEqual([{ id: '20', role: 'host', characterId: null, userId: '2', userName: 'Gabino' }])

    await api.createTable({ name: 'Sin premisa', packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', premise: '   ' })
    expect(JSON.parse(calls[1]?.init.body ?? '{}').data.attributes.settings).toBeUndefined()
  })

  it('el dueño fija su personaje e invita con la misma llamada de miembros', async () => {
    const { api, calls } = client({
      'POST /api/v1/tables/9/members': (init) => {
        const body = JSON.parse(init.body ?? '{}') as { user_id: number; character_id: string | null }
        return { status: body.user_id === 2 ? 200 : 201, body: { data: { id: body.user_id === 2 ? 20 : 21, table_id: 9, user_id: body.user_id, role: body.user_id === 2 ? 'host' : 'player', character_id: body.character_id } } }
      },
    })
    expect(await api.setOwnerCharacter('9', '2', 'narivyl')).toEqual({ id: 20, tableId: 9, userId: 2, role: 'host', characterId: 'narivyl' })
    expect(await api.invite(9, 4, 'zahira')).toEqual({ id: 21, tableId: 9, userId: 4, role: 'player', characterId: 'zahira' })
    expect(calls.map((c) => JSON.parse(c.init.body ?? '{}'))).toEqual([{ user_id: 2, character_id: 'narivyl' }, { user_id: 4, character_id: 'zahira' }])
  })

  it('invitar sin amistad es un 422 con el mensaje de la API; repetir es 409', async () => {
    let hits = 0
    const { api } = client({ 'POST /api/v1/tables/9/members': () => (++hits === 1 ? { status: 422, body: { error: 'Solo puedes invitar a tus amigos.' } } : { status: 409, body: { error: 'Ya es miembro de la mesa.' } }) })
    const first = await api.invite(9, 5, 'calder').catch((e: unknown) => e)
    expect((first as ApiError).isValidation).toBe(true)
    expect((first as ApiError).message).toBe('Solo puedes invitar a tus amigos.')
    const second = await api.invite(9, 5, 'calder').catch((e: unknown) => e)
    expect((second as ApiError).isConflict).toBe(true)
  })

  it('lista las sesiones de una campaña por filtro', async () => {
    const { api } = client({ 'GET /api/v1/game-sessions?filter%5Bcampaign%5D=2': { body: { data: [{ type: 'game-sessions', id: '1', attributes: { code: '003', status: 'open', openedSeq: 1, closedSeq: null } }] } } })
    expect(await api.listSessions(2)).toEqual([{ id: '1', code: '003', status: 'open', openedSeq: 1, closedSeq: null }])
  })
})

describe('amistades', () => {
  const friendshipsDocument = {
    data: [
      { type: 'friendships', id: '1', attributes: { status: 'accepted', acceptedAt: '2026-09-07T03:19:01.000000Z' }, relationships: { user: { data: { type: 'users', id: '2' } }, friend: { data: { type: 'users', id: '4' } } } },
      { type: 'friendships', id: '3', attributes: { status: 'pending', acceptedAt: null }, relationships: { user: { data: { type: 'users', id: '5' } }, friend: { data: { type: 'users', id: '2' } } } },
    ],
    included: [
      { type: 'users', id: '2', attributes: { name: 'Gabino', email: 'gabino@example.com', role: 'admin' } },
      { type: 'users', id: '4', attributes: { name: 'Jaz', email: 'jaz@example.com' } },
      { type: 'users', id: '5', attributes: { name: 'Armando', email: 'armando@example.com' } },
    ],
  }

  it('lista las amistades con quien pide y quien recibe, aplanados', async () => {
    const { api, calls } = client({ 'GET /api/v1/friendships?include=user%2Cfriend&page%5Bsize%5D=100': { body: friendshipsDocument } })
    const friendships = await api.listFriendships()
    expect(calls[0]?.init.headers['Accept']).toBe('application/vnd.api+json')
    expect(friendships).toEqual([
      { id: '1', status: 'accepted', user: { id: '2', name: 'Gabino', email: 'gabino@example.com' }, friend: { id: '4', name: 'Jaz', email: 'jaz@example.com' }, acceptedAt: '2026-09-07T03:19:01.000000Z' },
      { id: '3', status: 'pending', user: { id: '5', name: 'Armando', email: 'armando@example.com' }, friend: { id: '2', name: 'Gabino', email: 'gabino@example.com' }, acceptedAt: null },
    ])
  })

  it('pedir amistad distingue nueva (201) de existente (200) y aceptar manda el POST sin cuerpo', async () => {
    let hits = 0
    const raw = { id: 7, user_id: 2, friend_id: 5, status: 'pending', accepted_at: null }
    const { api, calls } = client({
      'POST /api/v1/friendships': () => ({ status: ++hits === 1 ? 201 : 200, body: { data: raw } }),
      'POST /api/v1/friendships/7/accept': { body: { data: { ...raw, status: 'accepted', accepted_at: '2026-09-11T00:00:00+00:00' } } },
    })
    expect(await api.requestFriendship('5')).toEqual({ id: 7, userId: 2, friendId: 5, status: 'pending', created: true })
    expect((await api.requestFriendship(5)).created).toBe(false)
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ friend_id: 5 })
    expect(await api.acceptFriendship(7)).toMatchObject({ id: 7, status: 'accepted', created: false })
    expect(calls[2]?.init.body).toBeUndefined()
  })

  it('busca usuarios por correo exacto y devuelve null si no hay', async () => {
    const { api, calls } = client({
      'GET /api/v1/users?filter%5Bemail%5D=jaz%40example.com&page%5Bsize%5D=1': { body: { data: [{ type: 'users', id: '4', attributes: { name: 'Jaz', email: 'jaz@example.com' } }] } },
      'GET /api/v1/users?filter%5Bemail%5D=nadie%40example.com&page%5Bsize%5D=1': { body: { data: [] } },
    })
    expect(await api.findUserByEmail(' jaz@example.com ')).toEqual({ id: '4', name: 'Jaz', email: 'jaz@example.com' })
    expect(await api.findUserByEmail('nadie@example.com')).toBeNull()
    expect(calls[0]?.init.headers['Accept']).toBe('application/vnd.api+json')
  })

  it('buscar sin permiso es un 403 que la web explica', async () => {
    const { api } = client({ 'GET /api/v1/users?filter%5Bemail%5D=jaz%40example.com&page%5Bsize%5D=1': { status: 403, body: { message: 'This action is unauthorized.' } } })
    const error = await api.findUserByEmail('jaz@example.com').catch((e: unknown) => e)
    expect((error as ApiError).isForbidden).toBe(true)
  })
})

describe('turno', () => {
  it('responde con Idempotency-Key generada y distingue 201 de 200', async () => {
    let hits = 0
    const receipt = { id: 7, turnId: 2, characterId: 'zahira', late: false, submittedAt: '2026-09-06T20:00:00+00:00' }
    const { api, calls } = client({ 'POST /api/v1/turns/2/responses': () => ({ status: ++hits === 1 ? 201 : 200, body: { data: receipt } }) })
    const first = await api.respond(2, 'Miro la campana.')
    const again = await api.respond(2, 'Miro la campana.', 'key-1')
    expect(first).toEqual({ ...receipt, created: true })
    expect(again.created).toBe(false)
    expect(calls[0]?.init.headers['Idempotency-Key']).toBe('key-1')
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ text: 'Miro la campana.' })
  })

  it('un 409 al responder dos veces llega como conflicto con el mensaje de la API', async () => {
    const { api } = client({ 'POST /api/v1/turns/2/responses': { status: 409, body: { error: 'zahira ya respondio en este turno' } } })
    const error = await api.respond(2, 'Otra.').catch((e: unknown) => e)
    expect((error as ApiError).isConflict).toBe(true)
    expect((error as ApiError).message).toBe('zahira ya respondio en este turno')
  })

  it('cerrar sin que falte nadie devuelve el turno en closing; con force manda el flag', async () => {
    const turn = { id: 2, session: '003', number: 2, status: 'closing', required: ['zahira'], responded: ['zahira'], error: null, openedAt: null }
    const { api, calls } = client({ 'POST /api/v1/turns/2/close': { status: 202, body: { data: turn } } })
    expect((await api.closeTurn(2)).status).toBe('closing')
    await api.closeTurn(2, true)
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({})
    expect(JSON.parse(calls[1]?.init.body ?? '{}')).toEqual({ force: true })
  })

  it('cerrar con faltantes es un 422 que nombra a quien falta', async () => {
    const { api } = client({ 'POST /api/v1/turns/2/close': { status: 422, body: { message: 'Faltan por responder: zahira, calder.', errors: { required: ['Faltan por responder: zahira, calder.'] } } } })
    const error = await api.closeTurn(2).catch((e: unknown) => e)
    expect((error as ApiError).message).toBe('Faltan por responder: zahira, calder.')
    expect((error as ApiError).errors).toEqual({ required: ['Faltan por responder: zahira, calder.'] })
  })

  it('abrir y cerrar sesion mandan solo los campos presentes', async () => {
    const turn = { id: 1, session: '003', number: 1, status: 'open', required: ['zahira', 'calder'], responded: [], error: null, openedAt: null }
    const { api, calls } = client({
      'POST /api/v1/campaigns/2/sessions': { status: 201, body: { data: turn } },
      'POST /api/v1/sessions/1/close': { body: { data: { session: '003', status: 'closed', snapshotSeq: 23 } } },
    })
    expect((await api.openSession(2, '003')).required).toEqual(['zahira', 'calder'])
    await api.openSession('2', '003', 'Valdoria, tres dias despues')
    expect(await api.closeSession(1)).toEqual({ session: '003', status: 'closed', snapshotSeq: 23 })
    await api.closeSession('1', 'La campana suena sola.')
    expect(calls.map((c) => JSON.parse(c.init.body ?? '{}'))).toEqual([{ code: '003' }, { code: '003', worldTime: 'Valdoria, tres dias despues' }, {}, { cliffhanger: 'La campana suena sola.' }])
  })

  it('las proyecciones vuelven con seq y headSeq', async () => {
    const { api } = client({
      'GET /api/v1/campaigns/2/projections/player:zahira': { body: { data: { kind: 'player:zahira', seq: 4, headSeq: 4, projection: { characterId: 'zahira', character: { hp: { current: 13, max: 13 } } } } } },
      'GET /api/v1/campaigns/2/projections/world': { body: { data: { kind: 'world', seq: 4, headSeq: 4, projection: { worldTime: null, characters: {}, npcs: {} } } } },
    })
    expect((await api.playerProjection(2, 'zahira')).projection.character.hp.current).toBe(13)
    expect((await api.worldProjection(2)).kind).toBe('world')
  })
})

describe('red y errores', () => {
  it('sin respuesta del servidor es un NetworkError con status 0', async () => {
    const api = createApiClient({ baseUrl: 'http://apagado.test', tokenProvider: () => null, fetch: vi.fn().mockRejectedValue(new TypeError('Network request failed')) })
    const error = await api.profile().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NetworkError)
    expect((error as ApiError).status).toBe(0)
  })

  it('describeError cubre las tres formas de la API', () => {
    expect(describeError(403, { message: 'No eres miembro de esta mesa.' }).message).toBe('No eres miembro de esta mesa.')
    expect(describeError(422, { message: 'validation.required', errors: { text: ['validation.required'] } }).message).toBe('Revisa el campo text.')
    expect(describeError(404, { errors: [{ title: 'Not Found', detail: 'No hay recurso.' }] }).message).toBe('No hay recurso.')
    expect(describeError(500, 'html').message).toBe('Error del servidor (500).')
  })

  it('randomKey genera claves distintas', () => {
    expect(randomKey()).not.toBe(randomKey())
  })
})
