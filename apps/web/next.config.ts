import type { NextConfig } from 'next'

/**
 * La web habla con la API por su propio origen: `/api/*` se reenvia a
 * `API_PROXY_TARGET` (por defecto la API local en 8010). Asi una laptop de
 * la LAN o un iPhone entran por `http://<ip>:3010` sin tocar el CORS de la
 * API. Si el usuario escribe otra URL de API en la pantalla de acceso, el
 * navegador le pega directo y entonces si aplica `CORS_ALLOWED_ORIGINS`.
 */
const target = (process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:8010').replace(/\/+$/, '')

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${target}/api/:path*` }]
  },
}

export default config
