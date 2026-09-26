'use client'

import { ApiError, memberOf, packArtUrl, packPortraitUrl, type ApiClient, type PackCharacter, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import { characterNameFrom, filterCounts, filterLabel, filterTables, inviteTokenFrom, pendingReceived, relativeTime, seatLabel, stateLabel, TABLE_FILTERS, tableState, worldOf, worldTags, type TableFilter } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Portrait } from '../../components/Portrait'
import { RequireSession } from '../../components/RequireSession'
import { RetireTable } from '../../components/RetireTable'
import { AppShell } from '../../components/shell/AppShell'
import { ShellIcon } from '../../components/shell/icons'
import { PACK_ID } from '../../lib/pack'
import { usePack } from '../../lib/usePack'
import type { StoredUser } from '../../lib/storage'

export default function TablesPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <Tables client={client} user={user} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

/**
 * Las mesas donde el usuario es miembro, con el tablero de Gabino
 * (`img/design_ui_ux/mesas_ux.png`, 26-09): cabecera sobre la escena,
 * filtros con conteo, orden por ultima actividad y una tarjeta con la
 * portada del mundo, sus etiquetas y quien juega.
 */
function Tables({ client, user, unauthorized }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void }) {
  const router = useRouter()
  const { pack } = usePack()
  const [tables, setTables] = useState<TableSummary[] | null>(null)
  const [packs, setPacks] = useState<PackOption[]>([])
  // Personajes de los packs que la web no lleva dentro: nombre y retrato.
  const [remote, setRemote] = useState<Record<string, PackCharacter[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<TableFilter>('todas')
  const [joining, setJoining] = useState(false)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [pendingFriends, setPendingFriends] = useState(0)

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      setError(null)
      try {
        const [list, friendships] = await Promise.all([client.listTables(), client.listFriendships().catch(() => [])])
        setTables(list)
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

  // Una invitacion o una solicitud nuevas aparecen solas.
  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 10_000)
    return () => clearInterval(timer)
  }, [load])

  // Clave estable de los packs en juego: `tables` cambia de referencia en cada sondeo.
  const packIds = [...new Set((tables ?? []).map((t) => t.packId))].sort().join(',')

  useEffect(() => {
    if (packIds === '') return
    let alive = true
    void client.listPacks().then(
      async (catalogo) => {
        if (!alive) return
        setPacks(catalogo)
        const usados = new Set(packIds.split(','))
        const personajes: Record<string, PackCharacter[]> = {}
        for (const p of catalogo.filter((p) => p.id !== PACK_ID && usados.has(p.id))) {
          personajes[p.id] = await client.listPackCharacters(p.id, p.version).catch(() => [])
        }
        if (alive) setRemote((actual) => ({ ...actual, ...personajes }))
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, packIds])

  const remoteNames = useMemo(() => Object.fromEntries(Object.values(remote).flat().map((c) => [c.id, c.name])), [remote])
  const nameOf = (id: string) => characterNameFrom(pack, remoteNames, id)
  const portraitOf = (packId: string, characterId: string | null): { path: string | null; uri: string | null } => {
    if (!characterId) return { path: null, uri: null }
    if (packId === PACK_ID) return { path: pack?.characters.get(characterId)?.portrait ?? null, uri: null }
    const c = (remote[packId] ?? []).find((x) => x.id === characterId)
    return { path: null, uri: packPortraitUrl(packId, c?.portrait) }
  }

  const counts = useMemo(() => filterCounts(tables ?? []), [tables])
  const shown = useMemo(() => filterTables(tables ?? [], filter), [tables, filter])

  const join = () => {
    const token = inviteTokenFrom(link)
    if (!token) {
      setLinkError('Eso no parece un enlace de invitación. Pega el enlace completo que te mandaron.')
      return
    }
    router.push(`/unirse/${token}`)
  }

  return (
    <div className="mesas">
      <section className="mesas-hero">
        <h1>Tus mesas</h1>
        <p className="sub">Historias en las que estás jugando</p>
        <div className="acciones">
          <Link href="/mesas/nueva" className="btn primary grande">
            <ShellIcon name="mas" />
            Crear mesa
          </Link>
          <button type="button" className="btn grande" aria-expanded={joining} onClick={() => setJoining((v) => !v)}>
            <ShellIcon name="enlace" />
            Unirme con enlace
          </button>
        </div>
        {joining ? (
          <form
            className="unirme"
            onSubmit={(e) => {
              e.preventDefault()
              join()
            }}
          >
            <input className="input" value={link} onChange={(e) => (setLink(e.target.value), setLinkError(null))} placeholder="https://adastramentis.com/unirse/…" aria-label="Enlace de invitación" autoFocus />
            <button type="submit" className="btn primary">
              Entrar
            </button>
            {linkError ? <span className="error">{linkError}</span> : null}
          </form>
        ) : null}
      </section>

      {error ? <div className="error">{error}</div> : null}
      {pendingFriends > 0 ? (
        <a href="#amigos" className="notice" style={{ display: 'block', marginBottom: 14 }}>
          {pendingFriends === 1 ? 'Tienes una solicitud de amistad esperando. Acéptala abajo, en Amigos.' : `Tienes ${pendingFriends} solicitudes de amistad esperando. Acéptalas abajo, en Amigos.`}
        </a>
      ) : null}

      <div className="mesas-filtros" role="tablist" aria-label="Filtrar mesas">
        {TABLE_FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'active' : undefined} onClick={() => setFilter(f)}>
            {filterLabel(f, counts[f])}
          </button>
        ))}
        <span className="orden">
          <ShellIcon name="orden" />
          Última actividad
        </span>
      </div>

      {tables === null && loading ? <p className="hint">Buscando tus mesas…</p> : null}
      {tables !== null && shown.length === 0 ? (
        <p className="hint">{filter === 'todas' ? 'No estás en ninguna mesa todavía. Crea una o pide al anfitrión que te invite.' : 'No hay mesas aquí.'}</p>
      ) : null}

      <div className="mesa-lista">
        {shown.map((table) => {
          const me = memberOf(table, user.id)
          const world = worldOf(table, packs)
          const cover = packArtUrl(table.packId, world?.catalog?.cover)
          const state = tableState(table)
          const others = table.members.filter((m) => m.id !== me?.id)
          const shownMembers = table.members.slice(0, 3)
          const extra = table.members.length - shownMembers.length
          const text = table.premise ?? world?.catalog?.synopsis ?? world?.tagline ?? null
          return (
            <article key={table.id} className={`mesa-card ${state}`}>
              <Link href={`/mesas/${table.id}`} className="portada" tabIndex={-1} aria-hidden>
                {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="sin-portada">{(world?.name ?? table.name).charAt(0)}</span>}
              </Link>
              <div className="cuerpo">
                <div className="linea">
                  <Link href={`/mesas/${table.id}`} className="nombre">
                    {table.name}
                  </Link>
                  <span className={`estado ${state}`}>{stateLabel(state)}</span>
                </div>
                <div className="asiento">{seatLabel(me, nameOf)}</div>
                {world?.catalog ? (
                  <ul className="etiquetas">
                    {worldTags(world.catalog).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="etiquetas">{world?.name ?? table.packId}</div>
                )}
                {text ? <p className="sinopsis">{text}</p> : null}
                {!table.campaignId ? <div className="error">Esta mesa no tiene campaña todavía.</div> : null}
              </div>
              <div className="lado">
                <div className="actividad">
                  <span>Última actividad</span>
                  <span>{relativeTime(table.lastActivityAt) || '—'}</span>
                </div>
                <div className="avatares" title={others.map((m) => m.userName).filter(Boolean).join(', ')}>
                  {shownMembers.map((m) => {
                    const p = portraitOf(table.packId, m.characterId)
                    return <Portrait key={m.id} path={p.path} uri={p.uri} name={m.characterId ? nameOf(m.characterId) : (m.userName ?? '?')} size={40} />
                  })}
                  {extra > 0 ? <span className="mas">+{extra}</span> : null}
                </div>
                <div className="botones">
                  <Link href={`/mesas/${table.id}`} className="btn primary">
                    <ShellIcon name="jugar" />
                    Continuar
                  </Link>
                  <details className="opciones">
                    <summary className="btn">
                      <ShellIcon name="opciones" />
                      Opciones
                    </summary>
                    <div className="menu">
                      <RetireTable client={client} table={table} host={me?.role === 'host'} onChanged={() => void load(true)} />
                    </div>
                  </details>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div id="amigos" style={{ marginTop: 28 }}>
        <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} />
      </div>
    </div>
  )
}
