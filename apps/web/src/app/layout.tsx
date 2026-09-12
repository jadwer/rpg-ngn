import type { Metadata, Viewport } from 'next'
import { Cinzel, Crimson_Pro } from 'next/font/google'
import type { ReactNode } from 'react'
import { NarratorProvider } from '../lib/narrator'
import { SessionProvider } from '../lib/session'
import './globals.css'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-cinzel', display: 'swap' })
const crimson = Crimson_Pro({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-crimson', display: 'swap' })

export const APP_NAME = 'rpg-ngn'

export const metadata: Metadata = {
  title: { default: `${APP_NAME}, la mesa de rol con DM de IA`, template: `%s | ${APP_NAME}` },
  applicationName: APP_NAME,
  description: 'Mesas de rol con amigos y un director de juego asistido por inteligencia artificial, en el navegador.',
  appleWebApp: { title: APP_NAME, statusBarStyle: 'black-translucent', capable: true },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#17120e',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${cinzel.variable} ${crimson.variable}`}>
      <body>
        <SessionProvider>
          <NarratorProvider>{children}</NarratorProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
