/**
 * Lector critico (docs/27): lee una mesa entera contra lo que el mundo fija
 * (canon, desenlace, NPCs de la sesion, fichas) y lista las contradicciones
 * del GM. La mesa entra como la escribe `tables:review`, local o de
 * produccion:
 *
 *   php artisan tables:review 55 | node --env-file=<archivo con ANTHROPIC_API_KEY> \
 *     --import tsx scripts/critic.mts private-coronas
 *   ssh root@servidor 'cd /srv/rpg/rpg-ngn-api && php artisan tables:review 44' | node ... critic.mts quiero-ser-medico
 *
 * Argumentos: el pack (carpeta de content/packs) y, opcional, un archivo con
 * la mesa en vez de la entrada estandar. `SESSIONS=001,002` limita la
 * referencia a esas sesiones (por omision, las que aparecen en la mesa).
 * `CRITIC_MODEL` cambia el modelo (por omision ANTHROPIC_MODEL o Sonnet) y
 * `CRITIC_EFFORT` el esfuerzo (por omision medium; high costo el triple en
 * las mesas 44 y 55 a 57 y no encontro nada mas).
 * Cuesta unos centavos por mesa: una sola llamada.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadPack } from '@rpg-ngn/content'
import { AnthropicTransport, critique } from '@rpg-ngn/narrative'
import { fsSource } from '../src/packs.js'

const root = resolve(import.meta.dirname, '../../..')

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const [packName, file] = process.argv.slice(2)
  if (!packName) throw new Error('uso: critic.mts <pack> [archivo de tables:review]')
  const credential = process.env['ANTHROPIC_API_KEY']
  if (!credential) throw new Error('falta ANTHROPIC_API_KEY en el entorno')

  const { pack, issues } = await loadPack(fsSource(resolve(root, 'content/packs', packName)), { language: 'es' })
  if (!pack) throw new Error(`el pack ${packName} no carga: ${issues.map((i) => i.message).join('; ')}`)
  const transcript = file ? await readFile(file, 'utf8') : await readStdin()
  if (!transcript.includes('=== Sesión')) throw new Error('la entrada no parece salida de tables:review')

  const played = [...new Set([...transcript.matchAll(/=== Sesión (\S+), turno/g)].map((m) => m[1]!))]
  const sessions = process.env['SESSIONS']?.split(',') ?? played
  const model = process.env['CRITIC_MODEL'] ?? process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5'
  const effort = (process.env['CRITIC_EFFORT'] ?? 'medium') as 'low' | 'medium' | 'high'
  const transport = new AnthropicTransport({ model, credential, effort, timeoutMs: 300_000 })

  const started = Date.now()
  const { findings, unparsed, reply } = await critique(transport, { pack, transcript, sessions })
  const seconds = Math.round((Date.now() - started) / 1000)

  console.log(`# Lector critico: ${pack.manifest.name}, sesiones ${sessions.join(', ')}`)
  console.log(`${model} · ${seconds} s · ${reply.inputTokens} de entrada, ${reply.outputTokens} de salida${reply.finish === 'length' ? ' · CORTADO por largo' : ''}${unparsed ? ` · ${unparsed} linea(s) sin entender` : ''}\n`)
  if (findings.length === 0) {
    console.log('Sin contradicciones.')
    return
  }
  const order = { alta: 0, baja: 1 }
  for (const f of [...findings].sort((a, b) => order[a.severity] - order[b.severity])) {
    console.log(`- [${f.severity}] ${f.turn} ${f.kind}: «${f.quote}»`)
    console.log(`  contra: ${f.against}`)
    console.log(`  ${f.why}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
