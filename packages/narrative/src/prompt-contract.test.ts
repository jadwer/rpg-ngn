import { applyEvent, initialState, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, type LoadedPack } from '@rpg-ngn/content'
import { resolveRuleset, type Ruleset } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { ModelGMProvider, allowedEventFor, normalizeRecord } from './model-gm.js'
import { collect, diagnosticsOf, FakeTransport, pilotContext, response } from './pilot.test-helpers.js'
import { systemPromptFor } from './prompt.js'
import type { GMOutput, GMTurnContext } from './provider.js'

/**
 * Prueba de contrato entre el prompt y el motor (docs/27, M4). Todo ejemplo
 * que el prompt le enseña al GM tiene que valer de punta a punta: el
 * interprete lo acepta, el ruleset lo aplica sin romper y el estado cambia.
 *
 * Nacio de tres fallos que nadie veia porque cada pieza, sola, estaba bien:
 * - `relationship` se ofrecia desde el 20-09 y el interprete la tiraba
 *   siempre; cuando por fin la acepto (05-10), el reductor no hacia nada.
 * - `inventory_change` se ofrece en los tres sistemas sin combate y sus
 *   rulesets lanzaban "no conoce el effect gain": el turno entero fallaba.
 * - El texto que el jugador escribe junto al dado se le prometia al GM y el
 *   contexto no lo llevaba.
 * Si alguien añade un ejemplo al prompt que el motor no cumple, falla aqui.
 */

const RULESETS = ['fantasy-d20-lite', 'court-intrigue', 'masquerade', 'drama-lite'] as const
const KEY = 'sk-test-contract-000000000'
const SESSION = '003'
const PARTY = ['zahira', 'calder']

/** Cada objeto JSON con `kind` que aparece en el texto del prompt. */
function examplesIn(prompt: string): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = []
  let from = 0
  for (;;) {
    const start = prompt.indexOf('{"kind":"', from)
    if (start === -1) break
    // `"resolved":{"kind":"skill",...}` es un valor dentro de otro ejemplo, no un ejemplo.
    if (prompt[start - 1] === ':') {
      from = start + 1
      continue
    }
    let depth = 0
    let inString = false
    let escape = false
    let end = -1
    for (let i = start; i < prompt.length; i++) {
      const ch = prompt[i]!
      if (ch === '\n') break
      if (inString) {
        if (escape) escape = false
        else if (ch === '\\') escape = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') inString = true
      else if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    from = start + 1
    if (end === -1) continue
    try {
      found.push(JSON.parse(prompt.slice(start, end + 1)) as Record<string, unknown>)
    } catch {
      // `{"kind":"<tipo de evento>", ...}` es una plantilla, no un ejemplo.
    }
  }
  return found
}

/** Los ids de los ejemplos son de otros mundos: se cambian por los del fixture, conservando la forma. */
function localize(value: unknown): unknown {
  // `<id>` es el hueco de una plantilla ("secretId":"<id>"): se llena con un id cualquiera.
  if (typeof value === 'string') return value.replace(/^character:[a-z0-9-]+$/, 'character:zahira').replace(/^<[^>]+>$/, 'ejemplo')
  if (Array.isArray(value)) return value.map(localize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v)]))
  return value
}

interface Fixture {
  pack: LoadedPack
  state: CampaignState
  ruleset: Ruleset
}

