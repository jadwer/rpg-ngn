import { ApiError, NetworkError, type ApiClient, type BlockEnvelope, type TableState } from '@rpg-ngn/api-client'
import { pollDelay } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

/**
 * Polling de `GET /tables/{id}/state` (docs/11, D5): cada 1.5 s con la mesa
 * jugando, cada 5 s sin sesion, y nada con la pantalla oculta; al volver,
 * en el acto (`pollDelay`, VAM del 19-09 S10). Los bloques
 * se acumulan por id y solo se pide lo posterior al ultimo; el turno y la
 * sesion se reemplazan en cada vuelta. Con la red caida sigue intentando y
 * lo dice; un 401 corta y avisa para volver al login.
 */
export interface TableSnapshot {
  campaign: TableState['campaign']
  /** Quien consulta, con su asiento y personaje al dia (por si el anfitrion cambio el suyo). */
  viewer: TableState['viewer']
  session: TableState['session']
  turn: TableState['turn']
  /** Todos los bloques recibidos hasta ahora, en orden. Misma referencia mientras no lleguen nuevos. */
  narrators: TableState['narrators']
  /** Quien esta tecleando su respuesta ahora mismo. */
  typing: TableState['typing']
  /** Quien tuvo que irse, en vivo. */
  away: TableState['away']
  /** Si a quien consulta le falta tirar la Fortuna de esta sesion. */
  fortune: TableState['fortune']
  /** La tirada que el DM pidio a quien consulta en este turno, si aun no la solto. */
  rolls: TableState['rolls']
  suggestions: TableState['suggestions']
  ideas: TableState['ideas']
  /** La cuenta atras que eligio el anfitrion; llega con el estado para que todos cuenten igual. */
  countdown: number | null
  /** El historial ya llego entero (la API pagina de 200 en 200). */
  caughtUp: boolean
  /** Turnos de la mesa y cuando llega el siguiente gratuito; null si no gasta cupo. */
  quota: NonNullable<TableState['quota']> | null
  envelopes: BlockEnvelope[]
  lastBlockId: number
}

export type Connection = 'loading' | 'online' | 'offline'

export interface TableStateHook {
  snapshot: TableSnapshot | null
  connection: Connection
  /** Error de la API distinto de red o 401 (403, 500...). */
  error: string | null
  /** Pide el estado ya, sin esperar al siguiente tick (tras responder, cerrar o un 409). */
  refresh: () => void
}

/** `listening`: quien mira tiene "Leer lo nuevo" encendido; oculta, la mesa sigue llegando despacio. */
export function useTableState(client: ApiClient, tableId: string, onUnauthorized: () => void, listening = false): TableStateHook {
  const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null)
  const [connection, setConnection] = useState<Connection>('loading')
  const [error, setError] = useState<string | null>(null)
  const tickRef = useRef<(() => void) | null>(null)
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized
  const listeningRef = useRef(listening)
  listeningRef.current = listening

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let inFlight = false
    let after = 0
    let envelopes: BlockEnvelope[] = []
    let visible = AppState.currentState === 'active'
    let last: Pick<TableState, 'session' | 'turn'> = { session: null, turn: null }

    const schedule = () => {
      if (!alive) return
      if (timer) clearTimeout(timer)
      timer = null
      const delay = pollDelay({ visible, listening: listeningRef.current, session: last.session, turn: last.turn })
      if (delay !== null) timer = setTimeout(() => void tick(), delay)
    }

    const tick = async () => {
      if (!alive || inFlight) return
      inFlight = true
      try {
        const state = await client.tableState(tableId, after)
        if (!alive) return
        last = { session: state.session, turn: state.turn }
        if (state.blocks.length > 0) envelopes = [...envelopes, ...state.blocks]
        // El cursor avanza hasta lo leido aunque no llegara nada visible (S9).
        after = Math.max(after, state.lastBlockId)
        setSnapshot({ campaign: state.campaign, viewer: state.viewer, session: state.session, turn: state.turn, narrators: state.narrators, typing: state.typing, away: state.away, fortune: state.fortune, rolls: state.rolls ?? { pending: null }, suggestions: state.suggestions, ideas: state.ideas ?? { more: 'none', used: 0 }, countdown: state.countdown ?? null, caughtUp: state.more !== true, quota: state.quota ?? null, envelopes, lastBlockId: after })
        setConnection('online')
        setError(null)
      } catch (caught) {
        if (!alive) return
        if (caught instanceof ApiError && caught.isUnauthorized) {
          alive = false
          unauthorizedRef.current()
          return
        }
        if (caught instanceof NetworkError) {
          setConnection('offline')
        } else {
          setError(caught instanceof Error ? caught.message : String(caught))
        }
      } finally {
        inFlight = false
      }
      schedule()
    }

    tickRef.current = () => {
      if (timer) clearTimeout(timer)
      void tick()
    }
    void tick()

    // App en segundo plano: no se pregunta. Al volver, se pregunta ya.
    const subscription = AppState.addEventListener('change', (next) => {
      visible = next === 'active'
      if (visible) tickRef.current?.()
      else schedule()
    })
    const stopListening = () => subscription.remove()

    return () => {
      alive = false
      tickRef.current = null
      if (timer) clearTimeout(timer)
      stopListening()
    }
  }, [client, tableId])

  const refresh = useCallback(() => tickRef.current?.(), [])

  return { snapshot, connection, error, refresh }
}
