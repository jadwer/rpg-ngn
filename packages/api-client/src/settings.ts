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

export interface SettingsApi {
  listDmPresets(): Promise<{ presets: DmPreset[]; defaultPreset: string }>
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
