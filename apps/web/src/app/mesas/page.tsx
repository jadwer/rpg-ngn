'use client'

import { ApiError, memberOf, type ApiClient, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import { characterNameFrom, memberTag, seatLabel, tableCardMeta } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FriendsPanel } from '../../components/FriendsPanel'
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await client.listTables()
      setTables([...list].sort((a, b) => Number(b.id) - Number(a.id)))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }, [client, unauthorized])

  useEffect(() => {
    void load()
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
      {tables === null && loading ? (
        <p className="hint" style={{ textAlign: 'center' }}>
          Buscando tus mesas...
        </p>
      ) : null}
      {tables?.length === 0 ? <p className="hint">No estás en ninguna mesa todavía. Crea una o pide al anfitrión que te invite.</p> : null}

      <div className="table-list">
        {tables?.map((table) => {
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
            </Link>
          )
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} />
      </div>
    </main>
  )
}
