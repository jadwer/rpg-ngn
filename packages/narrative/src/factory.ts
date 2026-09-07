import type { ProviderConfig } from '@rpg-ngn/engine-contract'
import type { DMProvider } from './provider.js'
import { ScriptedDMProvider } from './scripted.js'

/** Construye el proveedor que pide la plataforma. Anthropic llega en la entrega 6. */
export function createProvider(config: ProviderConfig): DMProvider {
  switch (config.kind) {
    case 'scripted':
      return new ScriptedDMProvider()
    case 'anthropic':
      throw new Error('el proveedor anthropic llega en la entrega 6; usa scripted')
  }
}
