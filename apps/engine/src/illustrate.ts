import type { LoadedPack } from '@rpg-ngn/content'
import type { CampaignState } from '@rpg-ngn/campaign'
import type { Illustration } from '@rpg-ngn/engine-contract'

/**
 * Que ilustrar al terminar un turno (E10a). El engine decide cuando y arma
 * el prompt; la API decide si se genera y con quien.
 *
 * El prompt sale solo del pack y del estado (lo que ve un recien llegado al
 * lugar, raza y clase de quien esta en cuadro, el estilo del pack) y de la
 * frase que el DM marco como momento, que ya paso el lint de conocimiento.
 * Nunca del texto libre de un jugador: es la puerta a imagenes que no
 * queremos generar.
 */

const DEFAULT_STYLE = 'ilustración pictórica cinematográfica de fantasía, luz dramática, colores ricos, estilo de novela visual'

/** Como mucho tres caras de referencia: mas confunde a los generadores. */
const MAX_REFERENCES = 3

export interface IllustrationInput {
  pack: LoadedPack
  /** Estado antes del turno y despues, para ver si la party cambio de lugar. */
  before: CampaignState
  after: CampaignState
  party: readonly string[]
  /** Turno 1 sin declaraciones: la apertura de la sesion. */
  opening: boolean
  /** La frase del DM, si marco un momento. */
  moment: string | null
}

/** Donde esta la mayor parte de la party; null si nadie tiene lugar. */
export function partyLocation(state: CampaignState, party: readonly string[]): string | null {
  const counts = new Map<string, number>()
  for (const id of party) {
    const location = state.world.characters[id]?.location
    if (location) counts.set(location, (counts.get(location) ?? 0) + 1)
  }
  let best: string | null = null
  let most = 0
  for (const [location, count] of counts) {
    if (count > most) {
      best = location
      most = count
    }
  }
  return best
}

export function illustrationFor(input: IllustrationInput): Illustration | null {
  const { pack, before, after, party, opening, moment } = input
  const location = partyLocation(after, party)
  const moved = location !== null && location !== partyLocation(before, party)

  const reason: Illustration['reason'] | null = moment ? 'moment' : opening ? 'opening' : moved ? 'location' : null
  if (!reason) return null

  const place = location ? pack.locations.get(location) : undefined
  const present = party.filter((id) => !location || after.world.characters[id]?.location === location)
  const characters = present.map((id) => pack.characters.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
  const inFrame = characters.slice(0, MAX_REFERENCES)

  const lines: string[] = []
  if (moment) lines.push(`Escena: ${moment}`)
  else if (place) lines.push(`Escena: ${opening ? 'comienza la historia en' : 'llegan a'} ${place.name}.`)
  if (place) lines.push(`Lugar: ${place.name}. ${place.newcomerView}`)
  if (inFrame.length) {
    lines.push(`Personajes en cuadro, iguales a sus retratos de referencia y en ese orden: ${inFrame.map((c) => `${c.name} (${c.race}, ${c.class})`).join('; ')}.`)
  }
  lines.push(`Estilo: ${pack.manifest.artStyle ?? DEFAULT_STYLE}.`)
  lines.push('Encuadre horizontal amplio. Sin texto, letras, firmas ni marcos. Nada explícito ni sangriento en primer plano.')

  const alt = moment ?? (place ? `${place.name}${inFrame.length ? `, con ${inFrame.map((c) => c.name).join(', ')}` : ''}.` : null)
  if (!alt) return null

  return {
    reason,
    prompt: lines.join('\n'),
    alt: alt.slice(0, 300),
    references: inFrame.map((c) => c.portrait).filter((p): p is string => typeof p === 'string'),
    withCharacters: inFrame.length > 0,
    location: location ?? null,
  }
}
