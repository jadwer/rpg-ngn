import { ApiError, describeError, NetworkError } from './errors.js'

/**
 * Capa HTTP minima sobre un `fetch` inyectable. El tipo `FetchLike` es el
 * subconjunto de `fetch` que usamos, para que el `fetch` global de React
 * Native, el de Node y un doble de test encajen sin depender del lib DOM.
 */

export interface HttpResponse {
  status: number
  ok: boolean
  headers: { get(name: string): string | null }
  text(): Promise<string>
}

export interface HttpRequestInit {
  method: string
  headers: Record<string, string>
  body?: string
}

export type FetchLike = (url: string, init: HttpRequestInit) => Promise<HttpResponse>

export type TokenProvider = () => string | null | undefined | Promise<string | null | undefined>

export const JSON_MEDIA = 'application/json'
export const JSONAPI_MEDIA = 'application/vnd.api+json'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** `json` para los comandos del juego y auth; `jsonapi` para los recursos. */
  media?: 'json' | 'jsonapi'
  headers?: Record<string, string>
  /** Sin token aunque haya (login). */
  anonymous?: boolean
}

export interface HttpResult<T> {
  status: number
  data: T
}

export interface HttpOptions {
  baseUrl: string
  tokenProvider: TokenProvider
  fetch?: FetchLike | undefined
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function createHttp(options: HttpOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetchImpl: FetchLike | undefined = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined)
  if (!fetchImpl) throw new Error('no hay fetch disponible; pasa uno en las opciones del cliente')

  return async function request<T = unknown>(path: string, init: RequestOptions = {}): Promise<HttpResult<T>> {
    const media = init.media === 'jsonapi' ? JSONAPI_MEDIA : JSON_MEDIA
    const headers: Record<string, string> = { Accept: media, ...init.headers }
    if (init.body !== undefined) headers['Content-Type'] = media
    if (!init.anonymous) {
      const token = await options.tokenProvider()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    let response: HttpResponse
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      })
    } catch (cause) {
      throw new NetworkError(`No hay conexion con ${baseUrl}.`, cause)
    }

    const text = await response.text()
    const data = parseJson(text)
    if (!response.ok) {
      const { message, errors } = describeError(response.status, data)
      throw new ApiError(response.status, message, { errors, body: data })
    }
    return { status: response.status, data: data as T }
  }
}

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function query(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}
