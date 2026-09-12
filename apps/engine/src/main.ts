import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { LintMode } from '@rpg-ngn/engine-contract'
import { createEngine } from './app.js'
import { PackStore } from './packs.js'

const token = process.env['ENGINE_TOKEN'] ?? ''
if (token === '') {
  console.error('ENGINE_TOKEN es obligatorio: el engine no acepta peticiones sin token compartido')
  process.exit(1)
}

const packsDir = resolve(process.env['PACKS_DIR'] ?? resolve(import.meta.dirname, '../../../content/packs'))
const port = Number(process.env['PORT'] ?? 3100)
const hostname = process.env['HOST'] ?? '127.0.0.1'
/** Tiempo maximo de una llamada al modelo. Un 14B local tarda de 60 a 120 s por turno; la nube, de 10 a 40 s. */
const providerTimeoutMs = Number(process.env['PROVIDER_TIMEOUT_MS'] ?? 180_000)
/** Lint de conocimiento: enforce (corta), report (solo anota) u off. La peticion puede fijar otro por turno. */
const lintMode = LintMode.safeParse(process.env['DM_LINT'] ?? 'enforce')
if (!lintMode.success) {
  console.error(`DM_LINT debe ser enforce, report u off (llego ${process.env['DM_LINT']})`)
  process.exit(1)
}

const app = createEngine({ token, packs: new PackStore(packsDir), providers: { timeoutMs: providerTimeoutMs }, lintMode: lintMode.data })

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`engine escuchando en http://${info.address}:${info.port} (packs en ${packsDir}, timeout del proveedor ${providerTimeoutMs} ms, lint ${lintMode.data})`)
})
