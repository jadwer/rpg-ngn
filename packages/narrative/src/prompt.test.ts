import { describe, expect, it } from 'vitest'
import { DM_SYSTEM_PROMPT, DM_SYSTEM_PROMPT_COMPACT } from './prompt.js'

describe('DM_SYSTEM_PROMPT', () => {
  it('protege la agencia del jugador con ejemplos de lo permitido y lo prohibido, y exige devolver la palabra', () => {
    expect(DM_SYSTEM_PROMPT).toContain('# Agencia del jugador')
    expect(DM_SYSTEM_PROMPT).toContain('Nunca escribes lo que hacen, deciden, sienten, piensan ni dicen.')
    expect(DM_SYSTEM_PROMPT).toMatch(/Permitido[\s\S]*"La puerta cede con un chirrido/)
    expect(DM_SYSTEM_PROMPT).toMatch(/Prohibido[\s\S]*"Calder cierra el puño y decide esperar\." \(decides por él\)/)
    expect(DM_SYSTEM_PROMPT).toContain('(emoción y acción que no declaró)')
    expect(DM_SYSTEM_PROMPT).toContain('(pensamiento)')
    expect(DM_SYSTEM_PROMPT).toContain('(diálogo del jugador)')
    expect(DM_SYSTEM_PROMPT).toContain('Cada turno termina devolviendo la palabra a la mesa')
    expect(DM_SYSTEM_PROMPT).toContain('Nunca cierres un turno con un personaje jugador actuando.')
  })

  it('explica la capa de secretos y el evento secret_revealed', () => {
    expect(DM_SYSTEM_PROMPT).toContain('# Secretos (capa del DM)')
    expect(DM_SYSTEM_PROMPT).toContain('emite ANTES del bloque que lo cuenta el evento secret_revealed')
    expect(DM_SYSTEM_PROMPT).toContain('{"type":"secret_revealed","payload":{"secretId":"osric-subio-solo"')
    expect(DM_SYSTEM_PROMPT).toContain('El motor corta cualquier bloque que use un secreto no revelado')
  })

  it('la version compacta conserva las mismas reglas en corto', () => {
    expect(DM_SYSTEM_PROMPT_COMPACT).toContain('"Calder cierra el puño y decide esperar" no lo es')
    expect(DM_SYSTEM_PROMPT_COMPACT).toContain('nunca con un personaje jugador actuando')
    expect(DM_SYSTEM_PROMPT_COMPACT).toContain('{"type":"secret_revealed","payload":{"secretId":"<id>"}}')
    expect(DM_SYSTEM_PROMPT_COMPACT.length).toBeLessThan(4200)
  })
})
