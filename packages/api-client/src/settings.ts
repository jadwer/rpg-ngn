import type { PackSheets } from '@rpg-ngn/engine-contract'

export type { PackSheets }
import { query, type HttpResult, type RequestOptions } from './http.js'

/**
 * Ajustes de la mesa (entrega 5b): el DM se elige entre los presets del
 * servidor (`settings.provider = {preset, model?}`); las credenciales nunca
 * salen del .env de la API. El probe llama al engine con el preset elegido
 * antes de guardarlo. BYOK con clave propia por mesa queda para la entrega 7.
 */

export interface DmPreset {
  /** scripted, anthropic, openai, deepseek u ollama. */
  name: string
  /** Kind del contrato del engine: scripted, anthropic u openai (compatible). */
  kind: string
  /** Modelo por defecto del preset; null para scripted. */
  model: string | null
  /** true si el servidor tiene la clave o la URL que el preset necesita. */
  configured: boolean
  /** El que usa una mesa sin proveedor propio (DM_PROVIDER). */
  default: boolean
}

export interface DmProviderChoice {
  preset: string
  /** Modelo distinto al del preset; null para el del servidor. */
  model: string | null
}

export interface DmProbeResult {
  ok: boolean
  preset: string
  provider: string
  model: string | null
  message: string
}

/**
 * Clave propia del usuario (BYOK). La credencial nunca vuelve del servidor:
 * de ella solo llega `hint`, las ultimas cuatro letras, para reconocerla.
 */
export interface OwnKey {
  /** anthropic, openai o deepseek. */
  preset: string
  configured: boolean
  /** Ultimas cuatro letras de la clave guardada; null si no hay. */
  hint: string | null
  /** Modelo propio, si eligio uno distinto al del preset. */
  model: string | null
  verifiedAt: string | null
}

/** Un pack que el servidor puede jugar; se elige al crear la mesa. */
/** La ficha de un mundo en el catalogo (bloque `catalog` de su pack.json). */
export interface WorldCatalog {
  genre: string
  tags: string[]
  players: { min: number; max: number }
  duration: 'corta' | 'media' | 'larga'
  hours: string | null
  format: 'campaña' | 'aventura' | 'one-shot'
  synopsis: string
  /** Archivo de `art/`; se pinta con `packArtUrl`. */
  cover: string
  gallery: string[]
  author: string
  provenance: 'original' | 'licensed' | 'user-provided'
}

/** Estado de una tarjeta del catalogo para quien mira (docs/24 seccion 3). */
export type WorldState = 'gratis' | 'tuyo' | 'camino' | 'pase' | 'venta' | 'comunidad'

/** Un mundo en Explorar mundos. */
export interface CatalogWorldCard {
  id: string
  version: string
  name: string
  tagline: string | null
  system: string | null
  characters: number
  sessions: number
  origin: 'oficial' | 'comunidad'
  catalog: WorldCatalog
  state: WorldState
  /** De donde salio si es tuyo: gratis, desbloqueo, pase, compra, creador o comunidad. */
  source: string | null
  price: { amount: number; currency: string } | null
  featured: boolean
  /** Solo en los de la comunidad: el id numerico para añadirlo a mis mundos. */
  packId?: number
  /** Camino de temporada (3b): capitulos que faltan y el umbral. */
  path?: { threshold: number; have: number } | null
}

export interface CatalogWorldDetail extends CatalogWorldCard {
  playable: Array<{ id: string; name: string; role: string; portrait: string | null }>
  maps: Array<{ id: string; name: string; image: string }>
}

export interface CatalogFilters {
  q?: string | undefined
  genre?: string | undefined
  tone?: string | undefined
  players?: number | undefined
  duration?: 'corta' | 'media' | 'larga' | undefined
  origin?: 'oficial' | 'comunidad' | undefined
}

