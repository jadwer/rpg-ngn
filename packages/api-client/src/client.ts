import { accountApi, type AccountApi } from './account.js'
import { createHttp, query, type FetchLike, type TokenProvider } from './http.js'
import { settingsApi, type SettingsApi } from './settings.js'
import { attr, Included, relationMany, relationOne, type Document, type Resource } from './jsonapi.js'
import type {
  AuthUser,
  BlockEnvelope,
  Friendship,
  FriendshipRecord,
  LoginResult,
  MemberRole,
  NewTable,
  PlayerProjection,
  Profile,
  Projection,
  ResponseReceipt,
  SessionClosed,
  SessionSummary,
  TableMember,
  TableMemberRecord,
  TableState,
  TableSummary,
  TurnView,
  WorldProjection,
} from './types.js'

export interface ApiClientOptions {
  /** `http://192.168.100.11:8010`, sin `/api`. */
  baseUrl: string
  /** Devuelve el token vigente o null; se consulta en cada peticion. */
  tokenProvider: TokenProvider
  fetch?: FetchLike | undefined
  /** Generador de `Idempotency-Key`; por defecto `crypto.randomUUID` con respaldo. */
  idempotencyKey?: (() => string) | undefined
}

export interface ApiClient extends AccountApi, SettingsApi {
  readonly baseUrl: string
  login(email: string, password: string, deviceName: string): Promise<LoginResult>
  logout(): Promise<void>
  profile(): Promise<Profile>
  listTables(): Promise<TableSummary[]>
  table(tableId: string | number): Promise<TableSummary>
  /** Crea la mesa (JSON:API); el que la crea queda como dueño con el asiento `dm` y sin personaje. */
  createTable(input: NewTable): Promise<TableSummary>
  /** El dueño fija o cambia su propio personaje (`POST tables/{t}/members` sobre si mismo). */
  setOwnerCharacter(tableId: string | number, ownerUserId: string | number, characterId: string | null): Promise<TableMemberRecord>
  /** Invita a un amigo (amistad aceptada) con un personaje; 422 sin amistad, 409 si ya es miembro. */
  invite(tableId: string | number, userId: string | number, characterId: string | null): Promise<TableMemberRecord>
  /** Amistades donde participa el usuario, pedidas o recibidas, en cualquier estado. */
  listFriendships(): Promise<Friendship[]>
  requestFriendship(friendId: string | number): Promise<FriendshipRecord>
  acceptFriendship(friendshipId: string | number): Promise<FriendshipRecord>
  /** Busca un usuario por correo exacto (`users?filter[email]=`); null si no existe. Solo cuentas admin (403 al resto); `lookupUser` sirve a cualquiera. */
  findUserByEmail(email: string): Promise<AuthUser | null>
  tableState(tableId: string | number, after?: number): Promise<TableState>
  respond(turnId: number, text: string, idempotencyKey?: string): Promise<ResponseReceipt>
  closeTurn(turnId: number, force?: boolean): Promise<TurnView>
  openSession(campaignId: string | number, code: string, worldTime?: string): Promise<TurnView>
  closeSession(sessionId: string | number, cliffhanger?: string): Promise<SessionClosed>
  listSessions(campaignId: string | number): Promise<SessionSummary[]>
  playerProjection(campaignId: string | number, characterId: string): Promise<Projection<PlayerProjection>>
  worldProjection(campaignId: string | number): Promise<Projection<WorldProjection>>
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createHttp(options)
  const newKey = options.idempotencyKey ?? randomKey

  const addMember = async (tableId: string | number, userId: string | number, characterId: string | null): Promise<TableMemberRecord> => {
    const { data } = await request<{ data: RawMember }>(`/api/v1/tables/${tableId}/members`, {
      method: 'POST',
      body: { user_id: Number(userId), character_id: characterId },
    })
    return { id: data.data.id, tableId: data.data.table_id, userId: data.data.user_id, role: data.data.role, characterId: data.data.character_id ?? null }
  }

