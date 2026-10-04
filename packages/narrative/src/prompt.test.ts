import { describe, expect, it } from 'vitest'
import { GM_SYSTEM_PROMPT, GM_SYSTEM_PROMPT_COMPACT, NARRATE_IN_ENGLISH, systemPromptFor } from './prompt.js'

describe('GM_SYSTEM_PROMPT', () => {
  it('protege la agencia del jugador con ejemplos de lo permitido y lo prohibido, y exige devolver la palabra', () => {
    expect(GM_SYSTEM_PROMPT).toContain('# Agencia del jugador')
    expect(GM_SYSTEM_PROMPT).toContain('Nunca escribes lo que hacen, deciden, sienten, piensan ni dicen.')
    expect(GM_SYSTEM_PROMPT).toMatch(/Permitido[\s\S]*"La puerta cede con un chirrido/)
    expect(GM_SYSTEM_PROMPT).toMatch(/Prohibido[\s\S]*"Calder cierra el puño y decide esperar\." \(decides por él\)/)
    expect(GM_SYSTEM_PROMPT).toContain('(emoción y acción que no declaró)')
    expect(GM_SYSTEM_PROMPT).toContain('(pensamiento)')
    expect(GM_SYSTEM_PROMPT).toContain('(diálogo del jugador)')
    expect(GM_SYSTEM_PROMPT).toContain('Cada turno termina devolviendo la palabra a la mesa')
    expect(GM_SYSTEM_PROMPT).toContain('Nunca cierres un turno con un personaje jugador actuando.')
  })

  it('explica la capa de secretos y el evento secret_revealed', () => {
    expect(GM_SYSTEM_PROMPT).toContain('# Secretos (capa del GM)')
    expect(GM_SYSTEM_PROMPT).toContain('emite ANTES del bloque que lo cuenta el evento secret_revealed')
    expect(GM_SYSTEM_PROMPT).toContain('{"type":"secret_revealed","payload":{"secretId":"osric-subio-solo"')
    expect(GM_SYSTEM_PROMPT).toContain('El motor corta cualquier bloque que use un secreto no revelado')
  })

  it('la version compacta conserva las mismas reglas en corto', () => {
    expect(GM_SYSTEM_PROMPT_COMPACT).toContain('"Calder cierra el puño y decide esperar" no lo es')
    expect(GM_SYSTEM_PROMPT_COMPACT).toContain('nunca con un personaje jugador actuando')
    expect(GM_SYSTEM_PROMPT_COMPACT).toContain('{"type":"secret_revealed","payload":{"secretId":"<id>"}}')
    expect(GM_SYSTEM_PROMPT_COMPACT.length).toBeLessThan(4200)
  })
})

describe('idioma de la mesa', () => {
  it('en ingles agrega la orden al final y en español deja el prompt de siempre', () => {
    const es = systemPromptFor('fantasy-d20-lite')
    expect(systemPromptFor('fantasy-d20-lite', false, 'engine', 'es')).toBe(es)
    const en = systemPromptFor('fantasy-d20-lite', false, 'engine', 'en')
    expect(en.startsWith(es)).toBe(true)
    expect(en.endsWith(NARRATE_IN_ENGLISH)).toBe(true)
  })
})

describe('drama sin combate (docs/26, H5)', () => {
  it('usa los eventos de la corte con palabras de historia, sin hablar de la corte', () => {
    const drama = systemPromptFor('drama-lite')
    expect(drama).toContain('reputación, presión y lo que el protagonista descubre')
    expect(drama).toContain('- Reputación: cuánto le abren las puertas')
    expect(drama).toContain('- Presión: cuánto lo acorralan')
    expect(drama).not.toContain('En esta corte')
    expect(systemPromptFor('drama-lite', true)).toContain('reputación (standing)')
  })
})
