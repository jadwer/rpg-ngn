import { describe, expect, it } from 'vitest'
import { createApiClient, memberOf } from './client.js'
import type { ApiError } from './errors.js'

/**
 * Integracion contra una API viva. Solo corre con RPG_API_URL definido
 * (por ejemplo `RPG_API_URL=http://127.0.0.1:8010`), con la base sembrada
 * (`php artisan migrate --seed`) y al menos una mesa donde jaz sea miembro.
 * No abre ni cierra turnos: eso lo hace el smoke con curl.
 */
const url = process.env['RPG_API_URL']

describe.skipIf(!url)('API viva', () => {
  it('entra como jaz, lista sus mesas y lee el estado de la primera', async () => {
    let token: string | null = null
    const api = createApiClient({ baseUrl: url!, tokenProvider: () => token })

    const login = await api.login('jaz@example.com', 'password', 'vitest')
    expect(login.token).toMatch(/^\d+\|/)
    token = login.token

    const me = await api.profile()
    expect(me.email).toBe('jaz@example.com')

    const tables = await api.listTables()
    expect(tables.length).toBeGreaterThan(0)
    const table = tables[0]!
    expect(memberOf(table, me.id)?.role).toBe('player')
    expect(table.campaignId).not.toBeNull()

    const state = await api.tableState(table.id)
    expect(state.campaign.id).toBe(Number(table.campaignId))
    expect(state.lastBlockId).toBeGreaterThanOrEqual(0)

    const again = await api.tableState(table.id, state.lastBlockId)
    expect(again.blocks).toEqual([])

    const sessions = await api.listSessions(table.campaignId!)
    expect(Array.isArray(sessions)).toBe(true)

    const character = memberOf(table, me.id)?.characterId
    if (character && state.campaign.headSeq > 0) {
      const mine = await api.playerProjection(table.campaignId!, character)
      expect(mine.projection.characterId).toBe(character)
      const other = await api.playerProjection(table.campaignId!, character === 'zahira' ? 'calder' : 'zahira').catch((e: unknown) => e)
      expect((other as ApiError).status).toBe(403)
    }

    const anonymous = createApiClient({ baseUrl: url!, tokenProvider: () => 'no-token' })
    const error = await anonymous.profile().catch((e: unknown) => e)
    expect((error as ApiError).isUnauthorized).toBe(true)
  })
})
