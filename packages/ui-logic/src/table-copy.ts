import { t } from '@rpg-ngn/i18n'
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
  return pack ? t('table.copy.namePlaceholderPack', { pack: pack.name }) : t('table.copy.namePlaceholder')
}

/**
 * Ejemplo de premisa. Sin pack, uno neutro; con pack, se apoya en su nombre
 * y su lema, que es lo unico suyo que conocemos sin cargar el contenido.
 */
export function premisePlaceholder(pack: Pick<PackOption, 'name' | 'tagline'> | null): string {
  const base = t('table.copy.premiseBase')
  if (!pack) return `${base} ${t('table.copy.premiseExample')}`
  // El lema es una frase suelta y necesita su punto, o se lee pegada a la
  // siguiente ("...Nueve Viajeros. Diferentes caminos Tono de misterio"). Sin
  // comillas: el ejemplo entero ya va entre comillas y anidarlas queda peor.
  const gancho = pack.tagline ? ` ${pack.tagline.replace(/[.,;:]$/, '')}.` : ''
  return `${base} ${t('table.copy.premiseExamplePack', { pack: pack.name, hook: gancho })}`
}

/**
 * Cada opcion del selector de pack. Decia `Nombre (pilot@0.4.0,
 * fantasy-d20-lite)`: la version y el id son cosa del motor, y el sistema con
 * su nombre tecnico no le dice nada a quien va a elegir con que jugar. El
 * detalle de que trae el pack ya se lee debajo, en `packSummaryText`.
 */
export function packOptionLabel(pack: Pick<PackOption, 'name' | 'type'>): string {
  return `${pack.name} (${pack.type === 'campaign' ? t('table.copy.campaign') : t('table.copy.world')})`
}

/** Lo que se lee bajo el selector de pack: de que va y cuanto trae. */
export function packSummaryText(pack: PackOption | null): string | null {
  if (!pack) return null
  const piezas: string[] = []
  if (pack.characters > 0) piezas.push(t(pack.characters === 1 ? 'table.copy.characterOne' : 'table.copy.characterMany', { count: pack.characters }))
  if (pack.sessions > 0) piezas.push(t(pack.sessions === 1 ? 'table.copy.sessionOne' : 'table.copy.sessionMany', { count: pack.sessions }))
  const detalle = piezas.length > 0 ? ` (${piezas.join(', ')})` : ''
  return pack.tagline ? `${pack.tagline}${detalle}` : `${t('table.copy.system', { system: pack.system })}${detalle}`
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
  if (table.premise) partes.push(t('table.copy.withPremise'))
  return partes.join(' · ')
}

/**
 * Que significa "sin personaje" segun donde se elige. Decia siempre "Solo
 * miras y diriges la mesa", que es falso al invitar: ahi el invitado SI va a
 * jugar, solo que elige su personaje al entrar (Gabino, 20-09).
 */
export function noCharacterText(context: 'create' | 'invite'): { title: string; hint: string } {
  if (context === 'invite') return { title: t('table.copy.pickOnJoinTitle'), hint: t('table.copy.pickOnJoinHint') }
  return { title: t('table.copy.noCharacterTitle'), hint: t('table.copy.noCharacterHint') }
}

/** Quien juega un personaje ya tomado, en el selector. */
export function characterOwnerText(owner: string): string {
  return t('table.copy.playedBy', { owner })
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
    deleteWarning: options.host && !options.played ? t('table.copy.deleteWarning') : null,
  }
}

/** El texto del aviso al retirar, segun lo que toque. */
export function retirementText(retirement: TableRetirement): { archive: string; hint: string } {
  if (retirement.archived) {
    return { archive: t('table.copy.restore'), hint: t('table.copy.archivedHint') }
  }
  if (retirement.canDelete) {
    return { archive: t('table.copy.archive'), hint: t('table.copy.unplayedHint') }
  }
  return { archive: t('table.copy.archiveTable'), hint: t('table.copy.playedHint') }
}

/** De donde sale un pack, para decirlo junto al nombre: nada si es oficial. */
export function packOriginText(pack: Pick<PackOption, 'origin' | 'author'>): string | null {
  if (pack.origin === 'mine') return t('table.copy.originMine')
  if (pack.origin === 'catalog') return pack.author ? t('table.copy.originBy', { author: pack.author }) : t('table.copy.originCatalog')
  return null
}

/** El estado de un mundo subido, como lo lee su autor. */
export function packStatusText(status: string | undefined): string {
  switch (status) {
    case 'pending':
      return t('table.copy.statusPending')
    case 'published':
      return t('table.copy.statusPublished')
    case 'rejected':
      return t('table.copy.statusRejected')
    case 'retired':
      return t('table.copy.statusRetired')
    default:
      return t('table.copy.statusPrivate')
  }
}
