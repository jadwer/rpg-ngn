import { ENGINE_CONTRACT_VERSION, ENGINE_HEADERS, ProjectRequest, ProviderConfig, ResolveTurnRequest, ValidateEventsRequest, type LintMode, type ProbeResponse } from '@rpg-ngn/engine-contract'
import { createProvider, redact, type ProviderDeps } from '@rpg-ngn/narrative'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import type { PackStore } from './packs.js'
import { project, validateEvents } from './project.js'
import { resolveTurn } from './resolve.js'

export interface EngineOptions {
  token: string
  packs: PackStore
  now?: () => Date
  /** Clientes de modelo inyectados (tests) y timeout hacia el proveedor. */
  providers?: ProviderDeps
  /** Lint de conocimiento por defecto (`enforce`); la peticion puede fijar otro. */
  lintMode?: LintMode | undefined
}

/**
 * HTTP privado para la plataforma: token compartido en cabecera, contrato
 * versionado, sin CORS porque nunca lo llama un navegador. El engine no
 * tiene credenciales de base de datos: todo lo que sabe llega en la peticion.
 */
export function createEngine(options: EngineOptions): Hono {
  const app = new Hono()
  const now = options.now ?? (() => new Date())
  const providers = options.providers ?? {}

  app.get('/health', (c) => c.json({ ok: true, contract: ENGINE_CONTRACT_VERSION }))

  app.use('/v1/*', async (c, next) => {
    if (options.token === '' || c.req.header(ENGINE_HEADERS.token) !== options.token) {
      return c.json({ error: 'token invalido' }, 401)
    }
    const contract = c.req.header(ENGINE_HEADERS.contract)
    if (contract !== String(ENGINE_CONTRACT_VERSION)) {
      return c.json({ error: `contrato ${contract ?? 'ausente'} no soportado; este engine habla ${ENGINE_CONTRACT_VERSION}` }, 400)
    }
    await next()
  })

  /** Los packs que este servidor puede jugar, para que la mesa se cree con uno de verdad. */
  app.get('/v1/packs', async (c) => c.json({ packs: await options.packs.catalog() }))

  /** Personajes jugables de un pack, para elegir al crear mesa o invitar. */
  app.get('/v1/packs/:id/:version/characters', async (c) => {
    try {
      return c.json({ characters: await options.packs.characters({ id: c.req.param('id'), version: c.req.param('version') }) })
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 404)
    }
  })

  /**
   * Un retrato del pack. La web lleva los del piloto empaquetados, pero los
   * de un pack instalado en el servidor solo los tiene el engine.
   */
  app.get('/v1/packs/:id/portraits/:file', async (c) => {
    const file = c.req.param('file')
    // Solo un nombre de archivo: nada de subir por el arbol.
    if (!/^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/i.test(file)) {
      return c.json({ error: 'nombre de retrato invalido' }, 400)
    }
    const bytes = await options.packs.portrait(c.req.param('id'), file)
    if (!bytes) return c.json({ error: 'retrato no encontrado' }, 404)
    const type = file.toLowerCase().endsWith('.png') ? 'image/png' : file.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    c.header('Content-Type', type)
    c.header('Cache-Control', 'public, max-age=86400')
    return c.body(bytes as unknown as ArrayBuffer)
  })

  app.post('/v1/turns/resolve', async (c) => {
    const parsed = ResolveTurnRequest.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'peticion invalida', issues: parsed.error.issues }, 422)
    }

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8')
    return stream(c, async (out) => {
      for await (const line of resolveTurn(parsed.data, { loadPack: (ref) => options.packs.get(ref), now, providers, lintMode: options.lintMode })) {
        if (line.kind === 'result' && line.lint?.length) {
          // El motivo de cada corte queda en el log del engine; la mesa solo ve el aviso system.
          for (const finding of line.lint) console.warn(`lint ${finding.level} turno ${parsed.data.turn.id}: ${finding.message}`)
        }
        await out.write(JSON.stringify(line) + '\n')
      }
    })
  })

  app.post('/v1/validate/events', async (c) => {
    const parsed = ValidateEventsRequest.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'peticion invalida', issues: parsed.error.issues }, 422)
    }
    try {
      const pack = parsed.data.pack ? await options.packs.get(parsed.data.pack) : undefined
      return c.json(validateEvents(parsed.data, pack))
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400)
    }
  })

  app.post('/v1/project', async (c) => {
    const parsed = ProjectRequest.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'peticion invalida', issues: parsed.error.issues }, 422)
    }
    try {
      const pack = await options.packs.get(parsed.data.pack)
      return c.json(project(parsed.data, pack))
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400)
    }
  })

  /**
   * GET /v1/providers/probe?kind=anthropic|openai|scripted&model=...&baseUrl=...
   * La credencial viaja en la cabecera x-provider-credential y no vuelve
   * en ninguna respuesta, ni en la de error.
   */
  app.get('/v1/providers/probe', async (c) => {
    const kind = c.req.query('kind') ?? 'scripted'
    const credential = c.req.header('x-provider-credential') ?? ''
    const raw =
      kind === 'scripted'
        ? { kind }
        : { kind, model: c.req.query('model') ?? '', credential, ...(c.req.query('baseUrl') ? { baseUrl: c.req.query('baseUrl') } : {}) }
    const config = ProviderConfig.safeParse(raw)
    if (!config.success) {
      const body: ProbeResponse = { ok: false, provider: kind, model: c.req.query('model') ?? null, message: `configuracion invalida: ${config.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}` }
      return c.json(body, 400)
    }
    try {
      const provider = createProvider(config.data, providers)
      const probe = await provider.probe()
      const body: ProbeResponse = { ok: probe.ok, provider: provider.kind, model: probe.model, message: probe.message }
      return c.json(body)
    } catch (error) {
      const body: ProbeResponse = { ok: false, provider: kind, model: null, message: redact((error as Error).message, credential) }
      return c.json(body, 400)
    }
  })

  return app
}
