/**
 * A/B de la apertura (docs/26, H2): la misma apertura de sesion, con el mismo
 * mundo y la misma mesa, narrada por cada proveedor, para leerla lado a lado.
 * Gabino decide con el texto enfrente si cambia el proveedor por omision.
 *
 *   node --env-file=<archivo con ANTHROPIC_API_KEY y OPENAI_API_KEY> \
 *     --import tsx scripts/ab-opening.mts
 *
 * Un proveedor sin clave se omite. Escribe `gm/ab/apertura-<fecha>.md`
 * (gitignored). Cuesta centavos: una llamada por mundo y proveedor.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadPack } from '@rpg-ngn/content'
import type { ProviderConfig, ResolveLine, TurnBlock } from '@rpg-ngn/engine-contract'
import { fsSource } from '../src/packs.js'
import { resolveTurn } from '../src/resolve.js'

const root = resolve(import.meta.dirname, '../../..')
const packsDir = resolve(root, 'content/packs')

/** Mundo, sesion, ruleset y los personajes de la mesa. */
const TABLES = [
  { pack: 'pilot', session: '001', ruleset: 'fantasy-d20-lite@1.0.0', party: ['zahira', 'calder', 'kael'] },
  { pack: 'mascarada', session: '001', ruleset: 'masquerade@1.0.0', party: ['camille', 'lucien', 'margot'] },
  { pack: 'private-botica', session: '001', ruleset: 'court-intrigue@1.0.0', party: ['byakuren', 'kogen', 'ryomen'] },
]

const providers: Array<{ label: string; config: ProviderConfig }> = []
if (process.env['ANTHROPIC_API_KEY']) providers.push({ label: 'Claude (claude-sonnet-5)', config: { kind: 'anthropic', model: process.env['AB_ANTHROPIC_MODEL'] ?? 'claude-sonnet-5', credential: process.env['ANTHROPIC_API_KEY'] } })
if (process.env['OPENAI_API_KEY']) providers.push({ label: `GPT (${process.env['AB_OPENAI_MODEL'] ?? 'gpt-5'})`, config: { kind: 'openai', model: process.env['AB_OPENAI_MODEL'] ?? 'gpt-5', credential: process.env['OPENAI_API_KEY'] } })

function render(block: TurnBlock): string | null {
  switch (block.type) {
    case 'narration':
      return block.text
    case 'dialogue':
      return `**${block.speaker}:** «${block.text}»`
    case 'system':
      return block.audience === 'host' ? null : `> ${block.title ? `**${block.title}.** ` : ''}${block.text}`
    default:
      return null
  }
}

async function main(): Promise<void> {
  if (providers.length === 0) throw new Error('no hay ANTHROPIC_API_KEY ni OPENAI_API_KEY en el entorno')
  const out: string[] = [`# A/B de la apertura (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`, '', 'Misma mesa y mismo mundo; cambia solo quien narra. Apertura nueva del 04-10 (docs/26, H2), sesion corta.', '']

  for (const table of TABLES) {
    const { pack } = await loadPack(fsSource(resolve(packsDir, table.pack)), { language: 'es' })
    if (!pack) {
      out.push(`## ${table.pack}`, '', '_No carga._', '')
      continue
    }
    out.push(`## ${pack.manifest.name} (sesion ${table.session})`, '')
    for (const provider of providers) {
      const started = Date.now()
      const lines: string[] = []
      let usage = ''
      let words = 0
      const request = {
        contract: 1 as const,
        campaignId: `ab-${table.pack}`,
        pack: { id: pack.manifest.id, version: pack.manifest.version },
        ruleset: table.ruleset,
        snapshot: null,
        events: [{ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: table.session, recordedAt: new Date().toISOString(), payload: { party: table.party.map((id) => `character:${id}`) } }],
        turn: { id: 't-1', number: 1, sessionId: table.session, responses: [] },
        provider: provider.config,
        context: { pacing: { length: 'corta' as const, extra: 0, wrap: false } },
        dice: 'engine' as const,
        language: 'es' as const,
      }
      try {
        for await (const line of resolveTurn(request, { loadPack: async () => pack, now: () => new Date() }) as AsyncIterable<ResolveLine>) {
          if (line.kind === 'block') {
            const text = render(line.block)
            if (text) lines.push(text)
            if (line.block.type === 'narration' || line.block.type === 'dialogue') words += line.block.text.split(/\s+/).filter(Boolean).length
          }
          if (line.kind === 'result') usage = `${line.usage.inputTokens} de entrada, ${line.usage.outputTokens} de salida`
          if (line.kind === 'error') lines.push(`_Error: ${line.message}_`)
        }
      } catch (error) {
        lines.push(`_Error: ${error instanceof Error ? error.message : String(error)}_`)
      }
      out.push(`### ${provider.label}`, '', `_${words} palabras, ${((Date.now() - started) / 1000).toFixed(0)} s, tokens: ${usage || 'sin dato'}._`, '', ...lines.flatMap((l) => [l, '']))
      console.log(`${table.pack} / ${provider.label}: ${words} palabras`)
    }
  }

  const dir = resolve(root, 'gm/ab')
  await mkdir(dir, { recursive: true })
  const file = resolve(dir, `apertura-${new Date().toISOString().slice(0, 10)}.md`)
  await writeFile(file, out.join('\n'))
  console.log(`escrito ${file}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
