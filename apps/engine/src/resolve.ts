import { applyEvent, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, EVENT_SCHEMA_VERSION, eventIdFor, type LoadedPack } from '@rpg-ngn/content'
import type { LintFinding, LintMode, ResolveLine, ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import { createProvider, redact, type DMProvider, type ProviderDeps } from '@rpg-ngn/narrative'
import { resolveRuleset, type Ruleset } from '@rpg-ngn/rules'
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

  try {
    const outputs = provider.narrate({
      pack,
      state,
      session: pack.sessions.get(request.turn.sessionId),
      turn: request.turn,
      notes: request.context,
      recentEvents,
      maxOutputTokens: request.budget?.maxOutputTokens,
      lint: request.lint ?? deps.lintMode,
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

      const seq = state.meta.headSeq + 1
      const candidate = {
        ...output.event,
        id: eventIdFor(seq),
        v: EVENT_SCHEMA_VERSION,
        seq,
        sessionId: request.turn.sessionId,
        recordedAt: deps.now().toISOString(),
      }
      const parsed = CampaignEvent.safeParse(candidate)
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

  yield {
    kind: 'result',
    events,
    addressed,
    state,
    projections: projectionsOf(state),
    usage,
    ...(lint.length ? { lint } : {}),
  }
}
