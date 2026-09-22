'use client'

import { ApiError, memberOf, type ApiClient, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import { characterNameFrom, memberTag, pendingReceived, seatLabel, tableCardMeta } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FriendsPanel } from '../../components/FriendsPanel'
import { RetireTable } from '../../components/RetireTable'
import { Portrait } from '../../components/Portrait'
import { RequireSession } from '../../components/RequireSession'
import { UserBar } from '../../components/UserBar'
import { PACK_ID } from '../../lib/pack'
import { usePack } from '../../lib/usePack'
import type { StoredUser } from '../../lib/storage'

export default function TablesPage() {
  return <RequireSession>{({ client, user, unauthorized, logout }) => <Tables client={client} user={user} unauthorized={unauthorized} logout={logout} />}</RequireSession>
}

/** Las mesas donde el usuario es miembro; la API ya las acota. */
function Tables({ client, user, unauthorized, logout }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void; logout: () => void }) {
  const { pack } = usePack()
  const [tables, setTables] = useState<TableSummary[] | null>(null)
  const [packs, setPacks] = useState<PackOption[]>([])
  // Nombre de personaje por id, para los packs que la web no lleva dentro.
  const [remoteNames, setRemoteNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Solicitudes de amistad que esperan respuesta: se avisan arriba, no solo
  // al fondo en el panel de amigos.
  const [pendingFriends, setPendingFriends] = useState(0)

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      setError(null)
      try {
        const [list, friendships] = await Promise.all([client.listTables(), client.listFriendships().catch(() => [])])
        setTables([...list].sort((a, b) => Number(b.id) - Number(a.id)))
        setPendingFriends(pendingReceived(friendships, user.id).length)
      } catch (caught) {
        if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
        else if (!quiet) setError(caught instanceof Error ? caught.message : String(caught))
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [client, unauthorized, user.id],
  )

  // Una invitacion o una solicitud nuevas aparecen solas: antes habia que
  // pulsar "Actualizar" para enterarse.
  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 10_000)
    return () => clearInterval(timer)
  }, [load])

  // Los packs de las mesas, como una clave estable: `tables` es un array nuevo
  // en cada refresco y no queremos volver a pedir el catalogo por eso.
  const packIds = [...new Set((tables ?? []).map((t) => t.packId))].sort().join(',')

  // El catalogo del servidor da el nombre del pack; de los que la web no
  // lleva dentro, tambien hay que pedir los personajes para no enseñar ids.
  useEffect(() => {
    if (packIds === '') return
    let alive = true
    void client.listPacks().then(
      async (catalogo) => {
        if (!alive) return
        setPacks(catalogo)
        const usados = new Set(packIds.split(','))
        const nombres: Record<string, string> = {}
        for (const p of catalogo.filter((p) => p.id !== PACK_ID && usados.has(p.id))) {
          const personajes = await client.listPackCharacters(p.id, p.version).catch(() => [])
          for (const c of personajes) nombres[c.id] = c.name
        }
        if (alive && Object.keys(nombres).length > 0) setRemoteNames((actual) => ({ ...actual, ...nombres }))
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, packIds])

  const nameOf = (id: string) => characterNameFrom(pack, remoteNames, id)
  // Las archivadas no estorban arriba: van plegadas al final.
  const activas = tables?.filter((t) => t.status !== 'archived')
  const archivadas = tables?.filter((t) => t.status === 'archived')

  return (
    <main className="page">
      <UserBar title="Tus mesas" user={user} back={null} onLogout={logout} />

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <Link href="/mesas/nueva" className="btn primary">
          Crear mesa
        </Link>
        <button type="button" className="btn ghost small" onClick={() => void load()} disabled={loading}>
          {loading ? <span className="spinner" aria-hidden /> : null} Actualizar
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {pendingFriends > 0 ? (
        <a href="#amigos" className="notice" style={{ display: 'block', marginBottom: 14 }}>
          {pendingFriends === 1 ? 'Tienes una solicitud de amistad esperando. Acéptala abajo, en Amigos.' : `Tienes ${pendingFriends} solicitudes de amistad esperando. Acéptalas abajo, en Amigos.`}
        </a>
      ) : null}
      {tables === null && loading ? (
        <p className="hint" style={{ textAlign: 'center' }}>
          Buscando tus mesas...
        </p>
      ) : null}
      {tables?.length === 0 ? <p className="hint">No estás en ninguna mesa todavía. Crea una o pide al anfitrión que te invite.</p> : null}

      <div className="table-list">
        {activas?.map((table) => {
          const me = memberOf(table, user.id)
          const others = table.members.filter((m) => m.id !== me?.id)
          return (
            <Link key={table.id} href={`/mesas/${table.id}`} className="table-card">
              <div className="top">
                <span className="name">{table.name}</span>
                <span className={`badge${table.status === 'active' ? '' : ' quiet'}`}>{table.status === 'active' ? 'activa' : table.status}</span>
              </div>
              <div className="seat">{seatLabel(me, nameOf)}</div>
              <div className="meta">
                {tableCardMeta(table, packs)}
              </div>
              {others.length > 0 ? (
                <div className="party">
                  {others.map((m) => (
                    <span key={m.id} className="member">
                      <Portrait path={m.characterId ? (pack?.characters.get(m.characterId)?.portrait ?? null) : null} name={m.userName ?? '?'} size={26} />
                      {memberTag(m, nameOf)}
                    </span>
                  ))}
                </div>
              ) : null}
              {!table.campaignId ? <div className="error" style={{ marginTop: 8 }}>Esta mesa no tiene campaña todavía.</div> : null}
              <RetireTable client={client} table={table} host={me?.role === 'host'} onChanged={() => void load(true)} />
            </Link>
          )
        })}
      </div>

      {archivadas && archivadas.length > 0 ? (
        <details className="archivadas">
          <summary>Mesas archivadas ({archivadas.length})</summary>
          <p className="hint">No salen arriba, pero siguen guardadas con todo lo que jugaron. Puedes recuperarlas cuando quieras.</p>
          <div className="table-list">
            {archivadas.map((table) => {
              const me = memberOf(table, user.id)
              return (
                <Link key={table.id} href={`/mesas/${table.id}`} className="table-card quiet">
                  <div className="top">
                    <span className="name">{table.name}</span>
                    <span className="badge quiet">archivada</span>
                  </div>
                  <div className="meta">{tableCardMeta(table, packs)}</div>
                  <RetireTable client={client} table={table} host={me?.role === 'host'} onChanged={() => void load(true)} />
                </Link>
              )
            })}
          </div>
        </details>
      ) : null}

      <div id="amigos" style={{ marginTop: 24 }}>
        <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} />
      </div>
    </main>
  )
}
