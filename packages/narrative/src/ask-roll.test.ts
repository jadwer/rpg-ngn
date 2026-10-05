import { seededRandom } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { buildTurnContext } from './context.js'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'
import { ASK_ROLL_EXAMPLE, GM_SYSTEM_PROMPT, GM_SYSTEM_PROMPT_COMPACT, systemPromptFor } from './prompt.js'

const KEY = 'sk-proj-SECRETA-1234567890abcdef'

/**
 * Mesa 39, 25-09, turnos 16 y 18: con los dados en manos de la mesa, el GM
 * invento un 13 y un 9 "del motor", narro la consecuencia y el motor ignoro
 * la linea en silencio. Nadie le pidio tirar al jugador. Desde entonces el
 * GM pide la tirada (`ask_roll`), el jugador la suelta y la consecuencia se
 * narra al turno siguiente.
 */
describe('tirada pedida por el GM (modos dice y table)', () => {
  it('el prompt cambia con el modo de dados: sin "Dados de este turno" y con la linea ask_roll', () => {
    expect(systemPromptFor(undefined, false, 'engine')).toBe(GM_SYSTEM_PROMPT)
    expect(systemPromptFor(undefined, true, 'engine')).toBe(GM_SYSTEM_PROMPT_COMPACT)

    for (const compact of [false, true]) {
      for (const dice of ['dice', 'table'] as const) {
        for (const ruleset of [undefined, 'court-intrigue', 'masquerade']) {
          const prompt = systemPromptFor(ruleset, compact, dice)
          expect(prompt).toContain(ASK_ROLL_EXAMPLE)
          expect(prompt).not.toContain('El motor ya tiró')
          expect(prompt).not.toContain('"source":"engine"')
          expect(prompt).not.toContain('Tirada extra que pides y el motor resuelve')
          if (dice === 'dice') {
            expect(prompt).not.toContain('"source":"physical"')
            // La tirada y la accion van en el mismo turno (modelo de monetizacion, seccion 12).
            expect(prompt).toContain('si paso, salto el muro')
          } else expect(prompt).toContain('"source":"physical"')
        }
      }
    }
    // El resto del prompt no cambia: la agencia y los secretos siguen ahi, y es estable (cache de prefijo).
    const dice = systemPromptFor(undefined, false, 'dice')
    expect(dice).toContain('# Agencia del jugador')
    expect(dice).toContain('# Secretos (capa del GM)')
    expect(systemPromptFor(undefined, false, 'dice')).toBe(dice)
    expect(systemPromptFor('masquerade', false, 'table')).toContain('"actor":"character:camille"')
  })

  it('"Uso percepción" en modo dice: el GM pide la tirada, no narra la consecuencia y no hay evento roll', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"Zahira entrecierra los ojos: hay algo en la pared, pero la luz no alcanza."}}',
      '{"kind":"ask_roll","characterId":"zahira","die":"1d20","rollKind":"skill","skill":"Percepción","reason":"lo que hay grabado en la roca"}',
      '{"kind":"suggest","characterId":"zahira","options":["Me acerco","Espero"]}',
      '{"kind":"suggest","characterId":"calder","options":["Vigilo la entrada","Enciendo la lámpara"]}',
      '{"kind":"addressed","characterIds":["calder"]}',
    ].join('\n')
    const provider = new ModelGMProvider(new FakeTransport(lines), KEY, { random: seededRandom(1) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Uso percepcion')]), { dice: 'dice' })))

    expect(outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['player_action', 'narration'])
    expect(outputs.find((o) => o.kind === 'rollRequests')).toEqual({
      kind: 'rollRequests',
      requests: [{ characterId: 'zahira', die: '1d20', kind: 'skill', skill: 'Percepción', reason: 'lo que hay grabado en la roca' }],
    })
    // Quien tira va en addressed aunque el modelo lo olvidara, y conserva sus ideas para decir que intenta con el dado.
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder', 'zahira'] })
    expect(outputs.find((o) => o.kind === 'suggestions')).toEqual({ kind: 'suggestions', byCharacter: { zahira: ['Me acerco', 'Espero'], calder: ['Vigilo la entrada', 'Enciendo la lámpara'] } })
    expect(diagnosticsOf(outputs).ignoredCount).toBe(0)
  })

  it('red de seguridad: un numero inventado se vuelve peticion y el anfitrion se entera; una tirada sin numero tambien se pide, sin aviso', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"Un pie se hunde en agua helada."}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":9,"source":"engine","skill":"Supervivencia"}}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:calder","resolved":{"kind":"attack","die":"2d6+1"}}}',
      '{"kind":"addressed","characterIds":["zahira","calder"]}',
    ].join('\n')
    const provider = new ModelGMProvider(new FakeTransport(lines), KEY, { random: seededRandom(1) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Sigo hacia el segundo nivel'), response('calder', 'Ataco.')]), { dice: 'dice' })))

    expect(outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['player_action', 'player_action', 'narration'])
    expect(outputs.find((o) => o.kind === 'rollRequests')).toEqual({
      kind: 'rollRequests',
      requests: [
        { characterId: 'zahira', die: '1d20', kind: 'skill', skill: 'Supervivencia' },
        { characterId: 'calder', die: '2d6+1', kind: 'attack' },
      ],
    })
    expect(diagnosticsOf(outputs).ignoredCount).toBe(1)
    expect(diagnosticsOf(outputs).ignored.join('\n')).toContain('inventó un 9')
  })

  it('en modo table el numero escrito sigue valiendo; el no escrito se pide', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"La campana suena a hueco."}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":14,"source":"physical","skill":"Historia"}}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:calder","resolved":{"kind":"skill","die":"1d20","result":18,"source":"physical","skill":"Sigilo"}}}',
      '{"kind":"addressed","characterIds":["zahira","calder"]}',
    ].join('\n')
    const provider = new ModelGMProvider(new FakeTransport(lines), KEY, { random: seededRandom(1) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Miro la campana. Saqué 14.'), response('calder', 'Me escondo.')]), { dice: 'table' })))

    const rolls = outputs.filter((o) => o.kind === 'event' && o.event['type'] === 'roll').map((o) => (o.kind === 'event' ? o.event : null))
    expect(rolls).toHaveLength(1)
    expect(rolls[0]).toMatchObject({ actor: 'character:zahira', resolved: { result: 14, source: 'physical' } })
    expect(outputs.find((o) => o.kind === 'rollRequests')).toEqual({ kind: 'rollRequests', requests: [{ characterId: 'calder', die: '1d20', kind: 'skill', skill: 'Sigilo' }] })
  })

  it('la tirada ya registrada por la API llega como respuesta: el GM la ve y su roll repetido se calla sin contar', async () => {
    const base = await openSession003()
    const rolled = { ...response('zahira', 'Tiro 1d20 (Percepción): 17'), roll: { die: '1d20', result: 17, rolls: [17], kind: 'skill' as const, skill: 'Percepción' } }
    const built = buildTurnContext(contextFor(base, turn(3, [rolled]), { dice: 'dice' }))
    expect(built.user).toContain('Zahira (character:zahira) tiró 1d20 (Percepción) cuando se lo pediste: 17.')
    expect(built.user).toContain('no emitas "roll"')
    expect(built.user).not.toContain('Dados de este turno')

    const lines = [
      '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":17,"source":"physical","skill":"Percepción"}}}',
      '{"kind":"block","block":{"type":"narration","text":"Con el 17, Zahira distingue letras torpes en la roca."}}',
      '{"kind":"addressed","characterIds":["zahira"]}',
    ].join('\n')
    const provider = new ModelGMProvider(new FakeTransport(lines), KEY, { random: seededRandom(1) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(3, [rolled]), { dice: 'dice' })))
    expect(outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['player_action', 'narration'])
    expect(diagnosticsOf(outputs).ignoredCount).toBe(0)
    expect(outputs.find((o) => o.kind === 'rollRequests')).toBeUndefined()
  })

  it('con el motor tirando, ask_roll no tiene sentido y se ignora', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"block","block":{"type":"narration","text":"Nada se mueve."}}', '{"kind":"ask_roll","characterId":"zahira","die":"1d20","rollKind":"skill"}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const provider = new ModelGMProvider(new FakeTransport(lines), KEY, { random: seededRandom(1) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]), { dice: 'engine' })))
    expect(outputs.find((o) => o.kind === 'rollRequests')).toBeUndefined()
    expect(diagnosticsOf(outputs).ignoredCount).toBe(1)
  })
})
