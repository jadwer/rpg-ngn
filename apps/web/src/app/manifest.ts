import type { MetadataRoute } from 'next'

/**
 * Manifest de la web instalable. Hace falta para los avisos en iPhone: Safari
 * solo deja recibir push a una web agregada a la pantalla de inicio. Los
 * colores son los de la paleta (docs/22).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ad Astra Mentis',
    short_name: 'Ad Astra',
    description: 'Mesas de rol con un director de juego que narra por ti.',
    start_url: '/mesas',
    display: 'standalone',
    background_color: '#0b0f14',
    theme_color: '#0b0f14',
    lang: 'es',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
