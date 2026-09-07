import { ApiError, NetworkError, type ApiClient, type BlockEnvelope, type TableState } from '@rpg-ngn/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Polling de `GET /tables/{id}/state` cada 1.5 s (docs/11, D5). Los bloques
 * se acumulan por id y solo se pide lo posterior al ultimo; el turno y la
 * sesion se reemplazan en cada vuelta. Con la red caida sigue intentando y
 * lo dice; un 401 corta y avisa para volver al login.
 */
export const POLL_INTERVAL_MS = 1500

export interface TableSnapshot {
  campaign: TableState['campaign']
  session: TableState['session']
  turn: TableState['turn']
  /** Todos los bloques recibidos hasta ahora, en orden. Misma referencia mientras no lleguen nuevos. */
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

export function useTableState(client: ApiClient, tableId: string, onUnauthorized: () => void, intervalMs = POLL_INTERVAL_MS): TableStateHook {
  const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null)
  const [connection, setConnection] = useState<Connection>('loading')
  const [error, setError] = useState<string | null>(null)
  const tickRef = useRef<(() => void) | null>(null)
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let inFlight = false
    let after = 0
    let envelopes: BlockEnvelope[] = []

    const schedule = () => {
      if (!alive) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void tick(), intervalMs)
    }

    const tick = async () => {
      if (!alive || inFlight) return
      inFlight = true
      try {
        const state = await client.tableState(tableId, after)
        if (!alive) return
        if (state.blocks.length > 0) {
          envelopes = [...envelopes, ...state.blocks]
          after = state.lastBlockId
        }
        setSnapshot({ campaign: state.campaign, session: state.session, turn: state.turn, envelopes, lastBlockId: after })
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

    return () => {
      alive = false
      tickRef.current = null
      if (timer) clearTimeout(timer)
    }
  }, [client, tableId, intervalMs])

  const refresh = useCallback(() => tickRef.current?.(), [])

  return { snapshot, connection, error, refresh }
}
