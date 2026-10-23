/**
 * Comparacion de narradores baratos (23-10): la misma partida corta del
 * one-shot del medico (apertura y tres turnos con las mismas acciones)
 * narrada por cada modelo, para elegir el narrador del plan gratis con datos.
 *
 *   node --env-file=<archivo con ANTHROPIC_API_KEY y OPENROUTER_API_KEY> \
 *     --import tsx scripts/narrator-compare.mts
 *
 * `COMPARE_MODELS` filtra por etiqueta (separadas por coma). Un proveedor sin
 * clave se omite. Escribe `gm/ab/narradores-<fecha>.md` (gitignored) con el
 * texto y la tabla de medidas. Cuesta centavos por modelo.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadPack } from '@rpg-ngn/content'
import type { CampaignEvent, ProviderConfig, ResolveLine, TurnBlock } from '@rpg-ngn/engine-contract'
import { fsSource } from '../src/packs.js'
import { resolveTurn } from '../src/resolve.js'

const root = resolve(import.meta.dirname, '../../..')
const PACK = 'quiero-ser-medico'
const SESSION = '001'
const RULESET = 'drama-lite@1.0.0'
const HERO = 'emiliano'

/** Lo que hace el jugador en cada turno despues de la apertura: igual para todos. */
const ACTIONS = [
  'Contesto el teléfono. Le pregunto a mi mamá qué pasó exactamente y le recuerdo que mañana a las 8 es mi examen de la UNAM.',
  'Le digo a mi mamá que no voy a ir: mi papá se lo buscó por manejar borracho, y yo necesito dormir para el examen.',
  'Si de plano no hay de otra, voy al Ministerio Público, pero me llevo mi guía de estudio y le pido a mi mamá que me deje volver antes de las seis.',
]

/** Dolares por millon de tokens (entrada, salida, lectura de cache). Anthropic de su tabla; OpenRouter de /api/v1/models del 23-10. */
interface Candidate {
  label: string
  config: () => ProviderConfig | null
  /** Anthropic cuenta la entrada sin la cache; las APIs compatibles con OpenAI la incluyen. */
  price: { input: number; output: number; cacheRead?: number; cacheWrite?: number }
}

const anthropic = (model: string) => () => (process.env['ANTHROPIC_API_KEY'] ? { kind: 'anthropic' as const, model, credential: process.env['ANTHROPIC_API_KEY'], effort: 'low' as const } : null)
const openrouter = (model: string) => () => (process.env['OPENROUTER_API_KEY'] ? { kind: 'openai' as const, model, credential: process.env['OPENROUTER_API_KEY'], baseUrl: 'https://openrouter.ai/api/v1' } : null)

const CANDIDATES: Candidate[] = [
  { label: 'Claude Haiku 4.5 (gratis hoy)', config: anthropic('claude-haiku-4-5-20251001'), price: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 } },
  { label: 'Claude Haiku 5.5', config: anthropic('claude-haiku-5-5'), price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 } },
  { label: 'DeepSeek V4.1 Flash', config: openrouter('deepseek/deepseek-v4.1-flash'), price: { input: 0.3, output: 1.2 } },
  { label: 'Qwen 3.8 Flash', config: openrouter('qwen/qwen3.8-flash'), price: { input: 0.15, output: 0.47 } },
  { label: 'GLM 5.3 Flash', config: openrouter('z-ai/glm-5.3-flash'), price: { input: 0.15, output: 0.5 } },
  { label: 'Gemini 3.8 Flash', config: openrouter('google/gemini-3.8-flash'), price: { input: 0.825, output: 4.125 } },
  { label: 'Claude Sonnet 5 (maestro, referencia)', config: anthropic('claude-sonnet-5'), price: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 } },
]

function render(block: TurnBlock): string | null {
  switch (block.type) {
    case 'narration':
      return block.text
    case 'dialogue':
      return `**${block.speaker}:** «${block.text}»`
    case 'milestone':
      return `> **Logro:** ${block.title}`
    case 'system':
      return block.audience === 'host' ? null : `> ${block.title ? `**${block.title}.** ` : ''}${block.text}`
    default:
      return null
  }
}

interface TurnMeasure {
  words: number
  seconds: number
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheWrite: number
  ignored: number
  lostStory: number
  repaired: number
  milestone: boolean
  error: string | null
}

