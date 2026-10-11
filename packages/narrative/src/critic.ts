import type { LoadedPack } from '@rpg-ngn/content'
import { z } from 'zod'
import type { ModelPrompt, ModelReply, ModelTransport } from './model-gm.js'

/**
 * Lector critico (docs/27, abierto): una llamada que lee una sesion entera
 * contra lo que el mundo declara (canon, desenlace, NPCs de la sesion, fichas)
 * y lista contradicciones. El canon es instruccion para el GM y el motor no lo
 * hace cumplir; esto es lo que lo vigila sin leer cada partida a mano.
 *
 * No juega ni corrige: solo señala, con la cita y la regla que rompe. Se usa
 * desde `apps/engine/scripts/critic.mts` sobre la salida de `tables:review`.
 */

export const CRITIQUE_KINDS = ['canon', 'continuidad', 'personaje', 'ausente', 'mundo'] as const

export const CritiqueFinding = z.object({
  /** "002/4": sesion y turno, como los escribe tables:review. */
  turn: z.string().min(1),
  kind: z.enum(CRITIQUE_KINDS),
  severity: z.enum(['alta', 'baja']),
  /** Lo que dice la partida, citado tal cual. */
  quote: z.string().min(1),
  /** Lo que contradice: un hecho del canon, de una ficha o de un turno anterior. */
  against: z.string().min(1),
  why: z.string().min(1),
})
export type CritiqueFinding = z.infer<typeof CritiqueFinding>

export interface CritiqueInput {
  pack: LoadedPack
  /** El texto de la mesa, tal como lo escribe `tables:review`. */
  transcript: string
  /** Solo estas sesiones del mundo como referencia; por omision, todas. */
  sessions?: readonly string[]
}

const SYSTEM = `Eres el lector crítico de una partida de rol narrada por un GM de IA. No juegas ni reescribes: buscas contradicciones.

Recibes la referencia del mundo (lo que el autor fijó) y la transcripción de la partida. La transcripción marca cada turno con "=== Sesión NNN, turno N". Líneas: [GM] narración, [NPC] diálogo de un personaje no jugador, [JUGADOR] lo que escribió un jugador, [SUSURRO] mensaje privado, [MESA] aviso del motor, [LOGRO] logro, y en llaves los eventos que el motor registró.

Señala solo lo que el GM contó y choca con algo fijado:
- canon: contradice un hecho del canon o el desenlace fijo de la sesión.
- continuidad: contradice algo que la propia partida ya estableció, en el mismo turno o en uno anterior: quién llama y quién contesta, qué ropa trae alguien, dónde está cada quien, la hora, quién sabe qué, un objeto que ya no existe. También un evento entre llaves (un "move" a un lugar) que no corresponde a lo narrado.
- personaje: cambia a un personaje o NPC respecto de su ficha (género, edad, oficio, relación) o de lo que es en esta sesión. También un NPC improvisado que cambia entre turnos o dentro del mismo turno ("el explorador" que luego dice "sola").
- ausente: trae a escena o hace hablar a un NPC que la sesión declara ausente.
- mundo: contradice un lugar, la época o una regla declarada del mundo.

No señales estilo, largo, ritmo ni decisiones de los jugadores. Lo que escribió un [JUGADOR] no es error del GM. Un detalle que el GM inventa (un vecino con nombre, una ventana, una hora aproximada) y no choca con nada NO se señala, ni como "baja". Cada hallazgo necesita en "against" el hecho concreto que contradice, citado de la referencia o de la partida; si no puedes citarlo, no es hallazgo. Lee la partida de corrido, frase por frase, comparando cada una con lo que ya se dijo: los deslices suelen estar a dos frases de distancia.

Responde solo con líneas JSON, una por hallazgo, sin texto alrededor:
{"turn":"002/4","kind":"continuidad","severity":"alta","quote":"cita textual corta de la partida","against":"lo que contradice, citado o resumido","why":"una frase"}
"alta" si un jugador lo notaría o le cambia la historia; "baja" si es un detalle. Si no hay nada, responde exactamente: {"none":true}`

