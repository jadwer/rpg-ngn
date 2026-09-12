import type { NextConfig } from 'next'

/**
 * La web habla con la API por su propio origen: `/api/*` lo atiende el
 * route handler `src/app/api/[...path]/route.ts`, que reenvia a
 * `API_PROXY_TARGET` (por defecto la API local en 8010) poniendo el token
 * de la cookie httpOnly como Bearer. Asi una laptop de la LAN o un iPhone
 * entran por `http://<ip>:3010` sin CORS y sin token en el navegador. Si el
 * usuario escribe otra URL de API en la pantalla de acceso, el navegador le
 * pega directo con token en localStorage y entonces si aplica
 * `CORS_ALLOWED_ORIGINS`.
 */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
}

export default config