async function main(): Promise<void> {
  const only = process.env['COMPARE_MODELS']?.split(',').map((s) => s.trim().toLowerCase())
  const { pack } = await loadPack(fsSource(resolve(root, 'content/packs', PACK)), { language: 'es' })
  if (!pack) throw new Error(`no carga el pack ${PACK}`)

  const summary: string[] = []
  const detail: string[] = []

  for (const candidate of CANDIDATES) {
    if (only && !only.some((o) => candidate.label.toLowerCase().includes(o))) continue
    const config = candidate.config()
    if (!config) {
      console.log(`${candidate.label}: sin clave, se omite`)
      continue
    }
    const events: CampaignEvent[] = [{ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: SESSION, recordedAt: new Date().toISOString(), payload: { party: [`character:${HERO}`] } } as CampaignEvent]
    const measures: TurnMeasure[] = []
    detail.push(`## ${candidate.label}`, '')

    for (let n = 1; n <= ACTIONS.length + 1; n++) {
      const action = n > 1 ? ACTIONS[n - 2] : undefined
      const m: TurnMeasure = { words: 0, seconds: 0, inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0, ignored: 0, lostStory: 0, repaired: 0, milestone: false, error: null }
      const lines: string[] = []
      const started = Date.now()
      const request = {
        contract: 1 as const,
        campaignId: `cmp-${PACK}`,
        pack: { id: pack.manifest.id, version: pack.manifest.version },
        ruleset: RULESET,
        snapshot: null,
        events,
        turn: { id: `t-${n}`, number: n, sessionId: SESSION, responses: action ? [{ characterId: HERO, playerId: 'p1', text: action, submittedAt: new Date().toISOString(), late: false }] : [] },
        provider: config,
        context: { pacing: { length: 'corta' as const, extra: 0, wrap: false } },
        dice: 'engine' as const,
        language: 'es' as const,
      }
      try {
        for await (const line of resolveTurn(request, { loadPack: async () => pack, now: () => new Date() }) as AsyncIterable<ResolveLine>) {
          if (line.kind === 'block') {
            const text = render(line.block)
            if (text) lines.push(text)
            if (line.block.type === 'narration' || line.block.type === 'dialogue') m.words += line.block.text.split(/\s+/).filter(Boolean).length
            if (line.block.type === 'milestone') m.milestone = true
          }
          if (line.kind === 'result') {
            events.push(...line.events)
            m.inputTokens = line.usage.inputTokens
            m.outputTokens = line.usage.outputTokens
            m.cacheRead = line.usage.cacheReadTokens ?? 0
            m.cacheWrite = line.usage.cacheWriteTokens ?? 0
            m.ignored = line.diagnostics?.ignoredCount ?? 0
            m.lostStory = line.diagnostics?.lostStory ?? 0
            m.repaired = line.diagnostics?.repaired.length ?? 0
          }
          if (line.kind === 'error') m.error = line.message
        }
      } catch (error) {
        m.error = error instanceof Error ? error.message : String(error)
      }
      m.seconds = (Date.now() - started) / 1000
      measures.push(m)
      detail.push(`### Turno ${n}${action ? `: «${action}»` : ' (apertura)'}`, '', `_${m.words} palabras, ${m.seconds.toFixed(0)} s, ${m.inputTokens} de entrada (${m.cacheRead} de cache), ${m.outputTokens} de salida, ${m.ignored} lineas ignoradas, ${m.repaired} reparadas._`, '')
      if (m.error) detail.push(`_Error: ${m.error}_`, '')
      detail.push(...lines.flatMap((l) => [l, '']))
      console.log(`${candidate.label} turno ${n}: ${m.words} palabras, ${m.seconds.toFixed(0)} s${m.error ? `, ERROR ${m.error.slice(0, 120)}` : ''}`)
      if (m.error) break
    }

    const sum = (f: (m: TurnMeasure) => number) => measures.reduce((a, m) => a + f(m), 0)
    const separateCache = config.kind === 'anthropic'
    const fresh = separateCache ? sum((m) => m.inputTokens) : sum((m) => m.inputTokens - m.cacheRead)
    const cost = (fresh * candidate.price.input + sum((m) => m.cacheRead) * (candidate.price.cacheRead ?? candidate.price.input) + sum((m) => m.cacheWrite) * (candidate.price.cacheWrite ?? candidate.price.input) + sum((m) => m.outputTokens) * candidate.price.output) / 1e6
    const turns = measures.length
    summary.push(
      `| ${candidate.label} | ${turns}/${ACTIONS.length + 1} | ${Math.round(sum((m) => m.words) / Math.max(1, turns))} | ${(sum((m) => m.seconds) / Math.max(1, turns)).toFixed(0)} s | ${measures.filter((m) => m.milestone).length} | ${sum((m) => m.ignored)} (${sum((m) => m.lostStory)} de historia) | ${sum((m) => m.repaired)} | ${(cost / Math.max(1, turns)).toFixed(4)} | ${measures.some((m) => m.error) ? 'si' : 'no'} |`,
    )
  }

  const out = [
    `# Comparacion de narradores (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`,
    '',
    `Mundo ${PACK}, sesion ${SESSION}, sesion corta, un jugador; la apertura y ${ACTIONS.length} turnos con las mismas acciones. Anthropic con effort low; los demas por OpenRouter.`,
    '',
    '| Modelo | Turnos | Palabras por turno | Tiempo por turno | Logros | Lineas ignoradas | Reparadas | USD por turno | Error |',
    '|---|---|---|---|---|---|---|---|---|',
    ...summary,
    '',
    ...detail,
  ]
  const dir = resolve(root, 'gm/ab')
  await mkdir(dir, { recursive: true })
  const file = resolve(dir, `narradores-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.md`)
  await writeFile(file, out.join('\n'))
  console.log(`escrito ${file}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
