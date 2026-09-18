import type { DmPreset } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { describePreset, presetOptionLabel, providerForNewTable, savedProviderText, selectablePresets } from './dm-presets.js'

const presets: DmPreset[] = [
  { name: 'scripted', kind: 'scripted', model: null, configured: true, default: false },
  { name: 'anthropic', kind: 'anthropic', model: 'claude-sonnet-5', configured: true, default: true },
  { name: 'openai', kind: 'openai', model: 'gpt-5', configured: false, default: false },
]

describe('presets del DM', () => {
  it('nombra los conocidos y deja pasar los desconocidos', () => {
    expect(describePreset('anthropic')).toBe('Anthropic (Claude)')
    expect(describePreset('otro')).toBe('otro')
    expect(presetOptionLabel(presets[1]!)).toBe('Anthropic (Claude) (el del servidor), claude-sonnet-5')
    expect(presetOptionLabel(presets[0]!)).toBe('DM con guion (sin modelo)')
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
    expect(savedProviderText(null)).toBe('La mesa usa el DM del servidor.')
    expect(savedProviderText({ preset: 'ollama', model: 'llama3' })).toBe('Guardado: Ollama (modelo local en la red), modelo llama3.')
  })
})