export interface PackOption {
  id: string
  version: string
  type: 'setting' | 'campaign'
  /** Nombre de cara al jugador ("Los Nueve Viajeros"), no el id. */
  name: string
  tagline: string | null
  /** Ruleset que el pack asume; la mesa se crea con el. */
  system: string
  characters: number
  sessions: number
  /** El pack pide que cada jugador escriba la personalidad de su personaje (La Mascarada). */
  playerPersona?: boolean
  /** De donde sale (entrega 8): oficial del servidor, subido por esta cuenta, o del catalogo y activado. */
  origin?: 'official' | 'mine' | 'catalog'
  /** Solo en los subidos: private, pending, published, rejected, retired. */
  status?: string
  /** El id que escribio el autor; `id` es el del servidor. */
  slug?: string
  author?: string | null
  provenance?: Record<string, unknown>
  /** Motivo del ultimo rechazo, para el autor. */
  reviewNote?: string | null
  /** Id numerico del pack subido, para publicar, activar o borrar. */
  packId?: number
  /** La ficha del catalogo, si el pack la declara. */
  catalog?: WorldCatalog | null
  createdAt?: string | null
  /** Mesas que lo juegan (solo en "mis mundos"). */
  tables?: number
  /** En el catalogo: si esta cuenta ya lo tiene activado o si es suyo. */
  activated?: boolean
  mine?: boolean
}

/** Un aviso del motor al validar un pack subido: archivo y campo. */
export interface PackIssue {
  level: 'error' | 'warning'
  path: string
  message: string
}

/** Un paquete de creditos de prepago. `amount` va en la unidad menor (centavos). */
/** Un personaje jugable de un pack del servidor, para elegirlo al crear mesa. */
/** Un NPC de un pack remoto: nombre y retrato para el dialogo. */
export interface PackNpc {
  id: string
  name: string
  /** Ruta dentro del pack; se pinta con `packPortraitUrl`. */
  portrait: string | null
}

export interface PackCharacter {
  id: string
  name: string
  race: string
  characterClass: string
  quote: string
  roles: string[]
  /** Ruta dentro del pack; se pinta con `packPortraitUrl`. */
  portrait: string | null
}

export interface CreditPack {
  id: string
  name: string
  description: string
  amount: number
  currency: string
  /** Lo que se cobra si es en otra moneda (precio en USD, cobro en MXN al tipo del dia); null si no hay tipo de cambio. */
  charge?: { amount: number; currency: string } | null
  /** Turnos que suma al cupo; 0 en los planes que todavia no se venden. */
  turns: number
  /** false: se enseña pero no se puede comprar todavia. */
  available: boolean
}

export interface CreditBalance {
  remainingTurns: number
  usedTurns: number
}

/** Lo que hace falta para confirmar el pago en el navegador. */
export interface CreditPurchase {
  transactionId: number
  clientSecret: string
  amount: number
  currency: string
  turns: number
}

