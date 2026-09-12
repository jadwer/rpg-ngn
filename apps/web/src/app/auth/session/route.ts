import { ApiError, createApiClient } from '@rpg-ngn/api-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiTarget, clearSessionCookie, csrfOk, DEVICE_NAME, readSessionToken, setSessionCookie } from '../../../server/apiProxy'

/**
 * POST /auth/session {email, password}: entra por la API en modo token y
 * guarda el token en la cookie httpOnly; devuelve el usuario.
 * DELETE /auth/session: revoca el token en la API y borra la cookie.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!csrfOk(request)) return NextResponse.json({ error: 'Petición rechazada.' }, { status: 403 })

  let payload: { email?: unknown; password?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!email || !password) return NextResponse.json({ error: 'Correo y contraseña son obligatorios.' }, { status: 422 })

  const api = createApiClient({ baseUrl: apiTarget(), tokenProvider: () => null })
  try {
    const result = await api.login(email, password, DEVICE_NAME)
    const response = NextResponse.json({ user: result.user, expiresAt: result.expiresAt })
    setSessionCookie(response, request, result.token, result.expiresAt)
    return response
  } catch (caught) {
    return failure(caught)
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!csrfOk(request)) return NextResponse.json({ error: 'Petición rechazada.' }, { status: 403 })
  const token = readSessionToken(request)
  if (token) {
    const api = createApiClient({ baseUrl: apiTarget(), tokenProvider: () => token })
    await api.logout().catch(() => undefined)
  }
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response, request)
  return response
}

export function failure(caught: unknown): NextResponse {
  if (caught instanceof ApiError) {
    const status = caught.status > 0 ? caught.status : 502
    const body = caught.body && typeof caught.body === 'object' ? (caught.body as Record<string, unknown>) : {}
    return NextResponse.json({ ...body, error: caught.message }, { status })
  }
  return NextResponse.json({ error: caught instanceof Error ? caught.message : 'Error desconocido.' }, { status: 500 })
}
