'use client'

import { ApiError, createApiClient, normalizeBaseUrl, type ApiClient, type FetchLike, type RegisterInput } from '@rpg-ngn/api-client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { storage, type StoredUser } from './storage'

/**
 * Sesion de la web. Dos modos:
 *
 * - **Proxy** (por defecto, servidor vacio): el token de Sanctum vive en una
 *   cookie httpOnly que ponen los route handlers de `/auth/*`; las
 *   peticiones a `/api/*` salen sin token y el proxy de Next lo inyecta. El
 *   navegador nunca ve el token.
 * - **Directo** (el usuario escribio otra URL de API): el token queda en
 *   localStorage y viaja como Bearer, como antes. Requiere CORS en la API.
 *
 * En ambos, un 401 en cualquier pantalla borra la sesion y vuelve al acceso
 * con aviso.
 */

export type SessionStage = { name: 'booting' } | { name: 'anonymous'; notice: string | null } | { name: 'ready' }

export type RegisterOutcome = { ok: true; pendingVerification: false } | { ok: true; pendingVerification: true; message: string } | { ok: false; error: string }

export interface SessionValue {
  stage: SessionStage
  client: ApiClient | null
  user: StoredUser | null
  serverUrl: string
  login: (serverUrl: string, email: string, password: string) => Promise<string | null>
  register: (serverUrl: string, input: RegisterInput) => Promise<RegisterOutcome>
  logout: () => void
  /** Cierra la sesion local y vuelve al acceso con un aviso (401 o token borrado). */
  unauthorized: (notice?: string) => void
  /** Actualiza el usuario recordado (tras editar el perfil). */
  setUser: (user: StoredUser) => void
}

const SessionContext = createContext<SessionValue | null>(null)

/** Cabecera que el proxy exige en toda peticion que cambie estado (CSRF). */
export const WEB_HEADER: Record<string, string> = { 'X-Requested-With': 'rpg-ngn-web' }

