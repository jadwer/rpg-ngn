import { describe, expect, it } from 'vitest'
import { allowedEventFor } from './model-dm.js'
import { DM_SYSTEM_PROMPT, DM_SYSTEM_PROMPT_COMPACT, systemPromptFor } from './prompt.js'

/**
 * El prompt y los eventos aceptados dependen del ruleset. La mesa 4 de
 * produccion (court-intrigue) narro un turno entero sin mover el estado
 * porque el prompt era el del d20 y el provider descartaba `suspicion` como
 * basura (VAM del 19-09, motor A8).
 */
describe('prompt por ruleset', () => {
  it('el d20 recibe el prompt de siempre, byte a byte', () => {
    expect(systemPromptFor('fantasy-d20-lite')).toBe(DM_SYSTEM_PROMPT)
    expect(systemPromptFor(undefined)).toBe(DM_SYSTEM_PROMPT)
    expect(systemPromptFor('fantasy-d20-lite', true)).toBe(DM_SYSTEM_PROMPT_COMPACT)
  })

  it('la corte ofrece credito, sospecha y pistas, y no puntos de vida', () => {
    const prompt = systemPromptFor('court-intrigue')
    expect(prompt).toContain('"op":"suspicion"')
    expect(prompt).toContain('"op":"standing"')
    expect(prompt).toContain('"op":"clue"')
    expect(prompt).not.toContain('"op":"hp"')
    expect(prompt).not.toContain('"op":"memory_recovered"')
    // El tronco (contrato de realidad, agencia, estilo, formato) es el mismo.
    expect(prompt.startsWith(DM_SYSTEM_PROMPT.slice(0, DM_SYSTEM_PROMPT.indexOf('# Eventos que puedes proponer')))).toBe(true)

    const compact = systemPromptFor('court-intrigue', true)
    expect(compact).toContain('"op":"suspicion"')
    expect(compact).not.toContain('"op":"hp"')
    expect(compact.length).toBeLessThan(DM_SYSTEM_PROMPT.length)
  })
})

describe('prompt de la mascarada', () => {
  it('ofrece vinculos, rumores, prestigio y escandalo, y ni hp ni sospecha', () => {
    const prompt = systemPromptFor('masquerade')
    for (const op of ['bond', 'rumor', 'prestige', 'scandal']) expect(prompt).toContain(`"op":"${op}"`)
    expect(prompt).not.toContain('"op":"hp"')
    expect(prompt).not.toContain('"op":"suspicion"')
    expect(prompt).toContain('Nunca digas al jugador lo que un NPC siente')
    expect(prompt.startsWith(DM_SYSTEM_PROMPT.slice(0, DM_SYSTEM_PROMPT.indexOf('# Eventos que puedes proponer')))).toBe(true)
    const compact = systemPromptFor('masquerade', true)
    expect(compact).toContain('"op":"bond"')
    expect(compact.length).toBeLessThan(DM_SYSTEM_PROMPT.length)
  })
})

describe('eventos aceptados por ruleset', () => {
  const suspicion = { type: 'state_change', actor: 'character:ryomen', effects: [{ op: 'suspicion', who: 'character:ryomen', delta: 2 }] }
  const clue = { type: 'state_change', effects: [{ op: 'clue', who: 'character:kogen', clue: 'la tetera salió de las cocinas del oeste' }] }
  const hp = { type: 'state_change', actor: 'character:zahira', effects: [{ op: 'hp', who: 'character:zahira', delta: -3 }] }
  const condition = { type: 'state_change', effects: [{ op: 'condition', who: 'character:tenma', add: 'vigilado' }] }

  it('la corte acepta sospecha y pistas y rechaza hp', () => {
    const allowed = allowedEventFor('court-intrigue')
    expect(allowed.safeParse(suspicion).success).toBe(true)
    expect(allowed.safeParse(clue).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(hp).success).toBe(false)
    // Una pista vacia no es una pista, y un delta 0 no cambia nada.
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'clue', who: 'character:kogen', clue: '' }] }).success).toBe(false)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'suspicion', who: 'character:kogen', delta: 0 }] }).success).toBe(false)
  })

  it('el d20 sigue aceptando hp y rechaza lo de la corte', () => {
    const allowed = allowedEventFor('fantasy-d20-lite')
    expect(allowed.safeParse(hp).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(suspicion).success).toBe(false)
    expect(allowed.safeParse(clue).success).toBe(false)
  })

  it('la mascarada acepta vinculos con estado conocido y rechaza lo de la corte', () => {
    const allowed = allowedEventFor('masquerade')
    const bond = { type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'interes' }] }
    expect(allowed.safeParse(bond).success).toBe(true)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'amor' }] }).success).toBe(false)
    // Con tilde, como lo escribe el modelo, y sale normalizado (Haiku en produccion, mesa 9, 20-09).
    const accented = allowed.safeParse({ type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'Atracción' }] })
    expect(accented.success).toBe(true)
    expect((accented.data as { effects: Array<{ state: string }> }).effects[0]!.state).toBe('atraccion')
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'rumor', who: 'character:camille', rumor: 'la dama de rojo llegó sola' }] }).success).toBe(true)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'scandal', who: 'character:camille', delta: 2 }] }).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(suspicion).success).toBe(false)
    expect(allowed.safeParse(hp).success).toBe(false)
  })

  it('lo comun (tiradas, objetos, mundo, secretos) vale en los dos', () => {
    const roll = { type: 'roll', actor: 'character:shiho', resolved: { kind: 'social', die: '1d20', skill: 'Etiqueta' } }
    const world = { type: 'world_event', payload: { note: 'Se dobla la guardia' } }
    for (const id of ['court-intrigue', 'fantasy-d20-lite']) {
      expect(allowedEventFor(id).safeParse(roll).success).toBe(true)
      expect(allowedEventFor(id).safeParse(world).success).toBe(true)
    }
  })
})
