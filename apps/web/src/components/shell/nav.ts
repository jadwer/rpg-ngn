import type { MessageKey } from '@rpg-ngn/i18n'
import type { ShellIconName } from './icons'

export interface NavItem {
  href: string
  /** Clave del texto (i18n): se pinta con t() en el idioma vigente. */
  label: MessageKey
  icon: ShellIconName
  /** Rutas que tambien marcan esta entrada como activa. */
  match?: readonly string[]
}

/**
 * Las secciones del sitio, una sola lista (26-09): la barra lateral, la
 * hamburguesa dentro de la mesa y la del telefono salen de aqui, asi que el
 * menu es el mismo en todas partes.
 */
export const SITE_SECTIONS: readonly NavItem[] = [
  { href: '/', label: 'shell.nav.home', icon: 'inicio' },
  { href: '/mundos/explorar', label: 'shell.nav.exploreWorlds', icon: 'mundos' },
  { href: '/mundos', label: 'shell.nav.myWorlds', icon: 'misMundos' },
  { href: '/mesas', label: 'shell.nav.myTables', icon: 'mesas' },
  { href: '/tienda', label: 'shell.nav.shop', icon: 'tienda' },
  { href: '/pronto/campanas', label: 'shell.nav.campaigns', icon: 'campanas' },
  { href: '/pronto/personajes', label: 'shell.nav.characters', icon: 'personajes' },
  { href: '/comunidad', label: 'shell.nav.friends', icon: 'amigos' },
]

/** Lo de la cuenta: va en el menu del avatar y al pie de la hamburguesa. */
export const ACCOUNT_ITEMS: readonly NavItem[] = [
  { href: '/perfil', label: 'shell.nav.account', icon: 'ajustes' },
  { href: '/ajustes', label: 'shell.nav.voice', icon: 'avisos' },
  { href: '/guia', label: 'shell.nav.hostGuide', icon: 'misMundos' },
]

export function isActive(item: NavItem, path: string): boolean {
  // Un ancla (Amigos, dentro de Mesas) nunca marca: ya la marca su pagina.
  if (item.href.includes('#')) return false
  const base = item.href
  if (base === '/') return path === '/'
  if (path === base) return true
  // Una ruta mas especifica gana: /mundos/explorar no marca "Mis mundos".
  if (base === '/mundos') return path === '/mundos'
  return (item.match ?? []).some((m) => path === m || path.startsWith(`${m}/`)) || path.startsWith(`${base}/`)
}