export interface SettingsApi {
  listDmPresets(): Promise<{ presets: DmPreset[]; defaultPreset: string }>
  /** Los packs instalados en el servidor. Sustituye a la lista escrita a mano en cada cliente. */
  listPacks(): Promise<PackOption[]>
  /** Explorar mundos (E9): publico; con sesion, cada mundo trae su estado para quien mira. */
  catalogWorlds(filters?: CatalogFilters): Promise<{ worlds: CatalogWorldCard[]; genres: string[] }>
  catalogWorld(id: string): Promise<CatalogWorldDetail>
  /** Personajes de un pack del servidor; la web solo lleva empaquetado el piloto. */
  listPackCharacters(packId: string, version: string): Promise<PackCharacter[]>
  /** Los NPC de un pack, para ponerles cara en el dialogo cuando el cliente no lleva el pack. */
  listPackNpcs(packId: string, version: string): Promise<PackNpc[]>
  /** Fichas completas y sesiones de un pack del servidor, para el panel de fichas sin llevar el pack (E3). */
  listPackSheets(packId: string, version: string): Promise<PackSheets>
  /** Mis mundos (entrega 8): los subidos por esta cuenta, con el cupo gratuito. */
  listMyPacks(): Promise<{ packs: PackOption[]; freeLimit: number; used: number }>
  /** Sube un .rpgpack. Si el motor lo rechaza, el ApiError trae `issues` en `body`. */
  uploadPack(file: Blob, fileName: string): Promise<PackOption>
  publishPack(packId: number): Promise<PackOption>
  unpublishPack(packId: number): Promise<PackOption>
  /** Borra el mundo, o lo retira si alguna mesa lo juega. */
  deletePack(packId: number): Promise<{ retired: boolean; message: string }>
  /** El catalogo publico: lo que otros publicaron y paso revision. */
  listCatalog(): Promise<PackOption[]>
  /** Con que narra la mesa y quien lo paga (clave propia, cupo o gratis). */
  tableDm(tableId: string | number): Promise<{ source: 'own' | 'quota' | 'free' | 'none'; kind: string | null; model: string | null; firstTurnsLeft: number | null }>
  /** La cola de revision del catalogo; 403 si la cuenta no es de administracion. */
  reviewQueue(): Promise<Array<PackOption & { requestedAt?: string | null; bytes?: number }>>
  /** Aprobar un mundo pendiente, o rechazarlo con el motivo que leera su autor. */
  reviewPack(packId: number, decision: 'approve' | 'reject', note?: string): Promise<PackOption>
  activatePack(packId: number): Promise<PackOption>
  deactivatePack(packId: number): Promise<PackOption>
  /** Los mapas de un pack, con los lugares ya posados sobre la imagen. */
  listPackMaps(packId: string, version: string): Promise<PackMapView[]>
  /** Paquetes, saldo y la clave publicable de Stripe (publica por diseño). */
  listCredits(): Promise<{ packs: CreditPack[]; balance: CreditBalance; publishableKey: string }>
  /** Arranca la compra: devuelve el clientSecret para confirmar contra Stripe. Los turnos los suma el webhook. */
  buyCredits(packId: string): Promise<CreditPurchase>
  /** Las claves propias del usuario: cuales hay, sin la credencial. */
  listOwnKeys(): Promise<OwnKey[]>
  /** Guarda la clave del usuario; el servidor la comprueba antes (422 si el proveedor la rechaza). */
  saveOwnKey(preset: string, credential: string, model?: string | null): Promise<{ keys: OwnKey[]; message: string }>
  /** Quita la clave: las mesas vuelven al DM del servidor. */
  deleteOwnKey(preset: string): Promise<{ keys: OwnKey[]; message: string }>
  /** Solo el anfitrion; 422 si el preset no esta configurado, 502 si el engine no responde. */
  probeDm(tableId: string | number, choice: DmProviderChoice): Promise<DmProbeResult>
  /** Sustituye `settings` entero (JSON:API PATCH); usa `withProvider` para conservar la premisa. Solo el dueño. */
  updateTableSettings(tableId: string | number, settings: Record<string, unknown>): Promise<Record<string, unknown>>
}

type Request = <T = unknown>(path: string, init?: RequestOptions) => Promise<HttpResult<T>>

