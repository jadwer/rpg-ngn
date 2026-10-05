import { applyEvent, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, EVENT_SCHEMA_VERSION, eventIdFor, type LoadedPack } from '@rpg-ngn/content'
import type { LintFinding, LintMode, ResolveLine, ResolveTurnRequest, RollRequest, SuggestRequest, SuggestResponse, TurnDiagnostics } from '@rpg-ngn/engine-contract'
import { tFor } from '@rpg-ngn/i18n'
import { createProvider, GMProviderError, redact, storyClock, type GMProvider, type GMTurnContext, type ProviderDeps } from '@rpg-ngn/narrative'
import { resolveRuleset, type Ruleset } from '@rpg-ngn/rules'
import { illustrationFor } from './illustrate.js'
import { projectionsOf, rebuildState } from './state.js'

export interface ResolveDeps {
  /** El pack en el idioma de la mesa (i18n), si lo trae traducido. */
  loadPack(ref: ResolveTurnRequest['pack'], language?: string): Promise<LoadedPack>
  now(): Date
  provider?: GMProvider
  providers?: ProviderDeps
  /** Modo del lint de conocimiento cuando la peticion no lo fija (GM_LINT del engine). */
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
  // Con la salida que el modelo alcanzo a escribir, si el fallo fue suyo: el intento que mas hace falta leer es el que no salio.
  const fail = (error: unknown): ResolveLine => ({ kind: 'error', message: redact(error instanceof Error ? error.message : String(error), credential), ...(error instanceof GMProviderError && error.raw ? { raw: error.raw } : {}) })

  let pack: LoadedPack
  let ruleset: Ruleset
  let state: CampaignState
  let recentEvents: CampaignEvent[]

  try {
    pack = await deps.loadPack(request.pack, request.language)
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

  let provider: GMProvider
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
  // Para ver al final si la party cambio de lugar, y lo que el GM pidio ilustrar.
  const initial = state
  const opening = request.turn.number === 1 && request.turn.responses.length === 0
  let moment: string | null = null
  let suggestions: Record<string, string[]> = {}
  let rollRequests: RollRequest[] = []
  // El director cerro la sesion en el turno de cierre del reloj (docs/26, H1).
  let closed: { cliffhanger?: string; endingId?: string } | null = null
  // Lo tecnico del turno: la salida del modelo y lo que el motor no pudo usar (docs/27, D).
  let diagnostics: TurnDiagnostics | null = null
  const dropped: string[] = []
  const ideasUsage = { calls: 0, inputTokens: 0, outputTokens: 0 }
  const arc = pack.sessions.get(request.turn.sessionId)?.arc
  const clock = storyClock(request.turn.number, request.context?.pacing, arc)

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
    // Apertura de sesion (turno 1 sin declaraciones): antes de que el GM
    // presente la escena, la mesa recibe lo que el pack ya sabia y nadie le
    // enseñaba: de que va la sesion y como se juega. Es lo que en el piloto
    // hacia el GM humano antes de que nadie tirara un dado.
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

      // Cada jugador recibe en privado por que esta aqui (docs/26, H7): su
      // meta y lo que solo el sabe. No depende de que el modelo lo susurre.
      const tr = tFor(request.language ?? 'es')
      for (const id of session.party) {
        const character = pack.characters.get(id)
        if (!character) continue
        const knows = character.private?.knows ?? []
        // La meta de ESTA sesion si el autor la escribio (docs/27, H): a los 33
        // años el susurro seguia diciendo "estudiar Medicina en la UNAM".
        const goal = packSession.arc?.goal ?? character.goal
        const text = [tr('gm.yourGoal', { name: character.name, goal }), ...(knows.length ? [tr('gm.youKnow', { knows: knows.join(' ') })] : [])].join(' ')
        yield { kind: 'block', block: { type: 'narration', text, to: [id] } }
        const parsed = seal({ type: 'narration', payload: { text }, visibility: { layer: 'player', witnesses: [`character:${id}`] } })
        if (parsed.success) {
          state = applyEvent(state, parsed.data, ruleset, secrets)
          events.push(parsed.data)
        }
      }

      // Y se coloca a la party donde el pack dice que arranca la sesion. Sin
      // esto nadie tiene ubicacion hasta que el GM mueva a alguien, y el mapa
      // de la mesa sale vacio de gente durante toda la primera escena.
      // El "Anteriormente..." del autor (docs/27, H): si el mundo lo trae, sale
      // este y el director no escribe el suyo. Solo si la campaña ya jugo otra sesion.
      const previously = packSession.arc?.previously
      if (previously && Object.values(state.meta.sessions).some((s) => s.id !== request.turn.sessionId && s.status === 'closed')) {
        yield { kind: 'block', block: { type: 'system', title: tr('gm.previously'), text: previously, audience: 'table', tone: 'info', recap: true } }
      }

      // Se coloca a toda la party donde la sesion dice que arranca. Antes solo
      // a quien no tenia lugar: tras un salto de tiempo el personaje abria
      // donde termino la sesion anterior (capitulo 2 del medico: en ESIME).
      const start = packSession.startLocation
      const sinUbicar = start ? session.party.filter((id) => state.world.characters[id]?.location !== start) : []
      if (start && sinUbicar.length > 0) {
        const parsed = seal({
          type: 'world_event',
          location: start,
          payload: { note: tFor(request.language ?? 'es')('gm.sessionStarts', { place: pack.locations.get(start)?.name ?? start }) },
          effects: sinUbicar.map((id) => ({ op: 'move', who: `character:${id}`, to: start })),
        })
        if (parsed.success) {
          state = applyEvent(state, parsed.data, ruleset, secrets)
          events.push(parsed.data)
        }
      }
    }

