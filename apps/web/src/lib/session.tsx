'use client'

import { ApiError, createApiClient, normalizeBaseUrl, type ApiClient } from '@rpg-ngn/api-client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { storage, type StoredUser } from './storage'

/**
 * Sesion de la web: URL de la API, token y usuario. El token vive en
 * localStorage (provisional, ver storage.ts) y se consulta por referencia
 * en cada peticion; un 401 en cualquier pantalla borra la sesion y vuelve
 * al acceso con aviso.
 */

export type SessionStage = { name: 'booting' } | { name: 'anonymous'; notice: string | null } | { name: 'ready' }

export interface SessionValue {
  stage: SessionStage
  client: ApiClient | null
  user: StoredUser | null
  serverUrl: string
  login: (serverUrl: string, email: string, password: string) => Promise<string | null>
  logout: () => void
  /** Cierra la sesion local y vuelve al acceso con un aviso (401 o token borrado). */
  unauthorized: (notice?: string) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(null)
  const [stage, setStage] = useState<SessionStage>({ name: 'booting' })
  const [client, setClient] = useState<ApiClient | null>(null)
  const [user, setUser] = useState<StoredUser | null>(null)
  const [serverUrl, setServerUrl] = useState('')

  const makeClient = useCallback((baseUrl: string) => createApiClient({ baseUrl: normalizeBaseUrl(baseUrl), tokenProvider: () => tokenRef.current }), [])

  const unauthorized = useCallback((notice = 'La sesión caducó. Vuelve a entrar.') => {
    tokenRef.current = null
    storage.clearSession()
    setClient(null)
    setUser(null)
    setStage({ name: 'anonymous', notice })
  }, [])

  useEffect(() => {
    let alive = true
    const url = storage.serverUrl()
    const token = storage.token()
    const stored = storage.user()
    setServerUrl(url)
    if (!token || !stored) {
      setStage({ name: 'anonymous', notice: null })
      return
    }
    tokenRef.current = token
    const api = makeClient(url)
    void api.profile().then(
      (me) => {
        if (!alive) return
        const fresh = { id: me.id, name: me.name, email: me.email }
        storage.setUser(fresh)
        setUser(fresh)
        setClient(api)
        setStage({ name: 'ready' })
      },
      (caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.status > 0) {
          unauthorized(caught.isUnauthorized ? 'La sesión caducó. Vuelve a entrar.' : caught.message)
          return
        }
        // Sin respuesta: se conserva el token por si la API vuelve, pero se pide entrar de nuevo.
        setStage({ name: 'anonymous', notice: `No se pudo conectar con ${url || 'la API'}. Revisa que esté levantada.` })
      },
    )
    return () => {
      alive = false
    }
  }, [makeClient, unauthorized])

  const login = useCallback(
    async (url: string, email: string, password: string): Promise<string | null> => {
      const base = normalizeBaseUrl(url)
      const api = makeClient(base)
      try {
        const result = await api.login(email.trim(), password, 'web-rpg-ngn')
        tokenRef.current = result.token
        storage.setServerUrl(base)
        storage.setToken(result.token)
        storage.setUser(result.user)
        setServerUrl(base)
        setUser(result.user)
        setClient(api)
        setStage({ name: 'ready' })
        return null
      } catch (caught) {
        return caught instanceof Error ? caught.message : String(caught)
      }
    },
    [makeClient],
  )

  const logout = useCallback(() => {
    const api = client
    tokenRef.current = null
    storage.clearSession()
    setClient(null)
    setUser(null)
    setStage({ name: 'anonymous', notice: null })
    void api?.logout().catch(() => undefined)
  }, [client])

  const value = useMemo<SessionValue>(() => ({ stage, client, user, serverUrl, login, logout, unauthorized }), [stage, client, user, serverUrl, login, logout, unauthorized])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession fuera de SessionProvider')
  return value
}
