import { applyEvent, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, EVENT_SCHEMA_VERSION, eventIdFor, type LoadedPack } from '@rpg-ngn/content'
import type { ResolveLine, ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import { createProvider, type DMProvider } from '@rpg-ngn/narrative'
import { resolveRuleset, type Ruleset } from '@rpg-ngn/rules'
import { projectionsOf, rebuildState } from './state.js'

export interface ResolveDeps {
  loadPack(ref: ResolveTurnRequest['pack']): Promise<LoadedPack>
  now(): Date
  provider?: DMProvider
}

/**
 * Resuelve un turno y va emitiendo lineas NDJSON. El proveedor propone
 * bloques y eventos; aqui cada evento recibe id, seq y recordedAt, pasa por
 * el schema y por el ruleset, y solo entonces cuenta. Si algo falla se
 * emite `error` y la plataforma reabre el turno sin haber escrito nada.
 */
export async function* resolveTurn(request: ResolveTurnRequest, deps: ResolveDeps): AsyncGenerator<ResolveLine> {
  let pack: LoadedPack
  let ruleset: Ruleset
  let state: CampaignState

  try {
    pack = await deps.loadPack(request.pack)
    ruleset = resolveRuleset(request.ruleset)
    state = rebuildState(pack, ruleset, request.snapshot, request.events)
  } catch (error) {
    yield { kind: 'error', message: (error as Error).message }
    return
  }

  const session = state.meta.sessions[request.turn.sessionId]
  if (!session || session.status !== 'open') {
    yield { kind: 'error', message: `la sesion ${request.turn.sessionId} no esta abierta en la campaña` }
    return
  }

  const provider = deps.provider ?? createProvider(request.provider)
  const events: CampaignEvent[] = []
  let addressed: string[] = session.party

  try {
    for await (const output of provider.narrate({ pack, state, session: pack.sessions.get(request.turn.sessionId), turn: request.turn })) {
      if (output.kind === 'block') {
        yield { kind: 'block', block: output.block }
        continue
      }

      if (output.kind === 'addressed') {
        addressed = output.characterIds
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
      state = applyEvent(state, parsed.data, ruleset)
      events.push(parsed.data)
    }
  } catch (error) {
    yield { kind: 'error', message: (error as Error).message }
    return
  }

  yield {
    kind: 'result',
    events,
    addressed,
    state,
    projections: projectionsOf(state),
    usage: { inputTokens: 0, outputTokens: 0 },
  }
}
