'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { StoredUser } from '../../lib/storage'
import { LogoHorizontal } from '../Brand'
import { SystemMenu } from '../SystemMenu'
import { ShellIcon, type ShellIconName } from './icons'

interface NavItem {
  href: string
  label: string
  icon: ShellIconName
  /** Rutas que tambien marcan esta entrada como activa. */
  match?: readonly string[]
}

/** La navegacion del tablero de Gabino (`img/design_ui_ux/mesas_ux.png`, 26-09). */
const TOP: readonly NavItem[] = [
  { href: '/', label: 'Historias', icon: 'inicio' },
  { href: '/mundos/explorar', label: 'Mundos', icon: 'mundos', match: ['/mundos'] },
  { href: '/mesas', label: 'Mesas', icon: 'mesas' },
  { href: '/pronto/comunidad', label: 'Comunidad', icon: 'comunidad' },
]

const SIDE: readonly NavItem[] = [
  { href: '/', label: 'Inicio', icon: 'inicio' },
  { href: '/mundos/explorar', label: 'Explorar mundos', icon: 'mundos' },
  { href: '/mundos', label: 'Mis mundos', icon: 'misMundos' },
  { href: '/mesas', label: 'Mis mesas', icon: 'mesas' },
  { href: '/pronto/campanas', label: 'Campañas', icon: 'campanas' },
  { href: '/pronto/personajes', label: 'Personajes', icon: 'personajes' },
  { href: '/mesas#amigos', label: 'Amigos', icon: 'amigos' },
]

/** En el telefono, abajo: las cuatro de siempre al alcance del pulgar. */
const BOTTOM: readonly NavItem[] = [
  { href: '/', label: 'Inicio', icon: 'inicio' },
  { href: '/mundos/explorar', label: 'Mundos', icon: 'mundos', match: ['/mundos'] },
  { href: '/mesas', label: 'Mesas', icon: 'mesas' },
  { href: '/pronto/comunidad', label: 'Comunidad', icon: 'comunidad' },
]

function isActive(item: NavItem, path: string): boolean {
  // Un ancla (Amigos, dentro de Mesas) nunca marca: ya la marca su pagina.
  if (item.href.includes('#')) return false
  const base = item.href
  if (base === '/') return path === '/'
  if (path === base) return true
  // Una ruta mas especifica del menu gana: /mundos/explorar no marca "Mis mundos".
  if (base === '/mundos') return path === '/mundos'
  return (item.match ?? []).some((m) => path === m || path.startsWith(`${m}/`)) || path.startsWith(`${base}/`)
}

interface Props {
  user: StoredUser
  onLogout: () => void
  children: ReactNode
  /** Fondo de la pantalla (`fondo-mesas`); la escena va arriba y el resto es oscuro. */
  background?: 'mesas' | null
}

/**
 * El marco de las pantallas con sesion fuera de la mesa de juego (26-09):
 * barra superior con el logo y la navegacion, lateral en escritorio y barra
 * inferior en el telefono. Lo que aun no existe lleva a "Pronto".
 */
export function AppShell({ user, onLogout, children, background = 'mesas' }: Props) {
  const path = usePathname() ?? '/'
  return (
    <div className={`shell${background ? ` fondo-${background}` : ''}`}>
      <header className="shell-top">
        <Link href="/" className="shell-logo" aria-label="Ad Astra Mentis, inicio">
          <LogoHorizontal height={34} />
        </Link>
        <nav className="shell-nav" aria-label="Principal">
          {TOP.map((item) => (
            <Link key={item.href} href={item.href} className={isActive(item, path) ? 'active' : undefined} aria-current={isActive(item, path) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="shell-actions">
          <Link href="/mundos/explorar" className="shell-iconbtn" aria-label="Buscar mundos">
            <ShellIcon name="buscar" />
          </Link>
          <Link href="/pronto/avisos" className="shell-iconbtn" aria-label="Avisos">
            <ShellIcon name="avisos" />
          </Link>
          <SystemMenu user={user} onLogout={onLogout} variant="avatar" />
        </div>
      </header>

      <div className="shell-body">
        <aside className="shell-side" aria-label="Secciones">
          <nav>
            {SIDE.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item, path) ? 'active' : undefined}>
                <ShellIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/perfil" className={`ajustes${path === '/perfil' ? ' active' : ''}`}>
            <ShellIcon name="ajustes" />
            Configuración
          </Link>
        </aside>
        <main className="shell-main">{children}</main>
      </div>

      <nav className="shell-bottom" aria-label="Principal">
        {BOTTOM.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item, path) ? 'active' : undefined}>
            <ShellIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
