import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Lado servidor de la web (entrega 5b): el token de Sanctum vive en una
 * cookie httpOnly que el navegador no puede leer, y los route handlers de
 * `/api/*` la convierten en `Authorization: Bearer` al reenviar a la API
 * (`API_PROXY_TARGET`). El navegador nunca ve el token.
 *
 * CSRF: la cookie es SameSite=Lax, asi que un sitio ajeno no la manda en
 * POST; ademas toda peticion que cambie estado debe traer la cabecera
 * `X-Requested-With: rpg-ngn-web`, que un formulario HTML no puede poner y
 * que en un fetch de otro origen dispara un preflight que Next no autoriza.
 */

export const SESSION_COOKIE = 'rpg_session'
export const CSRF_HEADER = 'x-requested-with'
export const CSRF_VALUE = 'rpg-ngn-web'
export const DEVICE_NAME = 'web-rpg-ngn'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** A donde reenvia Next. Sin barra final; por defecto la API local en 8010. */
export function apiTarget(): string {
  return (process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:8010').replace(/\/+$/, '')
}

export function isSecure(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')
  return (forwarded ?? request.nextUrl.protocol.replace(':', '')) === 'https'
}

export function readSessionToken(request: NextRequest): string | null {
  const value = request.cookies.get(SESSION_COOKIE)?.value
  return value && value.length > 0 ? value : null
}

export function setSessionCookie(response: NextResponse, request: NextRequest, token: string, expiresAt: string | null): void {
  const expiry = expiresAt ? new Date(expiresAt) : null
  const maxAge = expiry && !Number.isNaN(expiry.getTime()) ? Math.max(60, Math.floor((expiry.getTime() - Date.now()) / 1000)) : 60 * 60 * 24 * 30
  response.cookies.set({ name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: 'lax', secure: isSecure(request), path: '/', maxAge })
}

export function clearSessionCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure: isSecure(request), path: '/', maxAge: 0 })
}

export function csrfOk(request: NextRequest): boolean {
  return SAFE_METHODS.has(request.method) || request.headers.get(CSRF_HEADER) === CSRF_VALUE
}

/** Cabeceras que viajan tal cual del navegador a la API. */
const FORWARDED = ['accept', 'content-type', 'idempotency-key', 'accept-language']

/**
 * Reenvia una peticion a la API con el token de la cookie (si hay) como
 * Bearer. Si el navegador ya trae su propio `Authorization` (modo API
 * directa no pasa por aqui, pero un cliente externo si podria), se respeta.
 */
export async function forwardToApi(request: NextRequest, path: string): Promise<NextResponse> {
  const headers = new Headers()
  for (const name of FORWARDED) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('accept')) headers.set('accept', 'application/json')

  const own = request.headers.get('authorization')
  const token = readSessionToken(request)
  if (own) headers.set('authorization', own)
  else if (token) headers.set('authorization', `Bearer ${token}`)

  const forwardedFor = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor)

  const body = SAFE_METHODS.has(request.method) ? undefined : await request.text()
  const url = `${apiTarget()}${path}${request.nextUrl.search}`

  let upstream: Response
  try {
    upstream = await fetch(url, { method: request.method, headers, body: body && body.length > 0 ? body : null, redirect: 'manual', cache: 'no-store' })
  } catch (error) {
    return NextResponse.json({ error: `No hay conexión con la API (${apiTarget()}): ${(error as Error).message}` }, { status: 502 })
  }

  const text = await upstream.text()
  const response = new NextResponse(text, { status: upstream.status })
  const type = upstream.headers.get('content-type')
  if (type) response.headers.set('content-type', type)
  response.headers.set('cache-control', 'no-store')
  return response
}
