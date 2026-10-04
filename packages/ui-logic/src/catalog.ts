import { t, type MessageKey } from '@rpg-ngn/i18n'
import type { CatalogWorldCard, SeasonPassOffer, WorldCatalog, WorldState } from '@rpg-ngn/api-client'
import { GENRES, PLAY_MODES, type PlayMode } from '@rpg-ngn/content'
import { packPrice } from './credits.js'

/**
 * Las tarjetas de Explorar mundos (`conceptboard_catalog.png`, docs/24
 * seccion 3): que dice cada estado y que hace su boton. Sin React.
 */

export type CardAction = 'jugar' | 'comprar' | 'anadir' | 'bloqueado' | 'detalle'

export interface CardView {
  /** "Oficial · Valdoria", "Comunidad · por Nara". */
  byline: string
  /** Precio o estado en una linea: "Gratis", "3 USD", "Incluido en tu pase". */
  price: string | null
  /** Sello arriba de la portada: "Ya es tuyo", "Incluido en tu pase". */
  badge: string | null
  action: CardAction
  label: string
  /** 0 a 1 en el camino de temporada; null fuera de el. */
  progress: number | null
  /** "Se desbloquea en 18 capitulos". */
  hint: string | null
}

export function cardView(world: Pick<CatalogWorldCard, 'state' | 'origin' | 'catalog' | 'price' | 'path' | 'name'> & { source?: string | null }): CardView {
  const byline = world.origin === 'oficial' ? 'Oficial' : `Comunidad · por ${world.catalog.author}`
  const base = { byline, badge: null, progress: null, hint: null } as const
  switch (world.state as WorldState) {
    case 'gratis':
      return { ...base, price: t('worlds.free'), action: 'jugar', label: t('worlds.play') }
    case 'tuyo':
      return { ...base, price: null, badge: world.source === 'pase' ? t('worlds.inYourPass') : t('worlds.yours'), action: 'jugar', label: t('worlds.play') }
    case 'pase':
      return { ...base, price: null, badge: t('worlds.inYourPass'), action: 'jugar', label: t('worlds.play') }
    case 'venta':
      return { ...base, price: world.price ? packPrice(world.price) : null, action: 'comprar', label: t('worlds.buy') }
    case 'camino': {
      const path = world.path
      const left = path ? Math.max(0, path.threshold - path.have) : null
      return { ...base, price: null, action: 'bloqueado', label: t('worlds.details'), progress: path ? Math.min(1, path.have / Math.max(1, path.threshold)) : 0, hint: left !== null ? (left === 1 ? t('worlds.unlockOne') : t('worlds.unlockMany', { count: left })) : t('worlds.unlockPlaying') }
    }
    case 'comunidad':
      return { ...base, price: t('worlds.free'), action: 'anadir', label: t('worlds.addToMine') }
    default:
      return { ...base, price: null, action: 'detalle', label: t('worlds.details') }
  }
}

/** "3-5", "1-4": jugadores en la etiqueta corta de la tarjeta. */
export function playersTag(players: { min: number; max: number }): string {
  return players.min === players.max ? String(players.min) : `${players.min}-${players.max}`
}

export function durationLabel(duration: 'corta' | 'media' | 'larga'): string {
  return { corta: t('worlds.short'), media: t('worlds.medium'), larga: t('worlds.long') }[duration]
}

/**
 * El camino de la temporada para pintarlo: cuanto se lleva (0 a 1 contra el
 * ultimo umbral) y cada parada en su sitio de la linea.
 */
export function seasonProgress(path: { chapters: number; worlds: ReadonlyArray<{ packId: string; threshold: number; unlocked: boolean }> }): {
  progress: number
  stops: Array<{ packId: string; threshold: number; unlocked: boolean; at: number }>
} {
  const top = Math.max(1, ...path.worlds.map((w) => w.threshold))
  return {
    progress: Math.min(1, path.chapters / top),
    stops: path.worlds.map((w) => ({ ...w, at: w.threshold / top })),
  }
}

/**
 * El bloque del pase de temporada (tablero A: "Capitulos x2, 5 USD, pago
 * unico"). Null sin temporada en curso.
 */
