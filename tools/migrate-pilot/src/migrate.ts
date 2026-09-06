import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { formatEventLog, parseEventLog } from '@rpg-ngn/content'

/**
 * Migracion unica del log del piloto (BA1 de docs/10, D4 de docs/11).
 *
 * Es la unica reescritura del historial que el ADR permite: se hace ahora,
 * con 21 eventos y sin usuarios. Aplica upcastEvent a cada linea (v:1, id,
 * recordedAt completado con el inicio de la sesion y marcado como precision
 * de sesion), valida el resultado y reescribe el archivo. Es idempotente:
 * sobre un log ya en v1 no cambia nada.
 *
 * Uso: tsx src/migrate.ts --file <ruta a events.jsonl>
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const fileIndex = args.indexOf('--file')
  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('uso: migrate --file <events.jsonl>')
    return 2
  }
  const file = resolve(args[fileIndex + 1]!)

  const before = await readFile(file, 'utf8')
  const { events, issues } = parseEventLog(before, { path: file })
  const errors = issues.filter((issue) => issue.level === 'error')

  for (const issue of issues) {
    console.log(`${issue.level === 'error' ? 'ERROR' : 'aviso'}  ${issue.path}: ${issue.message}`)
  }

  if (errors.length > 0) {
    console.error(`no se migra: ${errors.length} errores`)
    return 1
  }

  const after = formatEventLog(events)
  if (after === before) {
    console.log(`${file}: ya esta en la version vigente, sin cambios`)
    return 0
  }

  await writeFile(file, after, 'utf8')
  const filled = events.filter((event) => event.recordedAtPrecision === 'session').length
  console.log(`${file}: ${events.length} eventos migrados a v1 (${filled} con recordedAt tomado del inicio de sesion)`)
  return 0
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error)
    process.exit(2)
  },
)
