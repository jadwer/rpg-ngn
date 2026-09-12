import { createApiClient } from '@rpg-ngn/api-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiTarget, csrfOk, DEVICE_NAME, setSessionCookie } from '../../../server/apiProxy'
import { failure } from '../session/route'

/**
 * POST /auth/register {name, email, password, passwordConfirmation}: crea
 * la cuenta por la API en modo token. Si la API devuelve token (verificacion
 * de correo apagada) queda en la cookie y se entra directo; si exige
 * verificar, devuelve el mensaje y no hay sesion todavia.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!csrfOk(request)) return NextResponse.json({ error: 'Petición rechazada.' }, { status: 403 })

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }
  const text = (key: string) => (typeof payload[key] === 'string' ? (payload[key] as string) : '')

  const api = createApiClient({ baseUrl: apiTarget(), tokenProvider: () => null })
  try {
    const result = await api.register({ name: text('name'), email: text('email'), password: text('password'), passwordConfirmation: text('passwordConfirmation') }, DEVICE_NAME)
    if (result.kind === 'verify') return NextResponse.json({ pendingVerification: true, message: result.message }, { status: 201 })
    const response = NextResponse.json({ user: result.user, expiresAt: result.expiresAt }, { status: 201 })
    setSessionCookie(response, request, result.token, result.expiresAt)
    return response
  } catch (caught) {
    return failure(caught)
  }
}
