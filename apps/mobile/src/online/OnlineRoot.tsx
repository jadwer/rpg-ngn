import { ApiError, createApiClient, memberOf, normalizeBaseUrl, type ApiClient, type RegisterInput, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { ConnectScreen } from '../screens/online/ConnectScreen'
import { ForgotPasswordScreen } from '../screens/online/ForgotPasswordScreen'
import { NewTableScreen } from '../screens/online/NewTableScreen'
import { ProfileScreen } from '../screens/online/ProfileScreen'
import { RegisterScreen } from '../screens/online/RegisterScreen'
import { TableScreen } from '../screens/online/TableScreen'
import { TablesScreen } from '../screens/online/TablesScreen'
import { theme } from '../theme'
import { storage, type StoredUser } from './storage'

interface Props {
  /** El pack empaquetado en la app; se usa si coincide con el packId de la mesa. */
  pack: LoadedPack
  onExit: () => void
}

type Stage =
  | { name: 'booting' }
  | { name: 'connect'; notice: string | null }
  | { name: 'register'; notice: string | null }
  | { name: 'forgot' }
  | { name: 'tables' }
  | { name: 'profile' }
  | { name: 'new-table' }
  | { name: 'table'; table: TableSummary }

interface Session {
  client: ApiClient
  user: StoredUser
}

const DEVICE_NAME = 'expo-rpg-ngn'

/**
 * Flujo online: conexion y login (o crear cuenta, o recuperar contraseña),
 * mesas, perfil, mesa nueva, mesa. El token vive en el almacen seguro y se
 * consulta por referencia en cada peticion; un 401 en cualquier pantalla
 * borra la sesion y vuelve al login con aviso.
 */
export function OnlineRoot({ pack, onExit }: Props) {
  const tokenRef = useRef<string | null>(null)
  const [stage, setStage] = useState<Stage>({ name: 'booting' })
  const [session, setSession] = useState<Session | null>(null)
  const [serverUrl, setServerUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [tables, setTables] = useState<TableSummary[] | null>(null)
  const [tablesError, setTablesError] = useState<string | null>(null)

  const makeClient = useCallback((baseUrl: string) => createApiClient({ baseUrl: normalizeBaseUrl(baseUrl), tokenProvider: () => tokenRef.current }), [])

  const unauthorized = useCallback((notice = 'La sesión caducó. Vuelve a entrar.') => {
    tokenRef.current = null
    void storage.clearSession()
    setSession(null)
    setTables(null)
    setStage({ name: 'connect', notice })
  }, [])

  const loadTables = useCallback(
    async (client: ApiClient) => {
      setBusy(true)
      setTablesError(null)
      try {
        setTables(await client.listTables())
      } catch (caught) {
        if (caught instanceof ApiError && caught.isUnauthorized) {
          unauthorized()
          return
        }
        setTablesError(caught instanceof Error ? caught.message : String(caught))
      } finally {
        setBusy(false)
      }
    },
    [unauthorized],
  )

  /** Entrar con un token recien emitido (login o registro): se recuerda y se pasa a las mesas. */
  const enter = async (client: ApiClient, url: string, token: string, user: StoredUser) => {
    tokenRef.current = token
    await Promise.all([storage.setServerUrl(normalizeBaseUrl(url)), storage.setToken(token), storage.setUser(user)])
    setServerUrl(normalizeBaseUrl(url))
    setSession({ client, user })
    setStage({ name: 'tables' })
    void loadTables(client)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      const [url, token, user] = await Promise.all([storage.serverUrl(), storage.token(), storage.user()])
      if (!alive) return
      setServerUrl(url)
      if (token && user) {
        tokenRef.current = token
        const client = makeClient(url)
        try {
          const me = await client.profile()
          if (!alive) return
          const stored = { id: me.id, name: me.name, email: me.email }
          setSession({ client, user: stored })
          setStage({ name: 'tables' })
          void loadTables(client)
          return
        } catch (caught) {
          if (!alive) return
          if (caught instanceof ApiError && caught.status > 0) {
            unauthorized(caught.isUnauthorized ? 'La sesión caducó. Vuelve a entrar.' : caught.message)
            return
          }
          setStage({ name: 'connect', notice: `No se pudo conectar con ${url}. Revisa la IP y que la API esté levantada.` })
          return
        }
      }
      setStage({ name: 'connect', notice: null })
    })()
    return () => {
      alive = false
    }
  }, [makeClient, loadTables, unauthorized])

  const login = async (url: string, email: string, password: string) => {
    setBusy(true)
    const client = makeClient(url)
    try {
      const result = await client.login(email.trim(), password, DEVICE_NAME)
      await enter(client, url, result.token, result.user)
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught)
      setStage({ name: 'connect', notice: message })
    } finally {
      setBusy(false)
    }
  }

  const register = async (url: string, input: RegisterInput) => {
    setBusy(true)
    const client = makeClient(url)
    try {
      const result = await client.register(input, DEVICE_NAME)
      if (result.kind === 'verify') {
        // Verificacion de correo encendida en la API: sin token hasta pulsar el enlace.
        setServerUrl(normalizeBaseUrl(url))
        setStage({ name: 'connect', notice: `${result.message} Cuando hayas verificado el correo, entra con tu contraseña.` })
        return
      }
      await enter(client, url, result.token, result.user)
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught)
      setStage({ name: 'register', notice: message })
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    const client = session?.client
    tokenRef.current = null
    await storage.clearSession()
    setSession(null)
    setTables(null)
    setStage({ name: 'connect', notice: null })
    void client?.logout().catch(() => undefined)
  }

  const setUser = (user: StoredUser) => {
    void storage.setUser(user)
    setSession((current) => (current ? { ...current, user } : current))
  }

  /** La mesa abierta cambio (invitacion): se vuelve a pedir y se sustituye en la etapa. */
  const reloadTable = (client: ApiClient, tableId: string) => {
    void client.table(tableId).then(
      (table) => setStage((current) => (current.name === 'table' && current.table.id === tableId ? { name: 'table', table } : current)),
      () => undefined,
    )
  }

  if (stage.name === 'booting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.gold} />
        <Text style={styles.loading}>Buscando la mesa...</Text>
      </View>
    )
  }

  if (stage.name === 'register') {
    return <RegisterScreen key={serverUrl} initialUrl={serverUrl} busy={busy} notice={stage.notice} onRegister={(url, input) => void register(url, input)} onBack={() => setStage({ name: 'connect', notice: null })} />
  }

  if (stage.name === 'forgot') {
    return <ForgotPasswordScreen key={serverUrl} initialUrl={serverUrl} onBack={() => setStage({ name: 'connect', notice: null })} />
  }

  if (stage.name === 'connect' || !session) {
    return (
      <ConnectScreen
        key={serverUrl}
        initialUrl={serverUrl}
        busy={busy}
        notice={stage.name === 'connect' ? stage.notice : null}
        onLogin={(url, email, password) => void login(url, email, password)}
        onRegister={(url) => {
          setServerUrl(url)
          setStage({ name: 'register', notice: null })
        }}
        onForgot={(url) => {
          setServerUrl(url)
          setStage({ name: 'forgot' })
        }}
        onBack={onExit}
      />
    )
  }

  if (stage.name === 'tables') {
    return (
      <TablesScreen
        client={session.client}
        user={session.user}
        tables={tables}
        loading={busy}
        error={tablesError}
        pack={pack}
        onOpen={(table) => setStage({ name: 'table', table })}
        onCreate={() => setStage({ name: 'new-table' })}
        onRefresh={() => void loadTables(session.client)}
        onProfile={() => setStage({ name: 'profile' })}
        onLogout={() => void logout()}
        onUnauthorized={() => unauthorized()}
      />
    )
  }

  if (stage.name === 'profile') {
    return <ProfileScreen client={session.client} user={session.user} onUserChanged={setUser} onBack={() => setStage({ name: 'tables' })} onUnauthorized={() => unauthorized()} />
  }

  if (stage.name === 'new-table') {
    return (
      <NewTableScreen
        client={session.client}
        user={session.user}
        pack={pack}
        onBack={() => {
          setStage({ name: 'tables' })
          void loadTables(session.client)
        }}
        onOpen={(table) => setStage({ name: 'table', table })}
        onUnauthorized={() => unauthorized()}
      />
    )
  }

  const me = memberOf(stage.table, session.user.id)
  if (!me) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No eres miembro de esta mesa.</Text>
      </View>
    )
  }

  return (
    <TableScreen
      key={stage.table.id}
      client={session.client}
      table={stage.table}
      me={me}
      user={session.user}
      pack={stage.table.packId === pack.manifest.id ? pack : null}
      onBack={() => {
        setStage({ name: 'tables' })
        void loadTables(session.client)
      }}
      onTableChanged={() => reloadTable(session.client, stage.table.id)}
      onUnauthorized={() => unauthorized()}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: theme.colors.bg },
  loading: { fontFamily: theme.fonts.serifItalic, fontSize: 15, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.danger, textAlign: 'center' },
})