/** fetch del navegador con la cabecera de la web y cookies del propio origen. */
const browserFetch: FetchLike = (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' })

export function SessionProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(null)
  const [stage, setStage] = useState<SessionStage>({ name: 'booting' })
  const [client, setClient] = useState<ApiClient | null>(null)
  const [user, setUserState] = useState<StoredUser | null>(null)
  const [serverUrl, setServerUrl] = useState('')

  /** Proxy: base vacia (mismo origen) y sin token; directo: base y token en memoria. */
  const makeClient = useCallback((baseUrl: string) => createApiClient({ baseUrl: normalizeBaseUrl(baseUrl), tokenProvider: () => (baseUrl ? tokenRef.current : null), fetch: browserFetch }), [])

  const unauthorized = useCallback((notice = 'La sesión caducó. Vuelve a entrar.') => {
    tokenRef.current = null
    storage.clearSession()
    setClient(null)
    setUserState(null)
    setStage({ name: 'anonymous', notice })
    void fetch('/auth/session', { method: 'DELETE', headers: WEB_HEADER, credentials: 'same-origin' }).catch(() => undefined)
  }, [])

  const enter = useCallback(
    (api: ApiClient, base: string, who: StoredUser) => {
      storage.setServerUrl(base)
      storage.setUser(who)
      setServerUrl(base)
      setUserState(who)
      setClient(api)
      setStage({ name: 'ready' })
    },
    [],
  )

  useEffect(() => {
    let alive = true
    const url = storage.serverUrl()
    const token = storage.token()
    const stored = storage.user()
    setServerUrl(url)
    // Directo sin token, o proxy sin usuario recordado: nadie entro en este navegador.
    if ((url && !token) || (!url && !stored)) {
      setStage({ name: 'anonymous', notice: null })
      return
    }
    tokenRef.current = url ? token : null
    const api = makeClient(url)
    void api.profile().then(
      (me) => {
        if (!alive) return
        enter(api, url, { id: me.id, name: me.name, email: me.email })
      },
      (caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.status > 0) {
          unauthorized(caught.isUnauthorized ? (stored ? 'La sesión caducó. Vuelve a entrar.' : null) ?? undefined : caught.message)
          return
        }
        // Sin respuesta: se conserva lo guardado por si la API vuelve, pero se pide entrar de nuevo.
        setStage({ name: 'anonymous', notice: `No se pudo conectar con ${url || 'la API'}. Revisa que esté levantada.` })
      },
    )
    return () => {
      alive = false
    }
  }, [makeClient, unauthorized, enter])

  const login = useCallback(
    async (url: string, email: string, password: string): Promise<string | null> => {
      const base = normalizeBaseUrl(url)
      try {
        if (!base) {
          const response = await fetch('/auth/session', { method: 'POST', headers: { ...WEB_HEADER, 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email: email.trim(), password }) })
          const body = (await response.json().catch(() => ({}))) as { user?: StoredUser; error?: string }
          if (!response.ok || !body.user) return body.error ?? `No se pudo entrar (${response.status}).`
          enter(makeClient(''), '', body.user)
          return null
        }
        const api = makeClient(base)
        const result = await api.login(email.trim(), password, 'web-rpg-ngn')
        tokenRef.current = result.token
        storage.setToken(result.token)
        enter(api, base, result.user)
        return null
      } catch (caught) {
        return caught instanceof Error ? caught.message : String(caught)
      }
    },
    [makeClient, enter],
  )

  const register = useCallback(
    async (url: string, input: RegisterInput): Promise<RegisterOutcome> => {
      const base = normalizeBaseUrl(url)
      try {
        if (!base) {
          const response = await fetch('/auth/register', { method: 'POST', headers: { ...WEB_HEADER, 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(input) })
          const body = (await response.json().catch(() => ({}))) as { user?: StoredUser; pendingVerification?: boolean; message?: string; error?: string; errors?: Record<string, string[]> }
          if (!response.ok) return { ok: false, error: firstError(body) ?? `No se pudo crear la cuenta (${response.status}).` }
          if (body.pendingVerification) return { ok: true, pendingVerification: true, message: body.message ?? 'Revisa tu correo para verificar la cuenta.' }
          if (!body.user) return { ok: false, error: 'La API no devolvió el usuario.' }
          enter(makeClient(''), '', body.user)
          return { ok: true, pendingVerification: false }
        }
        const api = makeClient(base)
        const result = await api.register(input, 'web-rpg-ngn')
        if (result.kind === 'verify') return { ok: true, pendingVerification: true, message: result.message }
        tokenRef.current = result.token
        storage.setToken(result.token)
        enter(api, base, result.user)
        return { ok: true, pendingVerification: false }
      } catch (caught) {
        return { ok: false, error: caught instanceof Error ? caught.message : String(caught) }
      }
    },
    [makeClient, enter],
  )

  const logout = useCallback(() => {
    const api = client
    const direct = !!serverUrl
    tokenRef.current = null
    storage.clearSession()
    setClient(null)
    setUserState(null)
    setStage({ name: 'anonymous', notice: null })
    if (direct) void api?.logout().catch(() => undefined)
    else void fetch('/auth/session', { method: 'DELETE', headers: WEB_HEADER, credentials: 'same-origin' }).catch(() => undefined)
  }, [client, serverUrl])

  const setUser = useCallback((who: StoredUser) => {
    storage.setUser(who)
    setUserState(who)
  }, [])

  const value = useMemo<SessionValue>(() => ({ stage, client, user, serverUrl, login, register, logout, unauthorized, setUser }), [stage, client, user, serverUrl, login, register, logout, unauthorized, setUser])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession fuera de SessionProvider')
  return value
}

function firstError(body: { error?: string; message?: string; errors?: Record<string, string[]> }): string | null {
  const fromFields = body.errors ? Object.values(body.errors).flat().find((m) => m && !m.startsWith('validation.')) : undefined
  if (fromFields) return fromFields
  if (body.error && !body.error.startsWith('validation.')) return body.error
  return body.message && !body.message.startsWith('validation.') ? body.message : null
}
