'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, packArtUrl, type ApiClient, type CatalogFilters, type CatalogWorldCard, type SeasonPassOffer, type SeasonPath } from '@rpg-ngn/api-client'
import { cardView, durationLabel, passView, playersTag, seasonProgress, stopLabel } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CatalogCheckout, type CatalogProduct } from '../../../components/payments/Checkout'
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
  const [pass, setPass] = useState<SeasonPassOffer | null>(null)
  const [buying, setBuying] = useState<CatalogProduct | null>(null)
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
      setPass(result.pass)
      setKnown((actual) => ({ ...actual, ...Object.fromEntries(result.worlds.map((w) => [w.id, w])) }))
      if (result.genres.length) setGenres((actual) => (actual.length ? actual : result.genres))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('play.catalogLoadFailed'))
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
        setError(e instanceof ApiError ? e.message : t('play.worldAddFailed'))
      } finally {
        setBusy(null)
      }
      return
    }
    if (view.action === 'comprar') {
      if (!signedIn) return router.push('/entrar?volver=/mundos/explorar')
      setBuying({ kind: 'mundo', id: world.id, name: world.name })
      return
    }
    router.push(`/mundos/explorar/${encodeURIComponent(world.id)}`)
  }

  const buyPass = () => {
    if (!signedIn) return router.push('/entrar?volver=/mundos/explorar')
    if (season) setBuying({ kind: 'pase', name: season.name })
  }

  return (
    <div className="explorar">
      <section className="explorar-hero">
        <h1>
          {t('explorePage.historiasQueExisten')}
          <br />
          {t('explorePage.porqueTuLasViviste')}
        </h1>
        <p>{t('explorePage.viveUnaHistoriaDonde')}</p>
        <div className="acciones">
          <a href="#mundos" className="btn primary grande">
            {t('explorePage.explorarHistorias')}
          </a>
          <button type="button" className="btn grande" onClick={() => set({ origin: undefined, duration: 'larga' })}>
            {t('explorePage.descubrirCampanas')}
          </button>
        </div>
      </section>

      {season && season.worlds.length > 0 ? <SeasonBlock season={season} known={known} signedIn={signedIn} pass={pass} onBuyPass={buyPass} /> : null}
      {buying ? <CatalogCheckout client={client} product={buying} onClose={() => setBuying(null)} onDone={load} /> : null}

      <div className="explorar-filtros" id="mundos">
        <label className="buscar">
          <ShellIcon name="buscar" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('explorePage.buscarMundos')} aria-label={t('explorePage.buscarMundos2')} />
        </label>
        <select value={filters.genre ?? ''} onChange={(e) => set({ genre: e.target.value || undefined })} aria-label={t('explorePage.genero')}>
          <option value="">{t('explorePage.genero')}</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select value={filters.tone ?? ''} onChange={(e) => set({ tone: e.target.value || undefined })} aria-label={t('explorePage.tono')}>
          <option value="">{t('explorePage.tono')}</option>
          {tones.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={filters.players ?? ''} onChange={(e) => set({ players: e.target.value ? Number(e.target.value) : undefined })} aria-label={t('explorePage.jugadores')}>
          <option value="">{t('explorePage.jugadores')}</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? t('play.solo') : t('play.playersN', { count: n })}
            </option>
          ))}
        </select>
        <select value={filters.duration ?? ''} onChange={(e) => set({ duration: (e.target.value || undefined) as CatalogFilters['duration'] })} aria-label={t('explorePage.duracion')}>
          <option value="">{t('explorePage.duracion')}</option>
          <option value="corta">{t('explorePage.corta')}</option>
          <option value="media">{t('explorePage.media')}</option>
          <option value="larga">{t('explorePage.larga')}</option>
        </select>
        <div className="origen" role="group" aria-label={t('explorePage.origen')}>
          <button type="button" aria-pressed={filters.origin !== 'comunidad'} onClick={() => set({ origin: filters.origin === 'oficial' ? undefined : 'oficial' })}>
            {t('explorePage.oficiales')}
          </button>
          <button type="button" aria-pressed={filters.origin !== 'oficial'} onClick={() => set({ origin: filters.origin === 'comunidad' ? undefined : 'comunidad' })}>
            {t('explorePage.comunidad')}
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {worlds === null ? <p className="hint">{t('explorePage.abriendoElCatalogo')}</p> : null}
      {worlds?.length === 0 ? <p className="hint">{t('explorePage.ningunMundoCoincideCon')}</p> : null}

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
                  <span className="candado" aria-label={t('explorePage.bloqueado')}>
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
function SeasonBlock({ season, known, signedIn, pass, onBuyPass }: { season: SeasonPath; known: Record<string, CatalogWorldCard>; signedIn: boolean; pass: SeasonPassOffer | null; onBuyPass: () => void }) {
  const { progress, stops } = seasonProgress(season)
  const offer = passView(pass)
  return (
    <section className="temporada" aria-label={t('explorePage.temporadaActual')}>
      <div className="cabeza">
        <h2>
          {season.name} <span>{t('explorePage.caminosQueSeAbren')}</span>
        </h2>
      </div>
      <div className="cuerpo">
        <div className="capitulos">
          {signedIn ? (
            <>
              <b>{season.chapters}</b>
              <span>{season.chapters === 1 ? t('common.capituloWord') : t('common.capitulosWord')}</span>
              <small>{t('explorePage.hasAvanzadoUn', { percent: Math.round(progress * 100) })}</small>
              <Link href="/temporada" className="pase-ver">
                {t('explorePage.verElPase')}
              </Link>
            </>
          ) : (
            <small>{t('explorePage.cadaTurnoQueJuegas')}</small>
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
                  <span className="umbral">{stopLabel(stop)}</span>
                </li>
              )
            })}
          </ol>
        </div>
        {offer ? (
          <aside className={`pase${offer.owned ? ' activo' : ''}`} aria-label={t('explorePage.paseDeTemporada')}>
            <h3>{t('explorePage.paseDeTemporada')}</h3>
            <ul>
              {offer.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <p className="precio">{offer.priceLine}</p>
            <button type="button" className={`btn${offer.owned ? '' : ' primary'}`} disabled={offer.owned} onClick={onBuyPass}>
              {offer.label}
            </button>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