/** El pedido al modelo: referencia del mundo en el bloque fijo (se cachea si se relee la misma mesa) y la partida despues. */
export function critiquePrompt(input: CritiqueInput, maxOutputTokens = 4000): ModelPrompt {
  const fixed = worldReference(input.pack, input.sessions)
  return { system: SYSTEM, fixed, user: `${fixed}\n\n# La partida\n\n${input.transcript.trim()}\n`, maxOutputTokens }
}

function worldReference(pack: LoadedPack, only?: readonly string[]): string {
  const lines: string[] = [`# Referencia del mundo: ${pack.manifest.name}`, '']
  if (pack.characters.size) {
    lines.push('## Personajes jugables')
    for (const c of pack.characters.values()) lines.push(`- ${c.name}: ${c.race}, ${c.class}, ${c.age}. ${c.bio}`)
    lines.push('')
  }
  if (pack.npcs.size) {
    lines.push('## NPCs')
    for (const npc of pack.npcs.values()) lines.push(`- ${npc.name}: ${npc.description}`)
    lines.push('')
  }
  if (pack.locations.size) {
    lines.push('## Lugares')
    for (const l of pack.locations.values()) lines.push(`- ${l.name}: ${l.newcomerView}`)
    lines.push('')
  }
  for (const session of pack.sessions.values()) {
    if (only && !only.includes(session.id)) continue
    lines.push(`## Sesión ${session.id}: ${session.title}`)
    const arc = session.arc
    if (arc?.canon?.length) lines.push('Canon (no se puede contradecir):', ...arc.canon.map((c) => `- ${c}`))
    if (arc?.fixedOutcome) lines.push(`Desenlace fijo: ${arc.fixedOutcome}`)
    for (const [id, sheet] of Object.entries(arc?.sheets ?? {})) {
      const name = pack.characters.get(id)?.name ?? id
      lines.push(`En esta sesión ${name} es: ${[sheet.class, sheet.age, sheet.bio].filter(Boolean).join(', ')}`)
    }
    if (session.npcs) {
      const present = Object.entries(session.npcs).map(([id, now]) => `${pack.npcs.get(id)?.name ?? id}${now ? ` (${now})` : ''}`)
      const absent = [...pack.npcs.values()].filter((npc) => !(npc.id in session.npcs!)).map((npc) => npc.name)
      lines.push(`NPCs presentes: ${present.join('; ') || 'ninguno'}.`)
      if (absent.length) lines.push(`NPCs ausentes (no deben aparecer): ${absent.join(', ')}.`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/** Lee la respuesta: una linea JSON por hallazgo; lo que no sea un hallazgo valido se cuenta y se descarta. */
export function parseCritique(text: string): { findings: CritiqueFinding[]; unparsed: number } {
  const findings: CritiqueFinding[] = []
  let unparsed = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^```(json)?$/, '')
    if (line === '') continue
    let value: unknown
    try {
      value = JSON.parse(line)
    } catch {
      unparsed++
      continue
    }
    if (typeof value === 'object' && value !== null && 'none' in value) continue
    const parsed = CritiqueFinding.safeParse(value)
    if (parsed.success) findings.push(parsed.data)
    else unparsed++
  }
  return { findings, unparsed }
}

/** Corre el lector sobre una partida con el transporte dado. */
export async function critique(transport: ModelTransport, input: CritiqueInput): Promise<{ findings: CritiqueFinding[]; unparsed: number; reply: ModelReply }> {
  const stream = transport.stream(critiquePrompt(input))
  let text = ''
  let step = await stream.next()
  while (!step.done) {
    text += step.value
    step = await stream.next()
  }
  return { ...parseCritique(text), reply: step.value }
}
