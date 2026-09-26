import { applyEvent, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, EVENT_SCHEMA_VERSION, eventIdFor, type LoadedPack } from '@rpg-ngn/content'
import type { LintFinding, LintMode, ResolveLine, ResolveTurnRequest, RollRequest, SuggestRequest, SuggestResponse } from '@rpg-ngn/engine-contract'
import { createProvider, redact, type DMProvider, type ProviderDeps } from '@rpg-ngn/narrative'
import { resolveRuleset, type Ruleset } from '@rpg-ngn/rules'
import { illustrationFor } from './illustrate.js'
import { projectionsOf, rebuildState } from './state.js'

export interface ResolveDeps {
  loadPack(ref: ResolveTurnRequest['pack']): Promise<LoadedPack>
  now(): Date
  provider?: DMProvider
  providers?: ProviderDeps
  /** Modo del lint de conocimiento cuando la peticion no lo fija (DM_LINT del engine). */
  lintMode?: LintMode | undefined
}

/**
 * Resuelve un turno y va emitiendo lineas NDJSON. El proveedor propone
 * bloques y eventos; aqui cada evento recibe id, seq y recordedAt, pasa por
 * el schema y por el ruleset, y solo entonces cuenta. Si algo falla se
 * emite `error` y la plataforma reabre el turno sin haber escrito nada.
 * Ningun mensaje de error sale con la credencial del proveedor dentro.
 */
