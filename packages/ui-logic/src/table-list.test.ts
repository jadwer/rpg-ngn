import type { WorldCatalog } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { filterCounts, filterLabel, filterTables, relativeTime, tableState, worldTags } from './table-list.js'

const t = (id: string, status: string, sessionOpen: boolean, lastActivityAt: string | null) => ({ id, status, sessionOpen, lastActivityAt })

describe('table-list', () => {
  const tables = [
    t('1', 'active', true, '2026-09-25T10:00:00Z'),
    t('2', 'active', false, '2026-09-25T12:00:00Z'),
    t('3', 'archived', false, '2026-09-26T00:00:00Z'),
    t('4', 'active', true, null),
  ]

  it('activa con sesion abierta, en pausa entre sesiones, finalizada si esta archivada', () => {
    expect(tables.map(tableState)).toEqual(['activas', 'pausa', 'finalizadas', 'activas'])
  })

  it('cuenta por filtro; "Todas" deja fuera las finalizadas', () => {
    expect(filterCounts(tables)).toEqual({ todas: 3, activas: 2, pausa: 1, finalizadas: 1 })
    expect(filterLabel('pausa', 1)).toBe('En pausa (1)')
  })

  it('ordena por ultima actividad, la mas reciente primero; sin fecha al final', () => {
    expect(filterTables(tables, 'todas').map((x) => x.id)).toEqual(['2', '1', '4'])
    expect(filterTables(tables, 'finalizadas').map((x) => x.id)).toEqual(['3'])
  })

  it('dice hace cuanto con la unidad mas grande que cabe', () => {
    const now = new Date('2026-09-26T12:00:00Z')
    expect(relativeTime('2026-09-26T11:59:30Z', now)).toBe('ahora mismo')
    expect(relativeTime('2026-09-26T10:00:00Z', now)).toBe('hace 2 horas')
    expect(relativeTime('2026-09-25T11:00:00Z', now)).toBe('hace 1 día')
    expect(relativeTime('2026-09-21T12:00:00Z', now)).toBe('hace 5 días')
    expect(relativeTime(null, now)).toBe('')
  })

  it('las etiquetas del mundo salen de su ficha del catalogo', () => {
    const catalog = { genre: 'Intriga', players: { min: 2, max: 5 }, format: 'campaña' } as WorldCatalog
    expect(worldTags(catalog)).toEqual(['Intriga', '2-5 jugadores', 'Campaña'])
    expect(worldTags({ ...catalog, players: { min: 1, max: 1 } })).toEqual(['Intriga', '1 jugador', 'Campaña'])
    expect(worldTags(null)).toEqual([])
  })
})
