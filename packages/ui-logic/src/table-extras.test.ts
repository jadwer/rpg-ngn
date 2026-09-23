import { describe, expect, it } from 'vitest'
import { dialogue, narration } from './blocks.js'
import { holdReleaseMs, latestNarrationStart, modelLabel, settleSchedule, tableDmText } from './table-extras.js'

const player = { ref: 'character:narivyl', name: 'Narivyl', portrait: null }
const npc = { ref: 'npc:tomas', name: 'Tomás', portrait: null }

describe('boton de narracion', () => {
  it('empieza despues de la ultima declaracion de un jugador', () => {
    const blocks = [narration('a', 'Apertura'), dialogue('b', player, 'Entro.'), narration('c', 'La puerta cede.'), dialogue('d', npc, '¿Quién anda ahí?')]
    expect(latestNarrationStart(blocks)).toBe('c')
  })

  it('en la apertura, desde el principio; sin bloques, nada', () => {
    expect(latestNarrationStart([narration('a', 'Amanece.')])).toBe('a')
    expect(latestNarrationStart([])).toBeNull()
  })
})

describe('con que narra la mesa', () => {
  it('nombra el modelo sin la fecha', () => {
    expect(modelLabel('claude-sonnet-5')).toBe('Claude Sonnet 5')
    expect(modelLabel('claude-haiku-4-5-20251001')).toBe('Claude Haiku 4.5')
  })

  it('dice quien paga y cuantos turnos buenos quedan', () => {
    expect(tableDmText({ source: 'own', kind: 'anthropic', model: 'claude-sonnet-5', firstTurnsLeft: null })).toContain('tu propia clave')
    expect(tableDmText({ source: 'quota', kind: 'anthropic', model: 'claude-sonnet-5', firstTurnsLeft: 12 })).toContain('quedan 12 turnos con este modelo')
    expect(tableDmText({ source: 'quota', kind: 'anthropic', model: 'claude-haiku-4-5-20251001', firstTurnsLeft: 0 })).toBe('Narra Claude Haiku 4.5 con tu cupo. Con tu propia clave narra el modelo que elijas.')
  })
})

describe('inercia del dado', () => {
  it('suelta entre 1 y 5 segundos, mas cuanto mas se mantuvo', () => {
    expect(holdReleaseMs(0)).toBe(1000)
    expect(holdReleaseMs(1500)).toBe(2500)
    expect(holdReleaseMs(60000)).toBe(5000)
  })

  it('frena: cada cara dura mas que la anterior y suman la duracion', () => {
    const steps = settleSchedule(2500)
    expect(steps.reduce((a, b) => a + b, 0)).toBe(2500)
    for (let i = 1; i < steps.length - 1; i++) expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!)
  })
})