export async function* resolveTurn(request: ResolveTurnRequest, deps: ResolveDeps): AsyncGenerator<ResolveLine> {
  const credential = request.provider.kind === 'scripted' ? undefined : request.provider.credential
  const fail = (error: unknown): ResolveLine => ({ kind: 'error', message: redact(error instanceof Error ? error.message : String(error), credential) })

  let pack: LoadedPack
  let ruleset: Ruleset
  let state: CampaignState
  let recentEvents: CampaignEvent[]

  try {
    pack = await deps.loadPack(request.pack)
    ruleset = resolveRuleset(request.ruleset)
    ;({ state, events: recentEvents } = rebuildState(pack, ruleset, request.snapshot, request.events))
  } catch (error) {
    yield fail(error)
    return
  }

  const session = state.meta.sessions[request.turn.sessionId]
  if (!session || session.status !== 'open') {
    yield { kind: 'error', message: `la sesion ${request.turn.sessionId} no esta abierta en la campaña` }
    return
  }

  let provider: DMProvider
  try {
    provider = deps.provider ?? createProvider(request.provider, deps.providers ?? {})
  } catch (error) {
    yield fail(error)
    return
  }

  const events: CampaignEvent[] = []
  const lint: LintFinding[] = []
  const secrets = [...pack.secrets.values()]
  let addressed: string[] = session.party
  let usage = { inputTokens: 0, outputTokens: 0 }
  // Para ver al final si la party cambio de lugar, y lo que el DM pidio ilustrar.
  const initial = state
  const opening = request.turn.number === 1 && request.turn.responses.length === 0
  let moment: string | null = null
  let suggestions: Record<string, string[]> = {}
  let rollRequests: RollRequest[] = []

  // Cierra un evento nacido en el engine con su id, version y momento. El
  // seq sale del estado ya aplicado, asi que hay que llamarlo en orden.
  const seal = (event: { type: string } & Record<string, unknown>) => {
    const seq = state.meta.headSeq + 1
    return CampaignEvent.safeParse({
      ...event,
      id: eventIdFor(seq),
      v: EVENT_SCHEMA_VERSION,
      seq,
      sessionId: request.turn.sessionId,
      recordedAt: deps.now().toISOString(),
    })
  }

  try {
    // Apertura de sesion (turno 1 sin declaraciones): antes de que el DM
    // presente la escena, la mesa recibe lo que el pack ya sabia y nadie le
    // enseñaba: de que va la sesion y como se juega. Es lo que en el piloto
    // hacia el DM humano antes de que nadie tirara un dado.
    const packSession = pack.sessions.get(request.turn.sessionId)
    if (request.turn.number === 1 && request.turn.responses.length === 0 && packSession) {
      yield {
        kind: 'block',
        block: {
          type: 'system',
          title: packSession.title,
          text: packSession.briefing,
          items: [...packSession.howToPlay],
          audience: 'table',
          tone: 'info',
        },
      }

      // Y se coloca a la party donde el pack dice que arranca la sesion. Sin
      // esto nadie tiene ubicacion hasta que el DM mueva a alguien, y el mapa
      // de la mesa sale vacio de gente durante toda la primera escena.
      const start = packSession.startLocation
      const sinUbicar = start ? session.party.filter((id) => !state.world.characters[id]?.location) : []
      if (start && sinUbicar.length > 0) {
        const parsed = seal({
          type: 'world_event',
          location: start,
          payload: { note: `La sesion arranca en ${pack.locations.get(start)?.name ?? start}.` },
          effects: sinUbicar.map((id) => ({ op: 'move', who: `character:${id}`, to: start })),
        })
        if (parsed.success) {
          state = applyEvent(state, parsed.data, ruleset, secrets)
          events.push(parsed.data)
        }
      }
    }

    const outputs = provider.narrate({
      pack,
      state,
      session: packSession,
      turn: request.turn,
      notes: request.context,
      recentEvents,
      maxOutputTokens: request.budget?.maxOutputTokens,
      lint: request.lint ?? deps.lintMode,
      dice: request.dice,
      // El prompt y los eventos aceptados dependen del ruleset de la mesa.
      rulesetId: ruleset.id,
    })
    for await (const output of outputs) {
      if (output.kind === 'block') {
        yield { kind: 'block', block: output.block }
        continue
      }

      if (output.kind === 'addressed') {
        addressed = output.characterIds
        continue
      }

      if (output.kind === 'usage') {
        usage = { inputTokens: output.inputTokens, outputTokens: output.outputTokens }
        continue
      }

      if (output.kind === 'lint') {
        lint.push(output.finding)
        continue
      }

      if (output.kind === 'illustrate') {
        moment = output.moment
        continue
      }

      if (output.kind === 'suggestions') {
        suggestions = output.byCharacter
        continue
      }

      if (output.kind === 'rollRequests') {
        rollRequests = output.requests
        continue
      }

      const parsed = seal(output.event)
      if (!parsed.success) {
        throw new Error(`el DM propuso un evento invalido (${output.event.type}): ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
      }
      state = applyEvent(state, parsed.data, ruleset, secrets)
      events.push(parsed.data)
    }
  } catch (error) {
    yield fail(error)
    return
  }

  const illustration = illustrationFor({ pack, before: initial, after: state, party: session.party, opening, moment })

  yield {
    kind: 'result',
    events,
    addressed,
    state,
    projections: projectionsOf(state),
    usage,
    ...(lint.length ? { lint } : {}),
    ...(illustration ? { illustrations: [illustration] } : {}),
    // Solo para quien tiene la palabra el turno que viene.
    ...(Object.keys(suggestions).length ? { suggestions: Object.fromEntries(Object.entries(suggestions).filter(([id]) => addressed.includes(id))) } : {}),
    // Tiradas pedidas: esos personajes tiran en vez de escribir el turno que viene.
    ...(rollRequests.length ? { rollRequests: rollRequests.filter((r) => addressed.includes(r.characterId)) } : {}),
  }
}

/**
 * "Otras" ideas (E10b): dos sugerencias nuevas para un personaje con el
 * contexto del turno abierto, en una llamada aparte que no narra ni escribe
 * nada. Lanza si el proveedor no sabe (DM con guion) o si el modelo falla;
 * la plataforma decide quien puede pedirlas y cuantas veces.
 */
export async function suggestMore(request: SuggestRequest, deps: ResolveDeps): Promise<SuggestResponse> {
  const credential = request.provider.kind === 'scripted' ? undefined : request.provider.credential
  try {
    const pack = await deps.loadPack(request.pack)
    const ruleset = resolveRuleset(request.ruleset)
    const { state, events: recentEvents } = rebuildState(pack, ruleset, request.snapshot, request.events)
    const session = state.meta.sessions[request.turn.sessionId]
    if (!session || session.status !== 'open') throw new Error(`la sesion ${request.turn.sessionId} no esta abierta en la campaña`)
    const provider = deps.provider ?? createProvider(request.provider, deps.providers ?? {})
    if (!provider.suggest) throw new Error('el director de esta mesa no da ideas: no tiene modelo')
    return await provider.suggest(
      {
        pack,
        state,
        session: pack.sessions.get(request.turn.sessionId),
        turn: request.turn,
        notes: request.context,
        recentEvents,
        lint: request.lint ?? deps.lintMode,
        dice: request.dice,
        rulesetId: ruleset.id,
      },
      request.characterId,
      request.exclude,
    )
  } catch (error) {
    throw new Error(redact(error instanceof Error ? error.message : String(error), credential))
  }
}
