import type { PackOption } from '@rpg-ngn/api-client'

/**
 * Los textos de ayuda de "mesa nueva", que dependen del pack elegido.
 *
 * Estaban escritos para el piloto: quien elegia otro pack leia un ejemplo de
 * premisa sobre Valdoria y la mina, que no tiene nada que ver con lo que va
 * a jugar. Un ejemplo que habla de otro mundo confunde mas que ayudar.
 */

/**
 * Nombre de un personaje cuando la mesa puede jugar un pack que el cliente no
 * lleva empaquetado.
 *
 * `characterName` cae en el id cuando el pack no lo conoce, asi que encadenarle
 * un `?? remoto[id]` no sirve de nada: nunca devuelve null y el nombre remoto
 * jamas gana. Aqui el orden esta explicito, que es lo que hacia falta para que
 * la mesa no diga "juegas a shiho".
 */
export function characterNameFrom(
  local: { characters: { get(id: string): { name: string } | undefined } } | null,
  remote: Readonly<Record<string, string>>,
  id: string,
): string {
  return local?.characters.get(id)?.name ?? remote[id] ?? id
}

/** Nombre sugerido para la mesa, a partir del pack. */
export function tableNamePlaceholder(pack: Pick<PackOption, 'name'> | null): string {
  return pack ? `${pack.name}, sábado` : 'La mesa del sábado'
}

/**
 * Ejemplo de premisa. Sin pack, uno neutro; con pack, se apoya en su nombre
 * y su lema, que es lo unico suyo que conocemos sin cargar el contenido.
 */
export function premisePlaceholder(pack: Pick<PackOption, 'name' | 'tagline'> | null): string {
  const base = 'Campaña, escena o tono; el director de juego la usa como punto de partida.'
  if (!pack) return `${base} Por ejemplo: "Primera noche, todos se conocen por primera vez y algo va mal desde el principio."`
  // El lema es una frase suelta y necesita su punto, o se lee pegada a la
  // siguiente ("...Nueve Viajeros. Diferentes caminos Tono de misterio"). Sin
  // comillas: el ejemplo entero ya va entre comillas y anidarlas queda peor.
  const gancho = pack.tagline ? ` ${pack.tagline.replace(/[.,;:]$/, '')}.` : ''
  return `${base} Por ejemplo: "Jugamos ${pack.name}.${gancho} Tono de misterio, ritmo ágil, español de México."`
}

/**
 * Cada opcion del selector de pack. Decia `Nombre (pilot@0.4.0,
 * fantasy-d20-lite)`: la version y el id son cosa del motor, y el sistema con
 * su nombre tecnico no le dice nada a quien va a elegir con que jugar. El
 * detalle de que trae el pack ya se lee debajo, en `packSummaryText`.
 */
export function packOptionLabel(pack: Pick<PackOption, 'name' | 'type'>): string {
  return `${pack.name} (${pack.type === 'campaign' ? 'campaña' : 'mundo'})`
}

/** Lo que se lee bajo el selector de pack: de que va y cuanto trae. */
export function packSummaryText(pack: PackOption | null): string | null {
  if (!pack) return null
  const piezas: string[] = []
  if (pack.characters > 0) piezas.push(`${pack.characters} ${pack.characters === 1 ? 'personaje' : 'personajes'}`)
  if (pack.sessions > 0) piezas.push(`${pack.sessions} ${pack.sessions === 1 ? 'sesión escrita' : 'sesiones escritas'}`)
  const detalle = piezas.length > 0 ? ` (${piezas.join(', ')})` : ''
  return pack.tagline ? `${pack.tagline}${detalle}` : `Sistema ${pack.system}${detalle}`
}

/**
 * La linea bajo el nombre de la mesa en la lista.
 *
 * Antes decia `private-botica@0.1.0 · court-intrigue@1.0.0`, que es lo que
 * el motor necesita saber y a quien juega no le dice nada. Con el catalogo
 * cargado se pone el nombre del pack; sin el, el id, que al menos es corto.
 */
