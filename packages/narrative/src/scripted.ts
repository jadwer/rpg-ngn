import { refId } from '@rpg-ngn/content'
import type { DMOutput, DMProvider, DMTurnContext } from './provider.js'

/**
 * DM sin modelo: determinista, gratis, y suficiente para probar el circuito
 * completo de un turno (respuestas, cierre, bloques, eventos, proyecciones,
 * polling) desde dos telefonos. Toma nota de lo que cada personaje declaro
 * y devuelve la palabra a toda la party presente.
 */
export class ScriptedDMProvider implements DMProvider {
  readonly kind = 'scripted'

  async *narrate(context: DMTurnContext): AsyncIterable<DMOutput> {
    const { turn, pack, state } = context
    const party = state.meta.sessions[turn.sessionId]?.party ?? []

    if (turn.responses.length === 0) {
      yield { kind: 'block', block: { type: 'system', text: 'El turno se cerro sin declaraciones. El DM espera.' } }
      yield { kind: 'addressed', characterIds: party }
      return
    }

    yield { kind: 'block', block: { type: 'system', text: `Turno ${turn.number}: el DM escucha a la mesa.` } }

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

    const names = turn.responses.map((r) => pack.characters.get(r.characterId)?.name ?? r.characterId)
    const text = `El DM toma nota de lo que ${listNames(names)} ${names.length === 1 ? 'declara' : 'declaran'}. La escena sigue abierta y la mesa tiene la palabra.`
    yield { kind: 'block', block: { type: 'narration', text } }
    yield { kind: 'event', event: { type: 'narration', payload: { text } } }
    yield { kind: 'addressed', characterIds: party.map((id) => refId(`character:${id}`)) }
  }

  async probe() {
    return { ok: true, model: null, message: 'DM scripted, sin modelo' }
  }
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'nadie'
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}