export function passView(offer: SeasonPassOffer | null): { price: string; priceLine: string; perks: string[]; owned: boolean; label: string } | null {
  if (!offer) return null
  return {
    price: packPrice(offer),
    // La linea de precio que pintan web y app, igual en las dos (VAM 26-09, A9).
    priceLine: offer.owned ? t('worlds.passOwned') : t('worlds.oneTime', { price: packPrice(offer) }),
    perks: [t('worlds.perkChapters'), t('worlds.perkWorlds'), t('worlds.perkPrivate')],
    owned: offer.owned,
    label: offer.owned ? t('worlds.passActive') : t('worlds.buyPass'),
  }
}

/** La tarjeta dorada tras pagar el pase o un mundo, con el tono de la de los paquetes. */
export function catalogBlessing(kind: 'pase' | 'mundo' | 'bendicion', name: string, firstTurns = 10): { title: string; text: string; farewell: string } {
  return {
    title: t('account.credits.blessingTitle'),
    text: kind === 'bendicion' ? t('blessing.purchased', { n: firstTurns }) : kind === 'pase' ? t('worlds.blessingPass', { name }) : t('worlds.blessingWorld', { name }),
    farewell: t('account.credits.blessingFarewell'),
  }
}

/**
 * Lo que dice cada parada del camino de temporada, igual en web y app (VAM
 * 26-09, A1: habia cuatro copias con textos distintos). Umbral cero es gratis;
 * abierto si ya es tuyo o lo juegas; si no, cuantos capitulos pide.
 */
export function stopLabel(stop: { threshold: number; unlocked: boolean }): string {
  if (stop.threshold === 0) return t('worlds.free')
  if (stop.unlocked) return t('worlds.open')
  return stop.threshold === 1 ? t('worlds.chapterOne') : t('worlds.chapterMany', { count: stop.threshold })
}

/** El camino en una linea ("Los Nueve Viajeros: gratis · La Mascarada: 20 capítulos"), para donde no cabe la linea grafica. */
export function seasonPathLine(worlds: ReadonlyArray<{ packId: string; threshold: number; unlocked: boolean }>, names: Readonly<Record<string, string>>): string {
  return worlds.map((w) => `${names[w.packId] ?? w.packId}: ${stopLabel(w).toLowerCase()}`).join('  ·  ')
}

/**
 * Las estrellas de un mundo en su tarjeta (docs/26, H6): "★ 4.6 (12)". Null
 * si nadie lo ha valorado: una tarjeta sin estrellas es mejor que un cero.
 */
export function ratingLine(rating: { average: number; count: number } | null | undefined): string | null {
  if (!rating || rating.count === 0) return null
  return `★ ${rating.average.toFixed(1)} (${rating.count})`
}

/** Los generos y modos del vocabulario (docs/26, H8), para los filtros de Explorar. */
export const CATALOG_GENRES: readonly string[] = GENRES
export const CATALOG_MODES: readonly PlayMode[] = PLAY_MODES

/** Etiqueta de un genero del vocabulario; un slug desconocido se enseña tal cual. */
export function genreLabel(slug: string): string {
  return (GENRES as readonly string[]).includes(slug) ? t(`taxonomy.genre.${slug}` as MessageKey) : slug
}

export function modeLabel(mode: PlayMode): string {
  return mode === 'solo' ? t('taxonomy.mode.solo') : t('taxonomy.mode.grupo')
}

/**
 * La linea de formato de una tarjeta (docs/26, H8): "One-shot · 1 jugador ·
 * 30 a 40 min por sesion". Sin el vocabulario nuevo, la duracion de siempre.
 */
export function formatLine(catalog: Pick<WorldCatalog, 'format' | 'players' | 'duration' | 'sessionLength'>): string {
  const format = t(`taxonomy.format.${catalog.format}` as MessageKey)
  const players = catalog.players.max <= 1 ? t('taxonomy.onePlayer') : `${playersTag(catalog.players)} ${t('explorePage.jugadores').toLowerCase()}`
  const length = catalog.sessionLength ? t(`taxonomy.session.${catalog.sessionLength}` as MessageKey) : durationLabel(catalog.duration)
  return [format, players, length].join(' · ')
}
