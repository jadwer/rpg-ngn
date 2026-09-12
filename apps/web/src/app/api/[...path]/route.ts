import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { csrfOk, forwardToApi } from '../../../server/apiProxy'

/**
 * `/api/*` de la web reenvia a la API con el token de la cookie httpOnly
 * como Bearer (ver server/apiProxy.ts). Sustituye al rewrite de Next, que
 * no puede tocar cabeceras. Sin cache: son datos de la mesa.
 */

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, context: Context): Promise<NextResponse> {
  if (!csrfOk(request)) {
    return NextResponse.json({ error: 'Petición rechazada: falta la cabecera de la web.' }, { status: 403 })
  }
  const { path } = await context.params
  return forwardToApi(request, `/api/${path.map(encodeURIComponent).join('/')}`)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const PUT = handle
export const DELETE = handle