export function tableCardMeta(
  table: { packId: string; packVersion: string; premise?: string | null },
  packs: readonly PackOption[] = [],
): string {
  const pack = packs.find((p) => p.id === table.packId)
  const partes = [pack?.name ?? table.packId]
  if (table.premise) partes.push('con premisa')
  return partes.join(' · ')
}

/**
 * Que significa "sin personaje" segun donde se elige. Decia siempre "Solo
 * miras y diriges la mesa", que es falso al invitar: ahi el invitado SI va a
 * jugar, solo que elige su personaje al entrar (Gabino, 20-09).
 */
export function noCharacterText(context: 'create' | 'invite'): { title: string; hint: string } {
  if (context === 'invite') return { title: 'Que elija al entrar', hint: 'Escoge su personaje al abrir la mesa, entre los libres' }
  return { title: 'Sin personaje', hint: 'Solo miras y diriges la mesa' }
}

/** Lo que se puede hacer para retirar una mesa de la lista. */
export interface TableRetirement {
  /** El anfitrion archiva; archivada, la recupera. */
  canArchive: boolean
  archived: boolean
  /** Borrar de verdad, solo si la mesa nunca llego a jugarse. */
  canDelete: boolean
  /** El invitado se va; el anfitrion no puede irse de lo suyo. */
  canLeave: boolean
  /** Que se le advierte antes de confirmar, o null si la accion no necesita aviso. */
  deleteWarning: string | null
}

/**
 * Que puede hacer este asiento con esta mesa (Gabino, 22-09: "no hay
 * mecanismos para borrar mesas").
 *
 * La regla de fondo: **una partida jugada no se borra, se archiva**, porque lo
 * que pasó en ella también es de los demás jugadores y el registro es de
 * solo-anexar. Borrar de verdad queda para las mesas que nunca se jugaron, que
 * son las de prueba y las que se crean por error.
 *
 * `played` sale de que la campaña tenga eventos; sin campaña cargada se asume
 * que no se jugó, y el servidor lo vuelve a comprobar de todos modos.
 */
export function tableRetirement(table: { status: string }, options: { host: boolean; played: boolean }): TableRetirement {
  const archived = table.status === 'archived'
  return {
    canArchive: options.host,
    archived,
    canDelete: options.host && !options.played,
    canLeave: !options.host,
    deleteWarning: options.host && !options.played ? 'Se borra la mesa y no se puede deshacer.' : null,
  }
}

/** El texto del aviso al retirar, segun lo que toque. */
export function retirementText(retirement: TableRetirement): { archive: string; hint: string } {
  if (retirement.archived) {
    return { archive: 'Recuperar mesa', hint: 'Archivada: no sale en tu lista, pero sigue guardada con todo lo que jugaron.' }
  }
  if (retirement.canDelete) {
    return { archive: 'Archivar', hint: 'Esta mesa no se ha jugado todavía, así que también puedes borrarla del todo.' }
  }
  return { archive: 'Archivar mesa', hint: 'Lo que jugaron se guarda: una partida también es de los demás, así que se archiva en vez de borrarse.' }
}

/** De donde sale un pack, para decirlo junto al nombre: nada si es oficial. */
export function packOriginText(pack: Pick<PackOption, 'origin' | 'author'>): string | null {
  if (pack.origin === 'mine') return 'tuyo'
  if (pack.origin === 'catalog') return pack.author ? `de ${pack.author}` : 'del catálogo'
  return null
}

/** El estado de un mundo subido, como lo lee su autor. */
export function packStatusText(status: string | undefined): string {
  switch (status) {
    case 'pending':
      return 'En revisión'
    case 'published':
      return 'Publicado'
    case 'rejected':
      return 'Rechazado'
    case 'retired':
      return 'Retirado'
    default:
      return 'Privado'
  }
}