/** El pack del piloto con las misiones y los secretos que nombran los ejemplos, y una sesion abierta con el ruleset pedido. */
async function fixtureFor(rulesetId: string, examples: Array<Record<string, unknown>>): Promise<Fixture> {
  const { pack: pilot } = await pilotContext()
  const ruleset = resolveRuleset(rulesetId)
  const quests = new Map(pilot.quests)
  const secrets = new Map(pilot.secrets)
  const template = [...pilot.secrets.values()][0]!
  const questTemplate = [...pilot.quests.values()][0]
  for (const example of examples) {
    const payload = (example['payload'] ?? {}) as Record<string, unknown>
    if (example['kind'] === 'quest_update' && typeof payload['quest'] === 'string') {
      const id = payload['quest'].replace(/^quest:/, '')
      const objective = typeof payload['objective'] === 'string' ? payload['objective'] : 'objetivo'
      const previous = quests.get(id)
      quests.set(id, { ...(questTemplate ?? { title: id, summary: id }), ...previous, id, objectives: [...(previous?.objectives ?? []), { id: objective, text: objective }] } as never)
    }
    if (example['kind'] === 'secret_revealed' && typeof payload['secretId'] === 'string') {
      const id = String(localize(payload['secretId']))
      if (!secrets.has(id)) secrets.set(id, { ...template, id, keywords: [`palabra-clave-de-${id}`] })
    }
  }
  const pack: LoadedPack = { ...pilot, quests, secrets }
  const started = CampaignEvent.parse({ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: SESSION, recordedAt: '2026-10-05T19:00:00Z', payload: { party: PARTY.map((id) => `character:${id}`) } })
  return { pack, ruleset, state: applyEvent(initialState({ pack, ruleset }), started, ruleset, [...secrets.values()]) }
}

const seal = (state: CampaignState, event: Record<string, unknown>) => {
  const seq = state.meta.headSeq + 1
  return CampaignEvent.parse({ ...event, id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, sessionId: SESSION, recordedAt: '2026-10-05T19:05:00Z' })
}

/** Lo que el ejemplo necesita ya puesto en el mundo para tener sentido: perder exige tener, quitar una condicion exige tenerla. */
function prepare(fixture: Fixture, example: Record<string, unknown>): CampaignState {
  let state = fixture.state
  const secrets = [...fixture.pack.secrets.values()]
  for (const effect of (example['effects'] ?? []) as Array<Record<string, unknown>>) {
    if (effect['op'] === 'lose') state = applyEvent(state, seal(state, { type: 'inventory_change', actor: 'character:zahira', effects: [{ op: 'gain', item: effect['item'], holder: effect['holder'] ?? 'character:zahira' }] }), fixture.ruleset, secrets)
    if (effect['op'] === 'condition' && typeof effect['remove'] === 'string') state = applyEvent(state, seal(state, { type: 'state_change', effects: [{ op: 'condition', who: effect['who'], add: effect['remove'] }] }), fixture.ruleset, secrets)
  }
  return state
}

async function narrate(fixture: Fixture, state: CampaignState, example: Record<string, unknown>, dice: 'engine' | 'dice' | 'table'): Promise<GMOutput[]> {
  const context: GMTurnContext = {
    pack: fixture.pack,
    state,
    session: fixture.pack.sessions.get(SESSION),
    turn: { id: 't-2', number: 2, sessionId: SESSION, responses: [response('zahira', 'Hago algo. Saqué 14.')] },
    recentEvents: [],
    rulesetId: fixture.ruleset.id,
    dice,
    lint: 'off',
  }
  const lines = [JSON.stringify(example), '{"kind":"narration","text":"Algo cambia en la sala."}'].join('\n')
  return collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(context))
}

const EVENT_KINDS = new Set(['roll', 'state_change', 'inventory_change', 'world_event', 'scene_started', 'scene_closed', 'npc_action', 'discovery', 'rumor_heard', 'quest_update', 'secret_revealed'])

