import { refId } from '@rpg-ngn/content'
import type { ScriptedScene } from '@rpg-ngn/engine-contract'
import { tFor } from '@rpg-ngn/i18n'
import type { GMOutput, GMProvider, GMTurnContext } from './provider.js'

/**
 * GM sin modelo: determinista, gratis, y suficiente para probar el circuito
 * completo de un turno (respuestas, cierre, bloques, eventos, proyecciones,
 * polling) desde dos telefonos. Toma nota de lo que cada personaje declaro
 * y devuelve la palabra a toda la party presente.
 *
 * Con un guion (`ScriptedScene`, viene en `settings.provider` de la mesa)
 * narra escenas cortas: presenta la escena si el turno 1 se cierra vacio y,
 * en los turnos que el guion cubre, mete las lineas de NPC y la narracion
 * fija en lugar de la generica. El guion es contenido; aqui no hay lore.
 */
export class ScriptedGMProvider implements GMProvider {
  readonly kind = 'scripted'

  constructor(private readonly script?: ScriptedScene) {}

  async *narrate(context: GMTurnContext): AsyncIterable<GMOutput> {
    const { turn, pack, state } = context
    const tr = tFor(context.language ?? 'es')
    const party = state.meta.sessions[turn.sessionId]?.party ?? []
    const addressed = party.map((id) => refId(`character:${id}`))
    const scripted = this.script?.turns?.find((t) => t.turn === turn.number)

    if (turn.responses.length === 0) {
      if (turn.number === 1 && this.script?.opening) {
        yield* narrate(this.script.opening)
        yield { kind: 'addressed', characterIds: addressed }
        return
      }
      yield { kind: 'block', block: { type: 'system', text: tr('gm.noDeclarations'), audience: 'table', tone: 'action' } }
      yield { kind: 'addressed', characterIds: party }
      return
    }

    if (!scripted) yield { kind: 'block', block: { type: 'system', text: tr('gm.listening', { n: turn.number }) } }

    for (const response of turn.responses) {
      const name = pack.characters.get(response.characterId)?.name ?? response.characterId
      yield {
        kind: 'block',
        block: { type: 'dialogue', speaker: name, speakerRef: `character:${response.characterId}`, text: response.text },
      }
      yield {
        kind: 'event',
        event: {
          type: 'player_action',
          actor: `character:${response.characterId}`,
          declared: response.text,
          visibility: { layer: 'campaign', witnesses: party.map((id) => `character:${id}`) },
        },
      }
    }

    if (scripted) {
      for (const line of scripted.lines ?? []) {
        yield { kind: 'block', block: { type: 'dialogue', speaker: line.speaker, speakerRef: line.speakerRef ?? null, text: line.text } }
      }
      yield* narrate(scripted.narration)
    } else {
      const names = turn.responses.map((r) => pack.characters.get(r.characterId)?.name ?? r.characterId)
      yield* narrate(tr(names.length === 1 ? 'gm.notedOne' : 'gm.notedMany', { names: listNames(names, tr('gm.and')) }))
    }
    yield { kind: 'addressed', characterIds: addressed }
  }

  async probe() {
    return { ok: true, model: null, message: this.script ? 'GM scripted con guion, sin modelo' : 'GM scripted, sin modelo' }
  }
}

/** Una narracion es un bloque para la mesa y un evento `narration` para el log. */
async function* narrate(text: string): AsyncIterable<GMOutput> {
  yield { kind: 'block', block: { type: 'narration', text } }
  yield { kind: 'event', event: { type: 'narration', payload: { text } } }
}

function listNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`
}
