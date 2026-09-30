import { t } from '@rpg-ngn/i18n'
import type { PackOption, TableSummary, WorldCatalog } from '@rpg-ngn/api-client'

/**
 * La lista de mesas del tablero de Gabino (`img/design_ui_ux/mesas_ux.png`,
 * 26-09): filtros con conteo, orden por ultima actividad, y lo que la tarjeta
 * dice de cada mundo. Sin React: lo mismo en la web y en la app.
 */

export type TableFilter = 'todas' | 'activas' | 'pausa' | 'finalizadas'

export const TABLE_FILTERS: readonly TableFilter[] = ['todas', 'activas', 'pausa', 'finalizadas']

type ListedTable = Pick<TableSummary, 'status' | 'sessionOpen' | 'lastActivityAt' | 'id'>

/** Finalizada es archivada; en pausa, activa sin sesion abierta; activa, con sesion abierta. */
export function tableState(table: ListedTable): Exclude<TableFilter, 'todas'> {
  if (table.status === 'archived') return 'finalizadas'
  return table.sessionOpen ? 'activas' : 'pausa'
}

export function filterLabel(filter: TableFilter, count: number): string {
  const name = { todas: t('table.list.all'), activas: t('table.list.active'), pausa: t('table.list.paused'), finalizadas: t('table.list.finished') }[filter]
  return `${name} (${count})`
}

export function stateLabel(state: Exclude<TableFilter, 'todas'>): string {
  return { activas: t('table.list.stateActive'), pausa: t('table.list.statePaused'), finalizadas: t('table.list.stateFinished') }[state]
}

export function filterCounts(tables: readonly ListedTable[]): Record<TableFilter, number> {
  const counts: Record<TableFilter, number> = { todas: 0, activas: 0, pausa: 0, finalizadas: 0 }
  for (const t of tables) {
    const state = tableState(t)
    counts[state]++
    // "Todas" no incluye las finalizadas: estorbarian arriba (se ven en su filtro).
    if (state !== 'finalizadas') counts.todas++
  }
  return counts
}

/** Las mesas del filtro, de la mas reciente a la mas antigua. */
export function filterTables<T extends ListedTable>(tables: readonly T[], filter: TableFilter): T[] {
  const kept = tables.filter((t) => (filter === 'todas' ? tableState(t) !== 'finalizadas' : tableState(t) === filter))
  const at = (t: ListedTable) => (t.lastActivityAt ? Date.parse(t.lastActivityAt) : 0)
  return [...kept].sort((a, b) => at(b) - at(a) || Number(b.id) - Number(a.id))
}

/** "hace 2 horas", "hace 1 día", "ahora mismo"; vacio si no se sabe. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const seconds = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000))
  if (Number.isNaN(seconds)) return ''
  if (seconds < 60) return t('table.time.now')
  const steps: Array<[number, 'minute' | 'hour' | 'day' | 'month' | 'year']> = [
    [60, 'minute'],
    [60 * 60, 'hour'],
    [60 * 60 * 24, 'day'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24 * 365, 'year'],
  ]
  let chosen = steps[0]!
  for (const step of steps) if (seconds >= step[0]) chosen = step
  const n = Math.floor(seconds / chosen[0])
  return n === 1 ? t(`table.time.${chosen[1]}One`) : t(`table.time.${chosen[1]}Many`, { count: n })
}

/** El mundo de una mesa en el catalogo que ya tiene la lista (`listPacks`). */
export function worldOf(table: Pick<TableSummary, 'packId'>, packs: readonly PackOption[]): PackOption | null {
  return packs.find((p) => p.id === table.packId) ?? null
}

/** "Fantasía clásica · 3-5 jugadores · Campaña": las etiquetas de la tarjeta. */
export function worldTags(catalog: WorldCatalog | null | undefined): string[] {
  if (!catalog) return []
  const { min, max } = catalog.players
  const players = min === max ? t(min === 1 ? 'table.list.playerOne' : 'table.list.playerMany', { count: min }) : t('table.list.playerRange', { min, max })
  const format = catalog.format === 'campaña' ? t('table.list.formatCampaign') : catalog.format === 'aventura' ? t('table.list.formatAdventure') : catalog.format === 'one-shot' ? t('table.list.formatOneShot') : catalog.format
  return [catalog.genre, players, format]
}
