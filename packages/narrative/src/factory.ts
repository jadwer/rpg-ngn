import type { ProviderConfig } from '@rpg-ngn/engine-contract'
import { createAnthropicProvider, type AnthropicClientLike } from './anthropic.js'
import { createOpenAIProvider, type OpenAIClientLike } from './openai.js'
import type { DMProvider } from './provider.js'
import { ScriptedDMProvider } from './scripted.js'

/** Dependencias inyectables: clientes falsos en tests, `fetch` propio, timeout hacia el proveedor. */
export interface ProviderDeps {
  anthropicClient?: AnthropicClientLike
  openaiClient?: OpenAIClientLike
  fetch?: typeof fetch
  /** Tiempo maximo de una llamada al modelo. Un 14B en una M1 tarda de 60 a 120 s por turno. */
  timeoutMs?: number
}

/** Construye el proveedor que pide la plataforma. La credencial solo vive aqui y en el transporte. */
export function createProvider(config: ProviderConfig, deps: ProviderDeps = {}): DMProvider {
  switch (config.kind) {
    case 'scripted':
      return new ScriptedDMProvider(config.script)
    case 'anthropic':
      return createAnthropicProvider({
        model: config.model,
        credential: config.credential,
        contextProfile: config.contextProfile,
        ...(deps.anthropicClient ? { client: deps.anthropicClient } : {}),
        ...(deps.fetch ? { fetch: deps.fetch } : {}),
        ...(deps.timeoutMs ? { timeoutMs: deps.timeoutMs } : {}),
      })
    case 'openai':
      return createOpenAIProvider({
        model: config.model,
        credential: config.credential,
        baseUrl: config.baseUrl,
        contextProfile: config.contextProfile,
        ...(deps.openaiClient ? { client: deps.openaiClient } : {}),
        ...(deps.fetch ? { fetch: deps.fetch } : {}),
        ...(deps.timeoutMs ? { timeoutMs: deps.timeoutMs } : {}),
      })
  }
}
