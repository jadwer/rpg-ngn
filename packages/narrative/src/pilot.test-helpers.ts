import { access, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { applyEvent, reduce, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, loadPack, parseEventLog, type FileSource, type LoadedPack } from '@rpg-ngn/content'
import type { TurnInput, TurnResponse } from '@rpg-ngn/engine-contract'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import type { ModelPrompt, ModelReply, ModelTransport } from './model-dm.js'
import type { DMOutput, DMProbe, DMTurnContext } from './provider.js'

const repoRoot = resolve(import.meta.dirname, '../../..')

export function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) => access(join(root, path)).then(() => true, () => false),
    list: (dir) => readdir(join(root, dir), { withFileTypes: true }).then((e) => e.filter((x) => x.isFile()).map((x) => x.name), () => []),
  }
}

/** Pack piloto y estado al cierre de la sesion 002 (21 eventos). */
export async function pilotContext(): Promise<{ pack: LoadedPack; state: CampaignState }> {
  const { pack } = await loadPack(fsSource(join(repoRoot, 'content/packs/pilot')))
  const log = parseEventLog(await readFile(join(repoRoot, 'campaigns/pilot/events.jsonl'), 'utf8'), { pack: pack! })
  const state = reduce(log.events, { pack: pack!, ruleset: fantasyD20Lite })
  return { pack: pack!, state }
}

/** Abre la sesion 003 con Zahira y Calder sobre el estado del piloto (seq 22). */
export async function openSession003(): Promise<{ pack: LoadedPack; state: CampaignState; recentEvents: CampaignEvent[] }> {
  const { pack, state } = await pilotContext()
  const started = CampaignEvent.parse({
    id: 'evt-00022',
    v: 1,
    seq: 22,
    type: 'session_started',
    sessionId: '003',
    recordedAt: '2026-09-12T19:00:00Z',
    worldTime: 'Valdoria, tres días después, anochecer',
    payload: { party: ['character:zahira', 'character:calder'] },
  })
  return { pack, state: applyEvent(state, started, fantasyD20Lite), recentEvents: [started] }
}

export function response(characterId: string, text: string, late = false): TurnResponse {
  return { characterId, playerId: `u-${characterId}`, text, submittedAt: '2026-09-12T19:30:00Z', late }
}

export function turn(number: number, responses: TurnResponse[], id = `t-${number}`): TurnInput {
  return { id, number, sessionId: '003', responses }
}

export async function collect(iterable: AsyncIterable<DMOutput>): Promise<DMOutput[]> {
  const out: DMOutput[] = []
  for await (const item of iterable) out.push(item)
  return out
}

/** Transporte falso: reproduce un texto grabado en trozos de tamaño irregular. */
export class FakeTransport implements ModelTransport {
  readonly kind = 'fake'
  readonly model = 'fake-1'
  prompts: ModelPrompt[] = []

  constructor(
    private readonly text: string,
    private readonly reply: Partial<ModelReply> = {},
    private readonly failWith?: Error,
  ) {}

  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    this.prompts.push(prompt)
    if (this.failWith) throw this.failWith
    let i = 0
    const sizes = [1, 7, 3, 40, 2, 13]
    while (i < this.text.length) {
      const size = sizes[i % sizes.length]!
      yield this.text.slice(i, i + size)
      i += size
    }
    return { finish: 'stop', inputTokens: 1200, outputTokens: 300, ...this.reply }
  }

  async probe(): Promise<DMProbe> {
    return { ok: true, model: this.model, message: 'fake' }
  }
}

export function contextFor(base: { pack: LoadedPack; state: CampaignState; recentEvents?: CampaignEvent[] }, input: TurnInput, extra: Partial<DMTurnContext> = {}): DMTurnContext {
  return { pack: base.pack, state: base.state, session: base.pack.sessions.get('003'), turn: input, recentEvents: base.recentEvents, ...extra }
}
