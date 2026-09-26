'use client'

import { ApiError, packArtUrl, type ApiClient, type CatalogFilters, type CatalogWorldCard, type SeasonPath } from '@rpg-ngn/api-client'
import { cardView, durationLabel, playersTag, seasonProgress } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PublicOrApp } from '../../../components/shell/PublicOrApp'
import { ShellIcon } from '../../../components/shell/icons'

export default function ExplorarMundosPage() {
  return <PublicOrApp>{(client, signedIn) => <Explorar client={client} signedIn={signedIn} />}</PublicOrApp>
}

/**
 * Explorar mundos (E9, `img/design_ui_ux/conceptboard_catalog.png`, 26-09):
 * portada, buscador y filtros, y una tarjeta por mundo con su estado para
 * quien mira. Se ve sin cuenta; jugar la pide.
 */
function Explorar({ client, signedIn }: { client: ApiClient; signedIn: boolean }) {
  const router = useRouter()
  const [worlds, setWorlds] = useState<CatalogWorldCard[] | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [season, setSeason] = useState<SeasonPath | null>(null)
  // Nombre y portada de cada mundo del camino, aunque un filtro lo esconda de la lista.
  const [known, setKnown] = useState<Record<string, CatalogWorldCard>>({})
  const [filters, setFilters] = useState<CatalogFilters>({})
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await client.catalogWorlds({ ...filters, ...(q.trim() ? { q: q.trim() } : {}) })
      setWorlds(result.worlds)
      setSeason(result.season)
      setKnown((actual) => ({ ...actual, ...Object.fromEntries(result.worlds.map((w) => [w.id, w])) }))
      if (result.genres.length) setGenres((actual) => (actual.length ? actual : result.genres))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.')
    }
  }, [client, filters, q])

  useEffect(() => {
    const timer = setTimeout(() => void load(), q ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, q])

  const tones = useMemo(() => [...new Set((worlds ?? []).flatMap((w) => w.catalog.tags))].sort(), [worlds])
  const set = (patch: Partial<CatalogFilters>) => setFilters((f) => ({ ...f, ...patch }))

  const act = async (world: CatalogWorldCard) => {
    const view = cardView(world)
    if (view.action === 'jugar') {
      router.push(signedIn ? `/mesas/nueva?mundo=${encodeURIComponent(world.id)}` : `/entrar?volver=${encodeURIComponent(`/mesas/nueva?mundo=${world.id}`)}`)
      return
    }
    if (view.action === 'anadir' && world.packId !== undefined) {
      if (!signedIn) return router.push('/entrar?volver=/mundos/explorar')
      setBusy(world.id)
      try {
        await client.activatePack(world.packId)
        await load()
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No se pudo añadir el mundo.')
      } finally {
        setBusy(null)
      }
      return
    }
    router.push(`/mundos/explorar/${encodeURIComponent(world.id)}`)
  }

  return (
    <div className="explorar">
      <section className="explorar-hero">
        <h1>
          Historias que existen
          <br />
          porque tú las viviste
        </h1>
        <p>Vive una historia donde tú decides qué pasa, con un director de juego que no se cansa.</p>
        <div className="acciones">
          <a href="#mundos" className="btn primary grande">
            Explorar historias
          </a>
          <button type="button" className="btn grande" onClick={() => set({ origin: undefined, duration: 'larga' })}>
            Descubrir campañas
          </button>
        </div>
      </section>

      {season && season.worlds.length > 0 ? <SeasonBlock season={season} known={known} signedIn={signedIn} /> : null}

      <div className="explorar-filtros" id="mundos">
        <label className="buscar">
          <ShellIcon name="buscar" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar mundos…" aria-label="Buscar mundos" />
        </label>
        <select value={filters.genre ?? ''} onChange={(e) => set({ genre: e.target.value || undefined })} aria-label="Género">
          <option value="">Género</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select value={filters.tone ?? ''} onChange={(e) => set({ tone: e.target.value || undefined })} aria-label="Tono">
          <option value="">Tono</option>
          {tones.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={filters.players ?? ''} onChange={(e) => set({ players: e.target.value ? Number(e.target.value) : undefined })} aria-label="Jugadores">
          <option value="">Jugadores</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'Sola o solo' : `${n} jugadores`}
            </option>
          ))}
        </select>
        <select value={filters.duration ?? ''} onChange={(e) => set({ duration: (e.target.value || undefined) as CatalogFilters['duration'] })} aria-label="Duración">
          <option value="">Duración</option>
          <option value="corta">Corta</option>
          <option value="media">Media</option>
          <option value="larga">Larga</option>
        </select>
        <div className="origen" role="group" aria-label="Origen">
          <button type="button" aria-pressed={filters.origin !== 'comunidad'} onClick={() => set({ origin: filters.origin === 'oficial' ? undefined : 'oficial' })}>
            Oficiales
          </button>
          <button type="button" aria-pressed={filters.origin !== 'oficial'} onClick={() => set({ origin: filters.origin === 'comunidad' ? undefined : 'comunidad' })}>
            Comunidad
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {worlds === null ? <p className="hint">Abriendo el catálogo…</p> : null}
      {worlds?.length === 0 ? <p className="hint">Ningún mundo coincide con esos filtros.</p> : null}

      <div className="mundo-grid">
        {worlds?.map((world) => {
          const view = cardView(world)
          const cover = packArtUrl(world.id, world.catalog.cover)
          return (
            <article key={world.id} className={`mundo-card estado-${world.state}`}>
              <Link href={`/mundos/explorar/${encodeURIComponent(world.id)}`} className="portada">
                {cover ? <img src={cover} alt="" loading="lazy" /> : null}
                {view.badge ? <span className="sello">{view.badge}</span> : null}
                {view.action === 'bloqueado' ? (
                  <span className="candado" aria-label="Bloqueado">
                    <ShellIcon name="candado" />
                  </span>
                ) : null}
              </Link>
              <div className="cuerpo">
                <Link href={`/mundos/explorar/${encodeURIComponent(world.id)}`} className="titulo">
                  {world.name}
                </Link>
                <ul className="chips">
                  <li>{world.catalog.genre}</li>
                  <li>{playersTag(world.catalog.players)}</li>
                  <li>{durationLabel(world.catalog.duration)}</li>
                </ul>
                <p className="byline">{view.byline}</p>
                {view.price ? <p className="precio">{view.price}</p> : null}
                {view.hint ? <p className="pista">{view.hint}</p> : null}
                {view.progress !== null ? (
                  <div className="barra" role="progressbar" aria-valuenow={Math.round(view.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${Math.round(view.progress * 100)}%` }} />
                  </div>
                ) : null}
                <button type="button" className={`btn ${view.action === 'comprar' || view.action === 'bloqueado' ? '' : 'primary'}`} disabled={busy === world.id} onClick={() => void act(world)}>
                  {busy === world.id ? <span className="spinner" aria-hidden /> : null}
                  {view.label}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/** "Temporada actual: caminos que se abren jugando" (tablero A). */
function SeasonBlock({ season, known, signedIn }: { season: SeasonPath; known: Record<string, CatalogWorldCard>; signedIn: boolean }) {
  const { progress, stops } = seasonProgress(season)
  return (
    <section className="temporada" aria-label="Temporada actual">
      <div className="cabeza">
        <h2>
          {season.name} <span>· Caminos que se abren jugando</span>
        </h2>
      </div>
      <div className="cuerpo">
        <div className="capitulos">
          {signedIn ? (
            <>
              <b>{season.chapters}</b>
              <span>{season.chapters === 1 ? 'capítulo' : 'capítulos'}</span>
              <small>Has avanzado un {Math.round(progress * 100)}%</small>
            </>
          ) : (
            <small>Cada turno que juegas es un capítulo. Entra para ver tu avance.</small>
          )}
        </div>
        <div className="camino">
          <div className="linea">
            <span className="hecho" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <ol>
            {stops.map((stop) => {
              const w = known[stop.packId]
              const cover = w ? packArtUrl(w.id, w.catalog.cover) : null
              return (
                <li key={stop.packId} className={stop.unlocked ? 'abierto' : 'cerrado'} style={{ left: `${stop.at * 100}%` }}>
                  <Link href={`/mundos/explorar/${encodeURIComponent(stop.packId)}`}>
                    {cover ? <img src={cover} alt="" /> : <span className="vacio" />}
                    {!stop.unlocked ? (
                      <span className="candado">
                        <ShellIcon name="candado" />
                      </span>
                    ) : null}
                  </Link>
                  <span className="nombre">{w?.name ?? stop.packId}</span>
                  <span className="umbral">{stop.threshold === 0 ? 'Gratis' : `${stop.threshold} capítulos`}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
