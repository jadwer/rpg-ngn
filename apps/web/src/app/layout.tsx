import type { Metadata, Viewport } from 'next'
import { Cinzel, Crimson_Pro } from 'next/font/google'
import type { ReactNode } from 'react'
import { NarratorProvider } from '../lib/narrator'
import { SessionProvider } from '../lib/session'
import './globals.css'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-cinzel', display: 'swap' })
const crimson = Crimson_Pro({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-crimson', display: 'swap' })

export const APP_NAME = 'Ad Astra Mentis'

export const metadata: Metadata = {
  title: { default: `${APP_NAME}, worlds born from imagination`, template: `%s | ${APP_NAME}` },
  applicationName: APP_NAME,
  description: 'Tu imaginación también es un mundo. Mesas de rol con amigos y un director de juego que narra, tira los dados y recuerda, en el navegador.',
  appleWebApp: { title: APP_NAME, statusBarStyle: 'black-translucent', capable: true },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0f14',
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
