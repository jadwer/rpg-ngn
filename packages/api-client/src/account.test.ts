import { describe, expect, it } from 'vitest'
import { createApiClient } from './client.js'
import { ApiError } from './errors.js'
import type { FetchLike, HttpRequestInit } from './http.js'
import { providerChoice, withProvider } from './settings.js'

interface Call {
  url: string
  init: HttpRequestInit
}

function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>) {
  const calls: Call[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init })
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    const spec = routes[`${init.method} ${path}`]
    if (!spec) return { status: 404, ok: false, headers: { get: () => null }, text: async () => JSON.stringify({ error: `sin ruta para ${init.method} ${path}` }) }
    const status = spec.status ?? 200
    return { status, ok: status >= 200 && status < 300, headers: { get: () => 'application/json' }, text: async () => (spec.body === undefined ? '' : JSON.stringify(spec.body)) }
  }
  return { fetch, calls }
}

function client(routes: Parameters<typeof fakeFetch>[0], token: string | null = 'tok') {
  const { fetch, calls } = fakeFetch(routes)
  return { api: createApiClient({ baseUrl: 'http://api.test', tokenProvider: () => token, fetch }), calls }
}

describe('cuenta', () => {
  it('registra en modo token y devuelve token y usuario', async () => {
    const { api, calls } = client({ 'POST /api/auth/register': { status: 201, body: { message: 'Cuenta creada.', token: '7|xyz', expires_at: null, user: { id: 9, name: 'Lucía', email: 'lucia@example.com' } } } }, null)
    const result = await api.register({ name: ' Lucía ', email: ' lucia@example.com ', password: 'clave-larga', passwordConfirmation: 'clave-larga' }, 'web-rpg-ngn')
    expect(result).toEqual({ kind: 'token', token: '7|xyz', expiresAt: null, user: { id: '9', name: 'Lucía', email: 'lucia@example.com' } })
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ name: 'Lucía', email: 'lucia@example.com', password: 'clave-larga', password_confirmation: 'clave-larga', device_name: 'web-rpg-ngn' })
    expect(calls[0]?.init.headers['Authorization']).toBeUndefined()
  })

  it('con verificacion de correo el registro no trae token', async () => {
    const { api } = client({ 'POST /api/auth/register': { status: 201, body: { message: 'Cuenta creada. Verifica tu correo electronico para continuar.', email_verified: false } } }, null)
    const result = await api.register({ name: 'Lucía', email: 'lucia@example.com', password: 'clave-larga', passwordConfirmation: 'clave-larga' }, 'web')
    expect(result).toEqual({ kind: 'verify', message: 'Cuenta creada. Verifica tu correo electronico para continuar.' })
  })

  it('edita el nombre y cambia la contraseña', async () => {
    const { api, calls } = client({
      'PATCH /api/v1/profile': { body: { data: { type: 'users', id: '4', attributes: { name: 'Jazmín', email: 'jaz@example.com' } } } },
      'PATCH /api/v1/profile/password': { body: { message: 'ok' } },
    })
    expect(await api.updateProfile({ name: 'Jazmín ' })).toEqual({ id: '4', name: 'Jazmín', email: 'jaz@example.com' })
    await api.changePassword('password', 'nueva-clave', 'nueva-clave')
    expect(JSON.parse(calls[1]?.init.body ?? '{}')).toEqual({ current_password: 'password', password: 'nueva-clave', password_confirmation: 'nueva-clave' })
  })

  it('busca por correo exacto y devuelve null si no existe', async () => {
    const { api, calls } = client({
      'GET /api/v1/users/lookup?email=armando%40example.com': { body: { data: { id: '3', name: 'Armando', email: 'armando@example.com' } } },
      'GET /api/v1/users/lookup?email=nadie%40example.com': { status: 404, body: { error: 'No hay ninguna cuenta con ese correo.' } },
      'GET /api/v1/users/lookup?email=x%40y.z': { status: 429, body: { message: 'Too Many Attempts.' } },
    })
    expect(await api.lookupUser(' armando@example.com')).toEqual({ id: '3', name: 'Armando', email: 'armando@example.com' })
    expect(await api.lookupUser('nadie@example.com')).toBeNull()
    expect(calls[0]?.init.headers['Authorization']).toBe('Bearer tok')
    await expect(api.lookupUser('x@y.z')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('ajustes de la mesa', () => {
  it('lista presets, prueba el elegido y guarda settings entero', async () => {
    const { api, calls } = client({
      'GET /api/v1/dm/presets': { body: { data: [{ name: 'scripted', kind: 'scripted', model: null, configured: true, default: false }, { name: 'anthropic', kind: 'anthropic', model: 'claude-sonnet-5', configured: true, default: true }], meta: { default: 'anthropic' } } },
      'POST /api/v1/tables/2/dm/probe': { body: { data: { ok: true, preset: 'anthropic', provider: 'anthropic', model: 'claude-haiku-4-5', message: 'disponible' } } },
      'PATCH /api/v1/tables/2': { body: { data: { type: 'tables', id: '2', attributes: { settings: { premise: 'Llueve.', provider: { preset: 'anthropic', model: 'claude-haiku-4-5' } } } } } },
    })
    const presets = await api.listDmPresets()
    expect(presets.defaultPreset).toBe('anthropic')
    expect(presets.presets.map((p) => p.name)).toEqual(['scripted', 'anthropic'])

    const probe = await api.probeDm(2, { preset: 'anthropic', model: 'claude-haiku-4-5' })
    expect(probe.ok).toBe(true)
    expect(JSON.parse(calls[1]?.init.body ?? '{}')).toEqual({ preset: 'anthropic', model: 'claude-haiku-4-5' })

    const saved = await api.updateTableSettings(2, withProvider({ premise: 'Llueve.' }, { preset: 'anthropic', model: 'claude-haiku-4-5' }))
    expect(JSON.parse(calls[2]?.init.body ?? '{}')).toEqual({ data: { type: 'tables', id: '2', attributes: { settings: { premise: 'Llueve.', provider: { preset: 'anthropic', model: 'claude-haiku-4-5' } } } } })
    expect(calls[2]?.init.headers['Content-Type']).toBe('application/vnd.api+json')
    expect(providerChoice(saved)).toEqual({ preset: 'anthropic', model: 'claude-haiku-4-5' })
  })

  it('interpreta el proveedor de la mesa, incluida la forma vieja del guion', () => {
    expect(providerChoice(null)).toBeNull()
    expect(providerChoice({ premise: 'x' })).toBeNull()
    expect(providerChoice({ provider: { kind: 'scripted', script: {} } })).toEqual({ preset: 'scripted', model: null })
    expect(providerChoice({ provider: { preset: 'ollama', model: ' llama3.1:8b ' } })).toEqual({ preset: 'ollama', model: 'llama3.1:8b' })
    expect(withProvider({ premise: 'x', provider: { preset: 'ollama' } }, null)).toEqual({ premise: 'x' })
    expect(withProvider(undefined, { preset: 'scripted', model: null })).toEqual({ provider: { preset: 'scripted' } })
  })
})
