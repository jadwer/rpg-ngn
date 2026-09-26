import { describe, expect, it } from 'vitest'
import { moreIdeasButton } from './ideas.js'

describe('moreIdeasButton', () => {
  it('gratis o desbloqueado se puede pedir; bloqueado se ve con el motivo; agotado o sin turno no hay boton', () => {
    expect(moreIdeasButton('free')).toEqual({ label: 'Otras ideas', enabled: true, hint: null })
    expect(moreIdeasButton('unlocked')?.enabled).toBe(true)
    const locked = moreIdeasButton('locked')
    expect(locked?.enabled).toBe(false)
    expect(locked?.hint).toContain('clave')
    expect(moreIdeasButton('exhausted')).toBeNull()
    expect(moreIdeasButton('none')).toBeNull()
  })
})
