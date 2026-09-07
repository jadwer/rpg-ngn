import { access, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { reduce } from '@rpg-ngn/campaign'
import { loadPack, parseEventLog, type FileSource } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { createProvider } from './factory.js'
import type { DMOutput } from './provider.js'

const repoRoot = resolve(import.meta.dirname, '../../..')

function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) => access(join(root, path)).then(() => true, () => false),
    list: (dir) => readdir(join(root, dir), { withFileTypes: true }).then((e) => e.filter((x) => x.isFile()).map((x) => x.name), () => []),
  }
}

async function pilotContext() {
  const { pack } = await loadPack(fsSource(join(repoRoot, 'content/packs/pilot')))
  const log = parseEventLog(await readFile(join(repoRoot, 'campaigns/pilot/events.jsonl'), 'utf8'), { pack: pack! })
  const state = reduce(log.events, { pack: pack!, ruleset: fantasyD20Lite })
  return { pack: pack!, state }
}

async function collect(iterable: AsyncIterable<DMOutput>): Promise<DMOutput[]> {
  const out: DMOutput[] = []
  for await (const item of iterable) out.push(item)
  return out
}

describe('ScriptedDMProvider', () => {
  it('convierte cada respuesta en dialogo y player_action, y cierra con una narracion', async () => {
    const { pack, state } = await pilotContext()
    const provider = createProvider({ kind: 'scripted' })

    const outputs = await collect(
      provider.narrate({
        pack,
        state,
        session: pack.sessions.get('002'),
        turn: {
          id: 't1',
          number: 3,
          sessionId: '002',
          responses: [
            { characterId: 'zahira', playerId: 'u1', text: 'Bajo con la campana en la mano.', submittedAt: '2026-09-06T00:00:00Z', late: false },
            { characterId: 'calder', playerId: 'u2', text: 'La sigo de cerca.', submittedAt: '2026-09-06T00:00:01Z', late: false },
          ],
        },
      }),
    )

    const blocks = outputs.filter((o) => o.kind === 'block')
    const events = outputs.filter((o) => o.kind === 'event')
    const addressed = outputs.find((o) => o.kind === 'addressed')

    expect(blocks.map((b) => (b.kind === 'block' ? b.block.type : ''))).toEqual(['system', 'dialogue', 'dialogue', 'narration'])
    expect(blocks[1]).toMatchObject({ block: { speaker: 'Zahira', speakerRef: 'character:zahira' } })
    expect(events.map((e) => (e.kind === 'event' ? e.event['type'] : ''))).toEqual(['player_action', 'player_action', 'narration'])
    expect(events[0]).toMatchObject({ event: { actor: 'character:zahira', declared: 'Bajo con la campana en la mano.' } })
    expect(addressed).toEqual({ kind: 'addressed', characterIds: ['calder', 'narivyl', 'zahira'] })
  })

  it('un turno vacio no produce eventos', async () => {
    const { pack, state } = await pilotContext()

    const outputs = await collect(
      createProvider({ kind: 'scripted' }).narrate({ pack, state, session: undefined, turn: { id: 't', number: 1, sessionId: '002', responses: [] } }),
    )

    expect(outputs.filter((o) => o.kind === 'event')).toEqual([])
    expect(outputs[0]).toMatchObject({ block: { type: 'system' } })
  })

  it('anthropic todavia no existe', () => {
    expect(() => createProvider({ kind: 'anthropic', model: 'x', credential: 'y' })).toThrow(/entrega 6/)
  })
})