export function settingsApi(request: Request): SettingsApi {
  return {
    async listDmPresets() {
      const { data } = await request<{ data: DmPreset[]; meta: { default: string } }>('/api/v1/dm/presets')
      return { presets: data.data, defaultPreset: data.meta.default }
    },

    async catalogWorlds(filters = {}) {
      const params: Record<string, string | number | undefined> = { ...filters }
      const { data } = await request<{ data: CatalogWorldCard[]; meta: { genres: string[] } }>(`/api/v1/catalog/worlds${query(params)}`)
      return { worlds: data.data, genres: data.meta.genres }
    },

    async catalogWorld(id) {
      const { data } = await request<{ data: CatalogWorldDetail }>(`/api/v1/catalog/worlds/${encodeURIComponent(id)}`)
      return data.data
    },

    async listPacks() {
      const { data } = await request<{ data: PackOption[] }>('/api/v1/packs')
      return data.data
    },

    async listPackSheets(packId, version) {
      const { data } = await request<{ data: PackSheets }>(`/api/v1/packs/${encodeURIComponent(packId)}/${encodeURIComponent(version)}/sheets`)
      return data.data
    },

    async listMyPacks() {
      const { data } = await request<{ data: PackOption[]; meta: { freeLimit: number; used: number } }>('/api/v1/packs/mine')
      return { packs: data.data, freeLimit: data.meta.freeLimit, used: data.meta.used }
    },

    async uploadPack(file, fileName) {
      const form = new FormData()
      form.append('pack', file, fileName)
      form.append('acceptTerms', '1')
      const { data } = await request<{ data: PackOption }>('/api/v1/packs/mine', { method: 'POST', form })
      return data.data
    },

    async publishPack(packId) {
      const { data } = await request<{ data: PackOption }>(`/api/v1/packs/mine/${packId}/publish`, { method: 'POST', body: {} })
      return data.data
    },

    async unpublishPack(packId) {
      const { data } = await request<{ data: PackOption }>(`/api/v1/packs/mine/${packId}/unpublish`, { method: 'POST', body: {} })
      return data.data
    },

    async deletePack(packId) {
      const { data } = await request<{ data: { retired: boolean; message: string } }>(`/api/v1/packs/mine/${packId}`, { method: 'DELETE' })
      return data.data
    },

    async listCatalog() {
      const { data } = await request<{ data: PackOption[] }>('/api/v1/packs/catalog')
      return data.data
    },

    async tableDm(tableId) {
      const { data } = await request<{ data: { source: 'own' | 'quota' | 'free' | 'none'; kind: string | null; model: string | null; firstTurnsLeft: number | null } }>(`/api/v1/tables/${tableId}/dm`)
      return data.data
    },

    async reviewQueue() {
      const { data } = await request<{ data: Array<PackOption & { requestedAt?: string | null; bytes?: number }> }>('/api/v1/packs/review')
      return data.data
    },

    async reviewPack(packId, decision, note) {
      const body = note !== undefined ? { decision, note } : { decision }
      const { data } = await request<{ data: PackOption }>(`/api/v1/packs/review/${packId}`, { method: 'POST', body })
      return data.data
    },

    async activatePack(packId) {
      const { data } = await request<{ data: PackOption }>(`/api/v1/packs/catalog/${packId}/activate`, { method: 'POST', body: {} })
      return data.data
    },

    async deactivatePack(packId) {
      const { data } = await request<{ data: PackOption }>(`/api/v1/packs/catalog/${packId}/activate`, { method: 'DELETE' })
      return data.data
    },

    async listPackNpcs(packId, version) {
      const { data } = await request<{ data: PackNpc[] }>(`/api/v1/packs/${encodeURIComponent(packId)}/${encodeURIComponent(version)}/npcs`)
      return data.data
    },

    async listPackCharacters(packId, version) {
      const { data } = await request<{ data: PackCharacter[] }>(`/api/v1/packs/${encodeURIComponent(packId)}/${encodeURIComponent(version)}/characters`)
      return data.data
    },

    async listPackMaps(packId, version) {
      const { data } = await request<{ data: PackMapView[] }>(`/api/v1/packs/${encodeURIComponent(packId)}/${encodeURIComponent(version)}/maps`)
      return data.data
    },

    async listCredits() {
      const { data } = await request<{ data: { packs: CreditPack[]; balance: CreditBalance; publishableKey: string } }>('/api/v1/credits')
      return data.data
    },

    async buyCredits(packId) {
      const { data } = await request<{ data: CreditPurchase }>('/api/v1/credits/purchases', { method: 'POST', body: { pack: packId } })
      return data.data
    },

    async listOwnKeys() {
      const { data } = await request<{ data: OwnKey[] }>('/api/v1/profile/keys')
      return data.data
    },

    async saveOwnKey(preset, credential, model) {
      const { data } = await request<{ data: OwnKey[]; meta: { message: string } }>('/api/v1/profile/keys', {
        method: 'PUT',
        body: model ? { preset, credential, model } : { preset, credential },
      })
      return { keys: data.data, message: data.meta.message }
    },

    async deleteOwnKey(preset) {
      const { data } = await request<{ data: OwnKey[]; meta: { message: string } }>(`/api/v1/profile/keys/${encodeURIComponent(preset)}`, { method: 'DELETE' })
      return { keys: data.data, message: data.meta.message }
    },

    async probeDm(tableId, choice) {
      const { data } = await request<{ data: DmProbeResult }>(`/api/v1/tables/${tableId}/dm/probe`, {
        method: 'POST',
        body: choice.model ? { preset: choice.preset, model: choice.model } : { preset: choice.preset },
      })
      return data.data
    },

    async updateTableSettings(tableId, settings) {
      const { data } = await request<{ data: { attributes?: { settings?: Record<string, unknown> | null } } }>(`/api/v1/tables/${tableId}`, {
        method: 'PATCH',
        media: 'jsonapi',
        body: { data: { type: 'tables', id: String(tableId), attributes: { settings } } },
      })
      return data.data.attributes?.settings ?? {}
    },
  }
}

