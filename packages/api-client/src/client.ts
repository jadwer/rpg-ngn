import { createHttp, query, type FetchLike, type TokenProvider } from './http.js'
import { attr, Included, relationMany, relationOne, type Document, type Resource } from './jsonapi.js'
import type {
  BlockEnvelope,
  LoginResult,
  MemberRole,
  PlayerProjection,
  Profile,
  Projection,
  ResponseReceipt,
  SessionClosed,
  SessionSummary,
  TableMember,
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

export interface ApiClient {
  readonly baseUrl: string
  login(email: string, password: string, deviceName: string): Promise<LoginResult>
  logout(): Promise<void>
  profile(): Promise<Profile>
  listTables(): Promise<TableSummary[]>
  table(tableId: string | number): Promise<TableSummary>
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

  return {
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
  return {
    id: String(resource.id),
    name: attr(resource, 'name', ''),
    packId: attr(resource, 'packId', ''),
    packVersion: attr(resource, 'packVersion', ''),
    ruleset: attr(resource, 'ruleset', ''),
    status: attr(resource, 'status', ''),
    oneShot: attr(resource, 'oneShot', false),
    campaignId: campaign ? String(campaign.id) : null,
    members,
  }
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
