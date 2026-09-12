import type { Metadata, Viewport } from 'next'
import { Cinzel, Crimson_Pro } from 'next/font/google'
import type { ReactNode } from 'react'
import { SessionProvider } from '../lib/session'
import './globals.css'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-cinzel', display: 'swap' })
const crimson = Crimson_Pro({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-crimson', display: 'swap' })

export const metadata: Metadata = {
  title: 'rpg-ngn',
  description: 'La mesa de rol con DM asistido por IA, en el navegador',
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