  return {
    ...accountApi(request),
    ...settingsApi(request),
    baseUrl: options.baseUrl,

    async login(email, password, deviceName) {
      const { data } = await request<{ token: string; expires_at?: string | null; user: { id: number | string; name: string; email: string } }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, device_name: deviceName },
        anonymous: true,
      })
      return { token: data.token, expiresAt: data.expires_at ?? null, user: { id: String(data.user.id), name: data.user.name, email: data.user.email } }
    },

    async logout() {
      await request('/api/auth/logout', { method: 'POST' })
    },

    async profile() {
      const { data } = await request<Document<Resource>>('/api/v1/profile')
      const resource = data.data
      return { id: String(resource.id), name: attr(resource, 'name', ''), email: attr(resource, 'email', ''), role: attr<string | null>(resource, 'role', null) }
    },

    async listTables() {
      const { data } = await request<Document<Resource[]>>(`/api/v1/tables${query({ include: 'campaign,members.user', 'page[size]': 50 })}`, { media: 'jsonapi' })
      const included = new Included(data.included)
      return data.data.map((resource) => tableFrom(resource, included))
    },

    async table(tableId) {
      const { data } = await request<Document<Resource>>(`/api/v1/tables/${tableId}${query({ include: 'campaign,members.user' })}`, { media: 'jsonapi' })
      return tableFrom(data.data, new Included(data.included))
    },

    async createTable(input) {
      const premise = input.premise?.trim() ?? ''
      const settings: Record<string, unknown> = { ...(input.settings ?? {}), ...(premise ? { premise } : {}) }
      const attributes: Record<string, unknown> = { name: input.name, packId: input.packId, packVersion: input.packVersion, ruleset: input.ruleset }
      if (Object.keys(settings).length > 0) attributes['settings'] = settings
      const { data } = await request<Document<Resource>>(`/api/v1/tables${query({ include: 'campaign,members.user' })}`, {
        method: 'POST',
        media: 'jsonapi',
        body: { data: { type: 'tables', attributes } },
      })
      return tableFrom(data.data, new Included(data.included))
    },

    async setOwnerCharacter(tableId, ownerUserId, characterId) {
      return addMember(tableId, ownerUserId, characterId)
    },

    async invite(tableId, userId, characterId) {
      return addMember(tableId, userId, characterId)
    },

    async listFriendships() {
      const { data } = await request<Document<Resource[]>>(`/api/v1/friendships${query({ include: 'user,friend', 'page[size]': 100 })}`, { media: 'jsonapi' })
      const included = new Included(data.included)
      return data.data.map((resource) => ({
        id: String(resource.id),
        status: attr(resource, 'status', 'pending'),
        user: userFrom(included.get(relationOne(resource, 'user')), relationOne(resource, 'user')?.id ?? ''),
        friend: userFrom(included.get(relationOne(resource, 'friend')), relationOne(resource, 'friend')?.id ?? ''),
        acceptedAt: attr<string | null>(resource, 'acceptedAt', null),
      }))
    },

    async requestFriendship(friendId) {
      const { status, data } = await request<{ data: RawFriendship }>('/api/v1/friendships', { method: 'POST', body: { friend_id: Number(friendId) } })
      return friendshipRecord(data.data, status === 201)
    },

    async acceptFriendship(friendshipId) {
      const { data } = await request<{ data: RawFriendship }>(`/api/v1/friendships/${friendshipId}/accept`, { method: 'POST' })
      return friendshipRecord(data.data, false)
    },

    async findUserByEmail(email) {
      const { data } = await request<Document<Resource[]>>(`/api/v1/users${query({ 'filter[email]': email.trim(), 'page[size]': 1 })}`, { media: 'jsonapi' })
      const resource = data.data[0]
      return resource ? userFrom(resource, resource.id) : null
    },

    async tableState(tableId, after = 0) {
      const { data } = await request<{ data: Omit<TableState, 'lastBlockId'>; meta: { lastBlockId: number } }>(`/api/v1/tables/${tableId}/state${query({ after: after > 0 ? after : undefined })}`)
      return { ...data.data, blocks: data.data.blocks as BlockEnvelope[], lastBlockId: data.meta.lastBlockId }
    },

    async respond(turnId, text, idempotencyKey) {
      const { status, data } = await request<{ data: Omit<ResponseReceipt, 'created'> }>(`/api/v1/turns/${turnId}/responses`, {
        method: 'POST',
        body: { text },
        headers: { 'Idempotency-Key': idempotencyKey ?? newKey() },
      })
      return { ...data.data, created: status === 201 }
    },

    async closeTurn(turnId, force = false) {
      const { data } = await request<{ data: TurnView }>(`/api/v1/turns/${turnId}/close`, { method: 'POST', body: force ? { force: true } : {} })
      return data.data
    },

    async openSession(campaignId, code, worldTime) {
      const { data } = await request<{ data: TurnView }>(`/api/v1/campaigns/${campaignId}/sessions`, { method: 'POST', body: worldTime ? { code, worldTime } : { code } })
      return data.data
    },

    async closeSession(sessionId, cliffhanger) {
      const { data } = await request<{ data: SessionClosed }>(`/api/v1/sessions/${sessionId}/close`, { method: 'POST', body: cliffhanger ? { cliffhanger } : {} })
      return data.data
    },

    async listSessions(campaignId) {
      const { data } = await request<Document<Resource[]>>(`/api/v1/game-sessions${query({ 'filter[campaign]': String(campaignId) })}`, { media: 'jsonapi' })
      return data.data.map((resource) => ({
        id: String(resource.id),
        code: attr(resource, 'code', ''),
        status: attr(resource, 'status', ''),
        openedSeq: attr<number | null>(resource, 'openedSeq', null),
        closedSeq: attr<number | null>(resource, 'closedSeq', null),
      }))
    },

    async playerProjection(campaignId, characterId) {
      const { data } = await request<{ data: Projection<PlayerProjection> }>(`/api/v1/campaigns/${campaignId}/projections/player:${characterId}`)
      return data.data
    },

    async worldProjection(campaignId) {
      const { data } = await request<{ data: Projection<WorldProjection> }>(`/api/v1/campaigns/${campaignId}/projections/world`)
      return data.data
    },
  }
}