describe('contrato prompt-motor: lo que el prompt enseña, el motor lo cumple', () => {
  for (const rulesetId of RULESETS) {
    for (const compact of [false, true]) {
      it(`${rulesetId}${compact ? ' (compacto)' : ''}: cada evento de ejemplo se acepta, se aplica y cambia algo`, async () => {
        const prompt = systemPromptFor(rulesetId, compact, 'engine')
        const examples = examplesIn(prompt).filter((e) => EVENT_KINDS.has(String(e['kind'])))
        // Si esto baja a cero, el extractor se rompio y la prueba ya no prueba nada.
        expect(examples.length).toBeGreaterThanOrEqual(compact ? 8 : 14)
        const fixture = await fixtureFor(rulesetId, examples)
        const secrets = [...fixture.pack.secrets.values()]

        for (const raw of examples) {
          const example = localize(raw) as Record<string, unknown>
          const label = JSON.stringify(example)
          const record = normalizeRecord(example)
          expect(record?.kind, `no se entiende como evento: ${label}`).toBe('event')
          if (record?.kind !== 'event') continue
          expect(allowedEventFor(rulesetId).safeParse(record.raw).success, `el ruleset ${rulesetId} no admite: ${label}`).toBe(true)

          const before = prepare(fixture, example)
          const outputs = await narrate(fixture, before, example, 'engine')
          const proposed = outputs.flatMap((o) => (o.kind === 'event' && o.event['type'] !== 'player_action' && o.event['type'] !== 'narration' ? [o.event] : []))
          expect(diagnosticsOf(outputs).ignoredCount, `el interprete lo ignoro: ${label}`).toBe(0)
          expect(proposed.length, `no salio ningun evento de: ${label}`).toBeGreaterThan(0)

          let after = before
          for (const event of proposed) {
            expect(() => (after = applyEvent(after, seal(after, event), fixture.ruleset, secrets)), `el ruleset ${rulesetId} rompio al aplicar: ${label}`).not.toThrow()
          }
          // Un cambio de estado o de inventario tiene que dejar huella en el mundo; si no, es escritura a la nada.
          if (example['kind'] === 'state_change' || example['kind'] === 'inventory_change') {
            expect(JSON.stringify(after.world), `no cambio nada en el mundo: ${label}`).not.toBe(JSON.stringify(before.world))
          }
        }
      })
    }
  }

  it('las lineas de formato del prompt son las que el interprete entiende, en los tres modos de dados', () => {
    for (const dice of ['engine', 'dice', 'table'] as const) {
      for (const compact of [false, true]) {
        const prompt = systemPromptFor('fantasy-d20-lite', compact, dice)
        const examples = examplesIn(prompt).filter((e) => !EVENT_KINDS.has(String(e['kind'])))
        const kinds = new Set(examples.map((e) => String(e['kind'])))
        for (const needed of ['narration', 'dialogue', 'addressed', 'where', 'scene', 'suggest', 'whisper', 'milestone', 'close']) expect(kinds.has(needed), `${dice}${compact ? ' compacto' : ''}: falta el ejemplo de ${needed}`).toBe(true)
        expect(kinds.has('ask_roll'), `${dice}: ask_roll solo existe cuando tira el jugador`).toBe(dice !== 'engine')
        for (const example of examples) {
          const record = normalizeRecord(example)
          expect(record, `el interprete no entiende: ${JSON.stringify(example)}`).not.toBeNull()
          expect(record?.kind, JSON.stringify(example)).toBe(example['kind'] === 'narration' || example['kind'] === 'dialogue' ? 'block' : 'line')
        }
        // El formato viejo, con envoltura, ya no se enseña.
        expect(prompt).not.toContain('"kind":"block"')
        expect(prompt).not.toContain('"kind":"event"')
        expect(prompt).not.toContain('{"type":"')
      }
    }
  })

  it('con las ideas aparte, el prompt deja de pedir "suggest" y lo demas no cambia', () => {
    for (const compact of [false, true]) {
      const inline = systemPromptFor('court-intrigue', compact, 'dice', 'es', 'inline')
      const separate = systemPromptFor('court-intrigue', compact, 'dice', 'es', 'separate')
      expect(inline).toContain('"kind":"suggest"')
      expect(separate).not.toContain('"kind":"suggest"')
      expect(separate).toContain('"kind":"where"')
      expect(separate).toContain('"kind":"ask_roll"')
      expect(separate.length).toBeLessThan(inline.length)
    }
  })
})
