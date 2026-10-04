import { join, resolve } from 'node:path'
import { ENGINE_CONTRACT_VERSION } from '@rpg-ngn/engine-contract'
import { describe, expect, it } from 'vitest'
import { createEngine } from './app.js'
import { PackStore } from './packs.js'

const TOKEN = 'token-de-prueba'
const app = createEngine({ token: TOKEN, packs: new PackStore(join(resolve(import.meta.dirname, '../../..'), 'content/packs')) })

describe('vocabularios del catalogo (docs/26, H8 y H9)', () => {
  it('cada vocabulario trae sus terminos con la etiqueta en español e ingles', async () => {
    const res = await app.request('/v1/vocabularies', { headers: { 'x-engine-token': TOKEN, 'x-engine-contract': String(ENGINE_CONTRACT_VERSION) } })
    expect(res.status).toBe(200)
    const { vocabularies } = (await res.json()) as { vocabularies: Array<{ slug: string; allowMultiple: boolean; terms: Array<{ slug: string; name: { es: string; en: string } }> }> }
    expect(vocabularies.map((v) => v.slug)).toEqual(['format', 'mode', 'session', 'genre', 'style'])
    const genre = vocabularies.find((v) => v.slug === 'genre')!
    expect(genre.allowMultiple).toBe(true)
    expect(genre.terms.find((t) => t.slug === 'ciencia-ficcion')?.name).toEqual({ es: 'Ciencia ficción', en: 'Science fiction' })
  })
})