function tableFrom(resource: Resource, included: Included): TableSummary {
  const members: TableMember[] = relationMany(resource, 'members').map((identifier) => {
    const member = included.get(identifier)
    const userRef = member ? relationOne(member, 'user') : null
    const user = included.get(userRef)
    return {
      id: String(identifier.id),
      role: attr<MemberRole>(member, 'role', 'player'),
      characterId: attr<string | null>(member, 'characterId', null),
      userId: userRef ? String(userRef.id) : null,
      userName: attr<string | null>(user, 'name', null),
    }
  })
  const campaign = relationOne(resource, 'campaign')
  const settings = attr<Record<string, unknown> | null>(resource, 'settings', null)
  const premise = settings && typeof settings['premise'] === 'string' && settings['premise'].trim() ? settings['premise'].trim() : null
  return {
    id: String(resource.id),
    name: attr(resource, 'name', ''),
    packId: attr(resource, 'packId', ''),
    packVersion: attr(resource, 'packVersion', ''),
    ruleset: attr(resource, 'ruleset', ''),
    status: attr(resource, 'status', ''),
    oneShot: attr(resource, 'oneShot', false),
    premise,
    settings: settings ?? {},
    campaignId: campaign ? String(campaign.id) : null,
    members,
  }
}

interface RawMember {
  id: number
  table_id: number
  user_id: number
  role: MemberRole
  character_id: string | null
}

interface RawFriendship {
  id: number
  user_id: number
  friend_id: number
  status: string
  accepted_at: string | null
}

function friendshipRecord(raw: RawFriendship, created: boolean): FriendshipRecord {
  return { id: raw.id, userId: raw.user_id, friendId: raw.friend_id, status: raw.status, created }
}

function userFrom(resource: Resource | null, id: string): AuthUser {
  return { id: String(resource?.id ?? id), name: attr(resource, 'name', ''), email: attr(resource, 'email', '') }
}

/** El miembro que corresponde a un usuario, o null si no esta en la mesa. */
export function memberOf(table: Pick<TableSummary, 'members'>, userId: string | number): TableMember | null {
  const id = String(userId)
  return table.members.find((m) => m.userId === id) ?? null
}

/**
 * `crypto.randomUUID` existe en web y en Node; en Hermes depende de que la
 * app lo haya polyfilleado. Si no esta, un id de tiempo mas azar basta:
 * la clave solo tiene que ser unica por intento, no impredecible.
 */
export function randomKey(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID()
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
  return `${time}-${rand}`
}
