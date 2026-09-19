'use client'

import { ApiError, memberOf, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { RequireSession } from '../../../components/RequireSession'
import { TableScreen } from '../../../components/TableScreen'
import { usePack } from '../../../lib/usePack'
import type { StoredUser } from '../../../lib/storage'

export default function TablePage() {
  const params = useParams<{ id: string }>()
  return <RequireSession>{({ client, user, unauthorized }) => <TableLoader client={client} user={user} tableId={params.id} unauthorized={unauthorized} />}</RequireSession>
}

/** Carga la mesa (miembros, premisa, campaña) y entra; el estado vivo lo lleva TableScreen por polling. */
function TableLoader({ client, user, tableId, unauthorized }: { client: ApiClient; user: StoredUser; tableId: string; unauthorized: (notice?: string) => void }) {
  const { pack } = usePack()
  const [table, setTable] = useState<TableSummary | null>(null)
  // Nombres de personaje de un pack que esta web no lleva dentro, para que la
  // mesa no hable de "shiho" cuando el personaje se llama Shiho.
  const [remoteNames, setRemoteNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setTable(await client.table(tableId))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [client, tableId, unauthorized])

  useEffect(() => {
    void load()
  }, [load])

  const ajeno = table && table.packId !== pack?.manifest.id ? table : null
  useEffect(() => {
    if (!ajeno) return
    let alive = true
    void client.listPackCharacters(ajeno.packId, ajeno.packVersion).then(
      (personajes) => {
        if (!alive) return
        setRemoteNames(Object.fromEntries(personajes.map((c) => [c.id, c.name])))
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, ajeno?.packId, ajeno?.packVersion])

  if (error) {
    return (
      <main className="page">
        <div className="error">{error}</div>
        <p>
          <Link href="/mesas" className="btn">
            Volver a las mesas
          </Link>
        </p>
      </main>
    )
  }
  if (!table) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <span className="spinner" aria-hidden /> <span className="hint">Entrando a la mesa...</span>
      </div>
    )
  }
  if (!memberOf(table, user.id)) {
    return (
      <main className="page">
        <div className="error">No eres miembro de esta mesa.</div>
      </main>
    )
  }
  return (
    <TableScreen
      key={table.id}
      client={client}
      table={table}
      user={user}
      pack={table.packId === pack?.manifest.id ? pack : null}
      remoteNames={remoteNames}
      onTableChanged={() => void load()}
      onUnauthorized={unauthorized}
    />
  )
}
