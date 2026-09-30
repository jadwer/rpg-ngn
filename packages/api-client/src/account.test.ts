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
    const result = await api.register({ name: ' Lucía ', email: ' lucia@example.com ', password: 'clave-larga', passwordConfirmation: 'clave-larga', ageConfirmed: true }, 'web-rpg-ngn')
    expect(result).toEqual({ kind: 'token', token: '7|xyz', expiresAt: null, user: { id: '9', name: 'Lucía', email: 'lucia@example.com' } })
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ name: 'Lucía', email: 'lucia@example.com', password: 'clave-larga', password_confirmation: 'clave-larga', age_confirmed: true, device_name: 'web-rpg-ngn' })
    expect(calls[0]?.init.headers['Authorization']).toBeUndefined()
  })

  it('cambia la contraseña con el token del correo, sin sesion iniciada', async () => {
    const { api, calls } = client({ 'POST /api/auth/reset-password': { body: { message: 'Contrasena restablecida correctamente.' } } }, null)

    const mensaje = await api.resetPassword({ token: 'tok-del-correo', email: ' lucia@example.com ', password: 'clave-nueva', passwordConfirmation: 'clave-nueva' })

    expect(mensaje).toBe('Contrasena restablecida correctamente.')
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ token: 'tok-del-correo', email: 'lucia@example.com', password: 'clave-nueva', password_confirmation: 'clave-nueva' })
    // Quien cambia la contraseña no ha entrado todavia: nunca manda token.
    expect(calls[0]?.init.headers['Authorization']).toBeUndefined()
  })

  it('borra la cuenta mandando la contraseña, y devuelve lo que dice el servidor', async () => {
    const { api, calls } = client({ 'DELETE /api/v1/profile': { body: { meta: { message: 'Cuenta borrada. Lo que escribiste se conserva sin tu nombre.' } } } })

    const mensaje = await api.deleteAccount('mi-clave')

    expect(mensaje).toContain('sin tu nombre')
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ password: 'mi-clave' })
  })

  it('con verificacion de correo el registro no trae token', async () => {
    const { api } = client({ 'POST /api/auth/register': { status: 201, body: { message: 'Cuenta creada. Verifica tu correo electronico para continuar.', email_verified: false } } }, null)
    const result = await api.register({ name: 'Lucía', email: 'lucia@example.com', password: 'clave-larga', passwordConfirmation: 'clave-larga', ageConfirmed: true }, 'web')
    expect(result).toEqual({ kind: 'verify', message: 'Cuenta creada. Verifica tu correo electronico para continuar.' })
  })

  it('edita el nombre y cambia la contraseña', async () => {
    const { api, calls } = client({
      'PATCH /api/v1/profile': { body: { data: { type: 'users', id: '4', attributes: { name: 'Jazmín', email: 'jaz@example.com' } } } },
      'PATCH /api/v1/profile/password': { body: { message: 'ok' } },
    })
    // Una API vieja sin `emailVerified` se lee como verificado: no alarma sin motivo.
    expect(await api.updateProfile({ name: 'Jazmín ' })).toEqual({ id: '4', name: 'Jazmín', email: 'jaz@example.com', emailVerified: true })
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ name: 'Jazmín' })
    await api.changePassword('password', 'nueva-clave', 'nueva-clave')
    expect(JSON.parse((calls[1]?.init.body as string | undefined) ?? '{}')).toEqual({ current_password: 'password', password: 'nueva-clave', password_confirmation: 'nueva-clave' })
  })

  it('cambiar el correo lo manda recortado y avisa de que queda sin verificar', async () => {
    const { api, calls } = client({
      'PATCH /api/v1/profile': { body: { data: { type: 'users', id: '4', attributes: { name: 'Jaz', email: 'zahira@example.com', emailVerified: false } } } },
    })

    expect(await api.updateProfile({ name: 'Jaz', email: ' zahira@example.com ' })).toEqual({ id: '4', name: 'Jaz', email: 'zahira@example.com', emailVerified: false })
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ name: 'Jaz', email: 'zahira@example.com' })
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
      'GET /api/v1/gm/presets': { body: { data: [{ name: 'scripted', kind: 'scripted', model: null, configured: true, default: false }, { name: 'anthropic', kind: 'anthropic', model: 'claude-sonnet-5', configured: true, default: true }], meta: { default: 'anthropic' } } },
      'POST /api/v1/tables/2/gm/probe': { body: { data: { ok: true, preset: 'anthropic', provider: 'anthropic', model: 'claude-haiku-4-5', message: 'disponible' } } },
      'PATCH /api/v1/tables/2': { body: { data: { type: 'tables', id: '2', attributes: { settings: { premise: 'Llueve.', provider: { preset: 'anthropic', model: 'claude-haiku-4-5' } } } } } },
    })
    const presets = await api.listGmPresets()
    expect(presets.defaultPreset).toBe('anthropic')
    expect(presets.presets.map((p) => p.name)).toEqual(['scripted', 'anthropic'])

    const probe = await api.probeGm(2, { preset: 'anthropic', model: 'claude-haiku-4-5' })
    expect(probe.ok).toBe(true)
    expect(JSON.parse((calls[1]?.init.body as string | undefined) ?? '{}')).toEqual({ preset: 'anthropic', model: 'claude-haiku-4-5' })

    const saved = await api.updateTableSettings(2, withProvider({ premise: 'Llueve.' }, { preset: 'anthropic', model: 'claude-haiku-4-5' }))
    expect(JSON.parse((calls[2]?.init.body as string | undefined) ?? '{}')).toEqual({ data: { type: 'tables', id: '2', attributes: { settings: { premise: 'Llueve.', provider: { preset: 'anthropic', model: 'claude-haiku-4-5' } } } } })
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

  it('manda el idioma elegido en X-Locale para que la API conteste en el', async () => {
    const calls: Array<{ init: { headers: Record<string, string> } }> = []
    const fetch = async (_url: string, init: { headers: Record<string, string> }) => {
      calls.push({ init })
      return { ok: true, status: 200, json: async () => ({ message: 'ok' }), text: async () => '' }
    }
    const api = createApiClient({ baseUrl: 'http://api.test', tokenProvider: () => null, fetch: fetch as never, locale: () => 'en' })
    await api.forgotPassword('ana@example.com')
    expect(calls[0]?.init.headers['X-Locale']).toBe('en')
  })
})

