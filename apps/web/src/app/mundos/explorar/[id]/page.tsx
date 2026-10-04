'use client'

import { t, type MessageKey } from '@rpg-ngn/i18n'
import { ApiError, packArtUrl, packMapUrl, packPortraitUrl, type ApiClient, type CatalogWorldDetail } from '@rpg-ngn/api-client'
import { cardView, durationLabel, languageName, playersTag, ratingLine, worldLanguages } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CatalogCheckout } from '../../../../components/payments/Checkout'
import { Portrait } from '../../../../components/Portrait'
import { PublicOrApp } from '../../../../components/shell/PublicOrApp'
import { ShellIcon } from '../../../../components/shell/icons'

export default function MundoPage() {
  return <PublicOrApp>{(client, signedIn) => <Mundo client={client} signedIn={signedIn} />}</PublicOrApp>
}

const PROCEDENCIA: Record<string, MessageKey> = {
  original: 'play.provOriginal',
  licensed: 'play.provLicensed',
  'user-provided': 'play.provUser',
}

/** El detalle de un mundo (tablero B): portada, sinopsis, galeria, personajes y lo que incluye. */
function Mundo({ client, signedIn }: { client: ApiClient; signedIn: boolean }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [world, setWorld] = useState<CatalogWorldDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    let alive = true
    void client.catalogWorld(id).then(
      (w) => alive && setWorld(w),
      (e: unknown) => alive && setError(e instanceof ApiError ? e.message : t('play.worldOpenFailed')),
    )
    return () => {
      alive = false
    }
  }, [client, id])

  if (error) {
    return (
      <div className="mundo-detalle">
        <Link href="/mundos/explorar" className="migas">
          <ShellIcon name="volver" /> {t('worldPage.explorarMundos')}
        </Link>
        <div className="error">{error}</div>
      </div>
    )
  }
  if (!world) return <p className="hint">{t('worldPage.abriendoElMundo')}</p>

  const view = cardView(world)
  const cover = packArtUrl(world.id, world.catalog.cover)
  const gallery = [...world.catalog.gallery.map((f) => packArtUrl(world.id, f)), ...world.maps.map((m) => packMapUrl(world.id, m.image))].filter((u): u is string => !!u)

  const act = async () => {
    if (view.action === 'comprar') {
      if (!signedIn) return router.push(`/entrar?volver=/mundos/explorar/${world.id}`)
      setBuying(true)
      return
    }
    if (view.action === 'jugar') {
      router.push(signedIn ? `/mesas/nueva?mundo=${encodeURIComponent(world.id)}` : `/entrar?volver=${encodeURIComponent(`/mesas/nueva?mundo=${world.id}`)}`)
      return
    }
    if (view.action === 'anadir' && world.packId !== undefined) {
      if (!signedIn) return router.push(`/entrar?volver=/mundos/explorar/${world.id}`)
      setBusy(true)
      try {
        await client.activatePack(world.packId)
        setWorld(await client.catalogWorld(world.id))
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('play.worldAddFailed'))
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="mundo-detalle">
      {buying ? (
        <CatalogCheckout
          client={client}
          product={{ kind: 'mundo', id: world.id, name: world.name }}
          onClose={() => setBuying(false)}
          onDone={async () => setWorld(await client.catalogWorld(world.id))}
        />
      ) : null}
      <section className="cabecera" style={cover ? { backgroundImage: `linear-gradient(90deg, rgba(11,15,20,0.95) 0%, rgba(11,15,20,0.75) 45%, rgba(11,15,20,0.2) 100%), url(${cover})` } : undefined}>
        <Link href="/mundos/explorar" className="migas">
          <ShellIcon name="volver" /> {t('shell.nav.exploreWorlds')} · {world.catalog.genre}
        </Link>
        <h1>{world.name}</h1>
        <ul className="chips">
          <li>{world.catalog.genre}</li>
          <li>
            {playersTag(world.catalog.players)} {t('worldPage.jugadores').toLowerCase()}
          </li>
          <li>
            {durationLabel(world.catalog.duration)}
            {world.catalog.hours ? ` (${world.catalog.hours})` : ''}
          </li>
        </ul>
        <p className="byline">{view.byline}</p>
        {ratingLine(world.rating) ? <p className="estrellas">{ratingLine(world.rating)}</p> : null}
        <div className="accion">
          {view.action === 'jugar' || view.action === 'anadir' || view.action === 'comprar' ? (
            <button type="button" className="btn primary grande" disabled={busy} onClick={() => void act()}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {view.label}
            </button>
          ) : null}
          {view.price ? <span className="precio">{view.price}</span> : null}
          {view.badge ? <span className="sello">{view.badge}</span> : null}
          {view.hint ? <span className="pista">{view.hint}</span> : null}
        </div>
        <p className="sinopsis">{world.catalog.synopsis}</p>
      </section>

      {gallery.length > 0 ? (
        <section className="galeria" aria-label={t('worldPage.imagenesDelMundo')}>
          {gallery.slice(0, 5).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </section>
      ) : null}

      {world.playable.length > 0 ? (
        <section className="jugables">
          <h2>{t('worldPage.personajesJugables')}</h2>
          <div className="lista">
            {world.playable.map((c) => (
              <div key={c.id} className="pj">
                <Portrait path={null} uri={packPortraitUrl(world.id, c.portrait)} name={c.name} size={120} />
                <span className="nombre">{c.name}</span>
                {c.role ? <span className="rol">{c.role}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fichas">
        <div className="sobre">
          <h2>{t('worldPage.sobreEsteMundo')}</h2>
          <dl>
            <dt>{t('worldPage.genero')}</dt>
            <dd>{world.catalog.genre}</dd>
            <dt>{t('worldPage.idiomas')}</dt>
            <dd>{worldLanguages(world).map(languageName).join(', ')}</dd>
            {world.catalog.tags.length ? (
              <>
                <dt>{t('worldPage.tono')}</dt>
                <dd>{world.catalog.tags.join(', ')}</dd>
              </>
            ) : null}
            <dt>{t('worldPage.jugadores')}</dt>
            <dd>{playersTag(world.catalog.players)}</dd>
            <dt>{t('worldPage.duracionEstimada')}</dt>
            <dd>{world.catalog.hours ?? durationLabel(world.catalog.duration)}</dd>
            <dt>{t('worldPage.autor')}</dt>
            <dd>{world.catalog.author}</dd>
            <dt>{t('worldPage.procedencia')}</dt>
            <dd>{PROCEDENCIA[world.catalog.provenance] ? t(PROCEDENCIA[world.catalog.provenance]!) : world.catalog.provenance}</dd>
          </dl>
        </div>
        <div className="incluye">
          <h2>{t('worldPage.queIncluye')}</h2>
          <ul>
            <li>{t('worldPage.escenarioCompleto')}</li>
            <li>
              {world.characters} {world.characters === 1 ? 'personaje jugable' : 'personajes jugables'} con trasfondo
            </li>
            {world.maps.length ? <li>{world.maps.length === 1 ? t('play.mapOf', { name: world.maps[0]!.name }) : t('play.mapsN', { count: world.maps.length })}</li> : null}
            <li>{world.sessions === 1 ? t('play.oneSession') : t('play.sessionsN', { count: world.sessions })}</li>
            <li>{t('worldPage.directorDeJuegoPor')}</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
