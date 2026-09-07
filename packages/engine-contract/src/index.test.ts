import { describe, expect, it } from 'vitest'
import { ENGINE_CONTRACT_VERSION, ProviderConfig, ResolveLine, ResolveTurnRequest, TurnBlock } from './index.js'

describe('engine-contract', () => {
  it('acepta una peticion de turno minima con proveedor scripted', () => {
    const result = ResolveTurnRequest.safeParse({
      contract: ENGINE_CONTRACT_VERSION,
      campaignId: '1',
      pack: { id: 'pilot', version: '0.4.0' },
      ruleset: 'fantasy-d20-lite@1.0.0',
      snapshot: null,
      events: [],
      turn: { id: 't1', number: 1, sessionId: '003', responses: [] },
      provider: { kind: 'scripted' },
    })

    expect(result.success).toBe(true)
  })

  it('rechaza otra version de contrato y claves desconocidas', () => {
    expect(ResolveTurnRequest.safeParse({ contract: 2 }).success).toBe(false)
    expect(ProviderConfig.safeParse({ kind: 'anthropic', model: 'x' }).success).toBe(false)
    expect(TurnBlock.safeParse({ type: 'narration', text: 'hola', extra: 1 }).success).toBe(false)
  })

  it('tipa las lineas del stream', () => {
    expect(ResolveLine.safeParse({ kind: 'block', block: { type: 'system', text: 'ok' } }).success).toBe(true)
    expect(ResolveLine.safeParse({ kind: 'error', message: 'boom' }).success).toBe(true)
    expect(ResolveLine.safeParse({ kind: 'nope' }).success).toBe(false)
  })
})