describe('soporte', () => {
  const ticket = { id: 5, subject: 'No carga el turno', status: 'open', priority: 'normal', about: { type: 'table', id: '12', label: 'La posada', url: null }, lastMessageAt: null, resolvedAt: null, createdAt: null, messages: [] }

  it('abre un reporte sin mandar el asunto vacio', async () => {
    const { api, calls } = client({ 'POST /api/v1/support/tickets': { status: 201, body: { data: ticket } } })
    const creado = await api.createSupportTicket({ subject: '  ', message: ' No carga el turno de la mesa. ', about: { type: 'table', id: '12' }, context: { app: 'web' } })
    expect(creado.id).toBe(5)
    expect(JSON.parse((calls[0]?.init.body as string | undefined) ?? '{}')).toEqual({ message: 'No carga el turno de la mesa.', about: { type: 'table', id: '12' }, context: { app: 'web' } })
  })

  it('lista, lee y responde', async () => {
    const { api, calls } = client({
      'GET /api/v1/support/tickets': { body: { data: [ticket] } },
      'GET /api/v1/support/tickets/5': { body: { data: ticket } },
      'POST /api/v1/support/tickets/5/messages': { body: { data: { ...ticket, status: 'open' } } },
    })
    expect(await api.supportTickets()).toHaveLength(1)
    expect((await api.supportTicket(5)).subject).toBe('No carga el turno')
    await api.replySupportTicket(5, ' Gracias ')
    expect(JSON.parse((calls[2]?.init.body as string | undefined) ?? '{}')).toEqual({ body: 'Gracias' })
  })

  it('el 429 llega como ApiError con el mensaje del servidor', async () => {
    const { api } = client({ 'POST /api/v1/support/tickets': { status: 429, body: { error: 'Enviaste muchos reportes en la última hora.' } } })
    await expect(api.createSupportTicket({ message: 'No carga el turno.' })).rejects.toMatchObject({ status: 429, message: 'Enviaste muchos reportes en la última hora.' })
  })
})