    const context: GMTurnContext = {
      pack,
      state,
      session: packSession,
      turn: request.turn,
      notes: request.context,
      recentEvents,
      maxOutputTokens: request.budget?.maxOutputTokens,
      lint: request.lint ?? deps.lintMode,
      dice: request.dice,
      language: request.language,
      // El prompt y los eventos aceptados dependen del ruleset de la mesa.
      rulesetId: ruleset.id,
    }
    const outputs = provider.narrate(context)
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

      if (output.kind === 'diagnostics') {
        diagnostics = output.diagnostics
        continue
      }

      if (output.kind === 'close') {
        closed = { ...(output.cliffhanger ? { cliffhanger: output.cliffhanger } : {}), ...(output.endingId ? { endingId: output.endingId } : {}) }
        continue
      }

      const parsed = seal(output.event)
      if (!parsed.success) {
        throw new Error(`el GM propuso un evento invalido (${output.event.type}): ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
      }
      // Un evento del GM que el ruleset no sabe aplicar se descarta y se
      // apunta; el turno ya narrado no se repite por un efecto. Antes lanzaba y
      // la mesa pagaba dos veces la espera y el modelo (mesa 42, 04-10).
      try {
        state = applyEvent(state, parsed.data, ruleset, secrets)
      } catch (error) {
        dropped.push(`${output.event.type}: ${redact(error instanceof Error ? error.message : String(error), credential).slice(0, 300)}`)
        continue
      }
      events.push(parsed.data)
    }

    // Ideas de accion (docs/27, bloque I): se piden aqui, con los eventos del
    // turno ya aplicados, para que salgan del mundo como quedo (el lugar al
    // que se movieron, lo que acaban de averiguar) y solo de lo que cada
    // jugador sabe. Una por personaje con la palabra, en paralelo y con tope
    // de tiempo: la mesa ya esta leyendo lo narrado y unas ideas que no
    // llegan no pueden retener ni tumbar el turno.
    if (provider.separateIdeas && provider.suggest && !closed) {
      const suggest = provider.suggest.bind(provider)
      const after: GMTurnContext = { ...context, state, recentEvents: [...recentEvents, ...events] }
      const asked = await Promise.all(
        addressed.map(async (id) => {
          try {
            return { id, idea: await withTimeout(suggest(after, id, [], { pendingRoll: rollRequests.find((r) => r.characterId === id) }), IDEAS_TIMEOUT_MS) }
          } catch (error) {
            dropped.push(`sin ideas para ${id}: ${redact(error instanceof Error ? error.message : String(error), credential).slice(0, 200)}`)
            return { id, idea: null }
          }
        }),
      )
      suggestions = {}
      for (const { id, idea } of asked) {
        if (!idea) continue
        suggestions[id] = idea.options.slice(0, 2)
        ideasUsage.calls += 1
        ideasUsage.inputTokens += idea.usage.inputTokens
        ideasUsage.outputTokens += idea.usage.outputTokens
      }
    }
  } catch (error) {
    yield fail(error)
    return
  }

  // El reloj marca dos momentos que siempre se ilustran: entrar al climax y el cierre.
  const beat = clock?.phase === 'cierre' ? 'ending' : clock?.phase === 'climax' && clock.phaseStart ? 'climax' : null
  // La imagen del cierre: sin escena del director, la que el autor escribio
  // para ese final, o la primera frase de su tarjeta. Antes caia al lugar
  // donde estaba el personaje: el final feliz salio como "La casa de mama".
  const closing = closed ? closeOf(pack, request.turn.sessionId, closed) : null
  // La del autor manda sobre la del director: es la imagen con la que quiso cerrar.
  if (closing) moment = closingScene(pack, request.turn.sessionId, closed?.endingId) ?? moment ?? closing.card?.text?.split(/(?<=[.!?])\s/)[0] ?? null
  const illustration = illustrationFor({ pack, before: initial, after: state, party: session.party, opening, moment, beat })

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
    // Fin de la sesion: la API no abre otro turno y escribe el bloque `ending`.
    ...(closing ? { close: closing } : {}),
    ...(diagnostics ? { diagnostics: { ...diagnostics, dropped: [...diagnostics.dropped, ...dropped], ...(ideasUsage.calls > 0 ? { ideasUsage } : {}) } } : {}),
    ...(clock ? { clock: { total: clock.total } } : {}),
    ...(arc?.objective ? { objective: arc.objective } : {}),
  }
}

/** Cuanto se espera a las ideas de un personaje antes de abrir el turno sin ellas. */
const IDEAS_TIMEOUT_MS = 15_000

/** Rechaza si la promesa no termina a tiempo; la llamada sigue por su cuenta y su resultado se ignora. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sin respuesta en ${ms} ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/** La imagen que el autor escribio para el final elegido o para la tarjeta de la sesion. */
function closingScene(pack: LoadedPack, sessionId: string, endingId: string | undefined): string | null {
  const arc = pack.sessions.get(sessionId)?.arc
  const ending = endingId ? arc?.endings?.find((e) => e.id === endingId) : undefined
  return ending?.scene ?? arc?.endCard?.scene ?? null
}

/**
 * El cierre que ve la mesa (docs/26, H4). Alcance: `story` si el final es
 * `final`, o si es la ultima sesion del mundo y el mundo trae `finale`;
 * `chapter` si la sesion es un capitulo; si no, `session`. La tarjeta sale
 * del mundo (final elegido, tarjeta de la sesion o `finale`), nunca del modelo.
 */
function closeOf(pack: LoadedPack, sessionId: string, closed: { cliffhanger?: string; endingId?: string }) {
  const arc = pack.sessions.get(sessionId)?.arc
  const ending = closed.endingId ? arc?.endings?.find((e) => e.id === closed.endingId) : undefined
  const last = [...pack.sessions.keys()].sort().at(-1) === sessionId
  const finale = pack.manifest.finale
  const scope = ending?.final || (last && !ending?.next && finale) ? 'story' : arc?.chapter ? 'chapter' : 'session'
  const title = ending?.title ?? arc?.endCard?.title ?? (scope === 'story' ? finale?.title : undefined)
  const text = ending?.text ?? arc?.endCard?.text ?? (scope === 'story' ? finale?.text : undefined)
  // Una historia que termina no deja nada pendiente.
  const cliffhanger = scope === 'story' ? undefined : closed.cliffhanger
  return {
    scope: scope as 'session' | 'chapter' | 'story',
    ...(cliffhanger ? { cliffhanger } : {}),
    ...(ending ? { endingId: ending.id } : {}),
    ...(title || text ? { card: { ...(title ? { title } : {}), ...(text ? { text } : {}) } } : {}),
    ...(ending?.next ? { next: ending.next } : {}),
  }
}

/**
 * "Otras" ideas (E10b): dos sugerencias nuevas para un personaje con el
 * contexto del turno abierto, en una llamada aparte que no narra ni escribe
 * nada. Lanza si el proveedor no sabe (GM con guion) o si el modelo falla;
 * la plataforma decide quien puede pedirlas y cuantas veces.
 */
export async function suggestMore(request: SuggestRequest, deps: ResolveDeps): Promise<SuggestResponse> {
  const credential = request.provider.kind === 'scripted' ? undefined : request.provider.credential
  try {
    const pack = await deps.loadPack(request.pack, request.language)
    const ruleset = resolveRuleset(request.ruleset)
    const { state, events: recentEvents } = rebuildState(pack, ruleset, request.snapshot, request.events)
    const session = state.meta.sessions[request.turn.sessionId]
    if (!session || session.status !== 'open') throw new Error(`la sesion ${request.turn.sessionId} no esta abierta en la campaña`)
    const provider = deps.provider ?? createProvider(request.provider, deps.providers ?? {})
    if (!provider.suggest) throw new Error('el GM de esta mesa no da ideas: no tiene modelo')
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
        language: request.language,
        rulesetId: ruleset.id,
      },
      request.characterId,
      request.exclude,
    )
  } catch (error) {
    throw new Error(redact(error instanceof Error ? error.message : String(error), credential))
  }
}
