import { ENGINE_CONTRACT_VERSION, ENGINE_HEADERS, ProjectRequest, ProviderConfig, ResolveTurnRequest, ValidateEventsRequest, type ProbeResponse } from '@rpg-ngn/engine-contract'
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

  app.post('/v1/turns/resolve', async (c) => {
    const parsed = ResolveTurnRequest.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'peticion invalida', issues: parsed.error.issues }, 422)
    }

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8')
    return stream(c, async (out) => {
      for await (const line of resolveTurn(parsed.data, { loadPack: (ref) => options.packs.get(ref), now, providers })) {
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
