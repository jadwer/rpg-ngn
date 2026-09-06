import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { hasErrors, loadPack, parseEventLog, type Issue, type LoadedPack } from '@rpg-ngn/content'
import { fsSource } from './fs-source.js'

/**
 * Recorre `content/packs/*` y `campaigns/*` bajo una raiz y devuelve todos
 * los problemas. La campaña `campaigns/<id>` se valida contra el pack
 * `content/packs/<id>` (misma carpeta, misma id); si no existe, es error.
 */

export interface ValidationReport {
  packs: string[]
  campaigns: string[]
  issues: Issue[]
  ok: boolean
}

export async function validateRepo(root: string): Promise<ValidationReport> {
  const issues: Issue[] = []
  const packs = new Map<string, LoadedPack>()
  const packNames: string[] = []
  const campaignNames: string[] = []

  for (const packDir of await subdirectories(join(root, 'content/packs'))) {
    const id = packDir.split('/').at(-1)!
    packNames.push(id)
    const result = await loadPack(fsSource(packDir))
    issues.push(...prefix(result.issues, relative(root, packDir)))
    if (result.pack) packs.set(id, result.pack)
  }

  for (const campaignDir of await subdirectories(join(root, 'campaigns'))) {
    const id = campaignDir.split('/').at(-1)!
    const logPath = join(campaignDir, 'events.jsonl')
    const logRel = relative(root, logPath)

    let text: string
    try {
      text = await readFile(logPath, 'utf8')
    } catch {
      continue
    }
    campaignNames.push(id)

    const pack = packs.get(id)
    if (!pack) {
      issues.push({ level: 'error', path: logRel, message: `no hay un pack valido en content/packs/${id} contra el cual validar la campaña` })
    }

    const parsed = parseEventLog(text, { pack, path: logRel })
    issues.push(...parsed.issues)
  }

  return { packs: packNames, campaigns: campaignNames, issues, ok: !hasErrors(issues) }
}

async function subdirectories(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => join(dir, entry.name))
    const checked = await Promise.all(dirs.map(async (d) => ((await stat(d)).isDirectory() ? d : null)))
    return checked.filter((d): d is string => d !== null).sort()
  } catch {
    return []
  }
}

function prefix(issues: Issue[], base: string): Issue[] {
  return issues.map((issue) => ({ ...issue, path: `${base}/${issue.path}` }))
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = []
  lines.push(`packs: ${report.packs.join(', ') || 'ninguno'}`)
  lines.push(`campañas: ${report.campaigns.join(', ') || 'ninguna'}`)

  for (const issue of report.issues) {
    lines.push(`${issue.level === 'error' ? 'ERROR' : 'aviso'}  ${issue.path}: ${issue.message}`)
  }

  const errors = report.issues.filter((i) => i.level === 'error').length
  const warnings = report.issues.length - errors
  lines.push(report.ok ? `OK (${warnings} avisos)` : `FALLO: ${errors} errores, ${warnings} avisos`)
  return lines.join('\n')
}
