'use client'

import { createApiClient, normalizeBaseUrl, packArtUrl, type CatalogWorldCard, type SeasonPassOffer, type SeasonPath } from '@rpg-ngn/api-client'
import { cardView, passView, seasonProgress, stopLabel } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { WEB_HEADER, useSession } from '../../lib/session'
import { Isotipo } from '../Brand'

const SPEC = 'https://github.com/jadwer/rpg-ngn/blob/dev/docs/05-content-pack-spec.md'

/** Mundos que caben en la fila de destacados antes de "Crea tu propio mundo". */
const FILA = 4

/**
 * Arte de la franja de temporada. Vacio hasta que llegue la ilustracion
 * (1600x600, escena a la derecha y la izquierda oscura para el texto); el
 * hueco ya existe y sin imagen se ve un degradado.
 */
const ARTE_TEMPORADA: string | null = null

/**
 * El catalogo vivo en la portada (`concepto home.png`, seccion 3, con los
 * estados de `conceptboard_catalog.png`): los mundos destacados con su estado
 * para quien mira, y la temporada con sus capitulos y el pase. Se ve sin
 * cuenta; con ella, cada tarjeta y el camino dicen lo tuyo.
 */
export function HomeCatalog() {
  const session = useSession()
  const publicClient = useMemo(
    () =>
      createApiClient({
        baseUrl: normalizeBaseUrl(session.serverUrl),
        tokenProvider: () => null,
        fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'omit' }),
      }),
    [session.serverUrl],
  )
  const booting = session.stage.name === 'booting'
  const signedIn = !!(session.client && session.user)
  const client = session.client && session.user ? session.client : publicClient

  const [worlds, setWorlds] = useState<CatalogWorldCard[] | null>(null)
  const [season, setSeason] = useState<SeasonPath | null>(null)
  const [pass, setPass] = useState<SeasonPassOffer | null>(null)

  useEffect(() => {
    if (booting) return
    let alive = true
    client.catalogWorlds().then(
      (r) => {
        if (!alive) return
        setWorlds(r.worlds.filter((w) => w.origin === 'oficial'))
        setSeason(r.season)
        setPass(r.pass)
      },
      () => alive && setWorlds([]),
    )
    return () => {
      alive = false
    }
  }, [client, booting])

  const destacados = (worlds ?? []).slice(0, FILA)
  // Los huecos que faltan para llenar la fila: mientras carga, tarjetas en
  // blanco; cargado, "Proximamente" hasta que haya mas mundos.
  const huecos = Math.max(0, FILA - destacados.length)
  const names = Object.fromEntries((worlds ?? []).map((w) => [w.id, w]))
  const volver = (to: string) => (signedIn ? to : `/crear-cuenta?volver=${encodeURIComponent(to)}`)

  return (
    <>
      <section className="home-mundos" id="mundos" aria-labelledby="mundos-titulo">
        <div className="cabeza">
          <h2 id="mundos-titulo">Mundos destacados</h2>
          <Link href="/mundos/explorar" className="ver-todos">
            Ver todos los mundos
          </Link>
        </div>
        <div className="grid">
          {destacados.map((world) => {
            const view = cardView(world)
            const cover = packArtUrl(world.id, world.catalog.cover)
            const estado = view.badge ?? view.hint ?? view.price
            return (
              <Link key={world.id} href={`/mundos/explorar/${encodeURIComponent(world.id)}`} className={`mundo estado-${world.state}`}>
                <span className="portada">
                  {cover ? <img src={cover} alt="" loading="lazy" /> : null}
                  {view.action === 'bloqueado' ? <span className="candado" aria-hidden /> : null}
                </span>
                <span className="genero">{world.catalog.genre}</span>
                <h3>{world.name}</h3>
                <p>{world.catalog.synopsis}</p>
                <ul className="tags">
                  {world.catalog.tags.slice(0, 2).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {estado ? <span className="estado">{estado}</span> : null}
              </Link>
            )
          })}
          {Array.from({ length: huecos }, (_, i) =>
            worlds === null ? (
              <div key={`carga-${i}`} className="mundo cargando" aria-hidden />
            ) : (
              <div key={`pronto-${i}`} className="mundo proximo">
                <span className="portada" aria-hidden>
                  <Isotipo mini height={48} />
                </span>
                <span className="genero">Próximamente</span>
                <h3>Un mundo nuevo</h3>
                <p>Se está escribiendo. Llega con la temporada.</p>
              </div>
            ),
          )}
          <a className="mundo propio" href={SPEC} target="_blank" rel="noreferrer">
            <Isotipo mini height={64} />
            <h3>Crea tu propio mundo</h3>
            <p>Un mundo es un pack de datos: personajes, lugares, secretos y sesiones. El formato es público.</p>
            <ul className="tags">
              <li>Sin límites</li>
              <li>Tu historia</li>
            </ul>
          </a>
        </div>
      </section>

      {season && season.worlds.length > 0 ? (
        <section className="home-temporada" aria-labelledby="temporada-titulo">
          <div className="arte" style={ARTE_TEMPORADA ? { backgroundImage: `url(${ARTE_TEMPORADA})` } : undefined} aria-hidden />
          <div className="contenido">
            <div className="texto">
              <span className="kicker">{season.name}</span>
              <h2 id="temporada-titulo">Caminos que se abren jugando</h2>
              <p>Cada turno que juegas es un capítulo. Los capítulos abren mundos nuevos, y lo que abres se queda contigo.</p>
              {signedIn ? (
                <p className="capitulos">
                  <b>{season.chapters}</b> {season.chapters === 1 ? 'capítulo' : 'capítulos'} esta temporada
                </p>
              ) : null}
              <Camino season={season} names={names} />
            </div>
            <Pase offer={pass} href={volver('/mundos/explorar')} />
          </div>
        </section>
      ) : null}
    </>
  )
}

function Camino({ season, names }: { season: SeasonPath; names: Record<string, CatalogWorldCard> }) {
  const { progress, stops } = seasonProgress(season)
  return (
    <div className="camino">
      <div className="linea">
        <span className="hecho" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <ol>
        {stops.map((stop) => {
          const w = names[stop.packId]
          const cover = w ? packArtUrl(w.id, w.catalog.cover) : null
          return (
            <li key={stop.packId} className={stop.unlocked ? 'abierto' : 'cerrado'} style={{ left: `${stop.at * 100}%` }}>
              <Link href={`/mundos/explorar/${encodeURIComponent(stop.packId)}`}>{cover ? <img src={cover} alt="" loading="lazy" /> : <span className="vacio" />}</Link>
              <span className="nombre">{w?.name ?? stop.packId}</span>
              <span className="umbral">{stopLabel(stop)}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Pase({ offer, href }: { offer: SeasonPassOffer | null; href: string }) {
  const view = passView(offer)
  if (!view) return null
  return (
    <aside className={`pase${view.owned ? ' activo' : ''}`} aria-label="Pase de temporada">
      <span className="kicker">Pase de temporada</span>
      <h3>Capítulos x2</h3>
      <ul>
        {view.perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
      <p className="precio">{view.priceLine}</p>
      {view.owned ? null : (
        <Link href={href} className="btn primary">
          Obtener el pase
        </Link>
      )}
    </aside>
  )
}
