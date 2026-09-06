import { mkdtemp, mkdir, writeFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateRepo } from './validate.js'

const repoRoot = resolve(import.meta.dirname, '../../..')

describe('validateRepo', () => {
  it('el repo real pasa sin errores', async () => {
    const report = await validateRepo(repoRoot)

    expect(report.packs).toContain('pilot')
    expect(report.campaigns).toContain('pilot')
    expect(report.issues.filter((i) => i.level === 'error')).toEqual([])
    expect(report.ok).toBe(true)
  })

  it('un evento roto a proposito hace fallar la validacion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rpg-validate-'))
    await mkdir(join(root, 'content/packs'), { recursive: true })
    await cp(join(repoRoot, 'content/packs/pilot'), join(root, 'content/packs/pilot'), { recursive: true })
    await mkdir(join(root, 'campaigns/pilot'), { recursive: true })
    await writeFile(
      join(root, 'campaigns/pilot/events.jsonl'),
      [
        JSON.stringify({ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', payload: { party: ['character:zahira'] } }),
        JSON.stringify({ id: 'evt-00002', v: 1, seq: 2, type: 'roll', sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', actor: 'character:fantasma', resolved: { kind: 'skill', die: '1d20', result: 99, source: 'csprng:secrets' } }),
      ].join('\n') + '\n',
    )

    const report = await validateRepo(root)

    expect(report.ok).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({ level: 'error', message: 'character:fantasma no existe en el pack' }))
  })

  it('una campaña sin pack es error', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rpg-validate-'))
    await mkdir(join(root, 'campaigns/huerfana'), { recursive: true })
    await writeFile(join(root, 'campaigns/huerfana/events.jsonl'), '')

    const report = await validateRepo(root)

    expect(report.ok).toBe(false)
    expect(report.issues[0]?.message).toContain('content/packs/huerfana')
  })
})
