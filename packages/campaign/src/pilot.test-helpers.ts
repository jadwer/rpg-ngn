import { access, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadPack, parseEventLog, type CampaignEvent, type FileSource, type LoadedPack } from '@rpg-ngn/content'

/** Solo para tests y scripts: carga el pack y el log reales del piloto. */
export const repoRoot = resolve(import.meta.dirname, '../../..')
export const pilotPackDir = join(repoRoot, 'content/packs/pilot')
export const pilotLogPath = join(repoRoot, 'campaigns/pilot/events.jsonl')
export const pilotSnapshotPath = join(repoRoot, 'campaigns/pilot/snapshots/002.json')

function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) =>
      access(join(root, path)).then(
        () => true,
        () => false,
      ),
    list: (dir) =>
      readdir(join(root, dir), { withFileTypes: true }).then(
        (entries) => entries.filter((e) => e.isFile()).map((e) => e.name),
        () => [],
      ),
  }
}

export async function loadPilot(): Promise<{ pack: LoadedPack; events: CampaignEvent[] }> {
  const { pack, issues } = await loadPack(fsSource(pilotPackDir))
  if (!pack) {
    throw new Error(`el pack piloto no carga: ${issues.map((i) => i.message).join('; ')}`)
  }
  const parsed = parseEventLog(await readFile(pilotLogPath, 'utf8'), { pack, path: pilotLogPath })
  const errors = parsed.issues.filter((i) => i.level === 'error')
  if (errors.length > 0) {
    throw new Error(`el log piloto no valida: ${errors.map((i) => i.message).join('; ')}`)
  }
  return { pack, events: parsed.events }
}