/** El proveedor que la mesa eligio, o null si usa el del servidor. Entiende la forma vieja `{kind: 'scripted'}`. */
export function providerChoice(settings: Record<string, unknown> | null | undefined): DmProviderChoice | null {
  const provider = settings?.['provider']
  if (!provider || typeof provider !== 'object') return null
  const raw = provider as { preset?: unknown; model?: unknown; kind?: unknown }
  if (raw.kind === 'scripted') return { preset: 'scripted', model: null }
  if (typeof raw.preset !== 'string') return null
  return { preset: raw.preset, model: typeof raw.model === 'string' && raw.model.trim() ? raw.model.trim() : null }
}

/** Los ajustes con el proveedor cambiado (o quitado con null), conservando premisa y lo demas. */
export function withProvider(settings: Record<string, unknown> | null | undefined, choice: DmProviderChoice | null): Record<string, unknown> {
  const { provider: _previous, ...rest } = settings ?? {}
  if (!choice) return rest
  return { ...rest, provider: choice.model ? { preset: choice.preset, model: choice.model } : { preset: choice.preset } }
}

/** URL del retrato de un pack servido por la API (los del piloto van empaquetados). */
/** Un mapa del pack con sus lugares posados, para pintarlo. */
export interface PackMapView {
  id: string
  name: string
  /** Ruta dentro del pack; se pinta con `packMapUrl`. */
  image: string
  description: string | null
  places: Array<{ id: string; name: string; x: number; y: number; connections: string[] }>
}

/** La imagen de un mapa del pack, servida por la API como los retratos. */
export function packMapUrl(packId: string, image: string | null | undefined): string | null {
  if (!image) return null
  const file = image.split('/').pop()
  return file ? `/api/v1/packs/${encodeURIComponent(packId)}/maps/${encodeURIComponent(file)}` : null
}

/** Portada o imagen de galeria de un mundo (`art/` del pack), relativa a la API. */
export function packArtUrl(packId: string, file: string | null | undefined): string | null {
  if (!file) return null
  const name = file.split('/').pop()
  if (!name) return null
  return `/api/v1/packs/${encodeURIComponent(packId)}/art/${encodeURIComponent(name)}`
}

export function packPortraitUrl(packId: string, portrait: string | null | undefined): string | null {
  if (!portrait) return null
  // El pack guarda `portraits/shiho.jpg`; la ruta sirve solo el nombre.
  const file = portrait.split('/').pop()
  if (!file) return null
  return `/api/v1/packs/${encodeURIComponent(packId)}/portraits/${encodeURIComponent(file)}`
}
