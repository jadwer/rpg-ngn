import type { GmPreset } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { describePreset, presetOptionLabel, presetOptionParts, providerForNewTable, savedProviderText, selectablePresets } from './gm-presets.js'

const presets: GmPreset[] = [
  { name: 'scripted', kind: 'scripted', model: null, configured: true, default: false },
  { name: 'anthropic', kind: 'anthropic', model: 'claude-sonnet-5', configured: true, default: true },
  { name: 'openai', kind: 'openai', model: 'gpt-5', configured: false, default: false },
]

describe('presets del GM', () => {
  it('nombra los conocidos y deja pasar los desconocidos', () => {
    expect(describePreset('anthropic')).toBe('Anthropic (Claude)')
    expect(describePreset('otro')).toBe('otro')
    expect(presetOptionLabel(presets[1]!)).toBe('Anthropic (Claude) (el del servidor), claude-sonnet-5')
    expect(presetOptionLabel(presets[0]!)).toBe('GM con guion (sin modelo)')
  })

  it('partido para pintarlo: el nombre arriba, quien paga y el modelo abajo', () => {
    expect(presetOptionParts(presets[1]!, true)).toEqual({ title: 'Anthropic (Claude)', detail: 'Con tu clave, no gasta cupo · claude-sonnet-5' })
    expect(presetOptionParts(presets[1]!)).toEqual({ title: 'Anthropic (Claude)', detail: 'El del servidor · claude-sonnet-5' })
    expect(presetOptionParts(presets[2]!)).toEqual({ title: 'OpenAI', detail: 'gpt-5' })
    expect(presetOptionParts(presets[0]!)).toEqual({ title: 'GM con guion (sin modelo)', detail: null })
  })

  it('con clave propia el preset se ofrece aunque el servidor no lo tenga, va primero y lo dice', () => {
    expect(selectablePresets(presets, ['openai']).map((p) => p.name)).toEqual(['openai', 'anthropic', 'scripted'])
    expect(presetOptionLabel(presets[1]!, true)).toBe('Anthropic (Claude) (con tu clave, no gasta cupo), claude-sonnet-5')
  })

  it('al crear la mesa ofrece solo los configurados, con el del servidor primero, y manda siempre el elegido', () => {
    expect(selectablePresets(presets).map((p) => p.name)).toEqual(['anthropic', 'scripted'])
    // Desde la entrega 7 el proveedor es obligatorio al crear: elegir el del
    // servidor tambien se escribe en la mesa, no se deja implicito.
    expect(providerForNewTable('anthropic', 'anthropic')).toEqual({ preset: 'anthropic', model: null })
    expect(providerForNewTable('', 'anthropic')).toEqual({ preset: 'anthropic', model: null })
    expect(providerForNewTable('scripted', 'anthropic')).toEqual({ preset: 'scripted', model: null })
    expect(providerForNewTable('', '')).toBeNull()
  })

  it('describe lo guardado', () => {
    expect(savedProviderText(null)).toBe('La mesa usa el GM del servidor.')
    expect(savedProviderText({ preset: 'ollama', model: 'llama3' })).toBe('Guardado: Ollama (modelo local en la red), modelo llama3.')
  })
})
