import type { HttpResult, RequestOptions } from './http.js'

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
  /** Personajes de un pack del servidor; la web solo lleva empaquetado el piloto. */
  listPackCharacters(packId: string, version: string): Promise<PackCharacter[]>
  /** Los NPC de un pack, para ponerles cara en el dialogo cuando el cliente no lleva el pack. */
  listPackNpcs(packId: string, version: string): Promise<PackNpc[]>
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

    async listPacks() {
      const { data } = await request<{ data: PackOption[] }>('/api/v1/packs')
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

export function packPortraitUrl(packId: string, portrait: string | null | undefined): string | null {
  if (!portrait) return null
  // El pack guarda `portraits/shiho.jpg`; la ruta sirve solo el nombre.
  const file = portrait.split('/').pop()
  if (!file) return null
  return `/api/v1/packs/${encodeURIComponent(packId)}/portraits/${encodeURIComponent(file)}`
}
