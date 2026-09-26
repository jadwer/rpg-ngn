import type { ShellIconName } from './icons'

export interface NavItem {
  href: string
  label: string
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
  { href: '/', label: 'Inicio', icon: 'inicio' },
  { href: '/mundos/explorar', label: 'Explorar mundos', icon: 'mundos' },
  { href: '/mundos', label: 'Mis mundos', icon: 'misMundos' },
  { href: '/mesas', label: 'Mis mesas', icon: 'mesas' },
  { href: '/pronto/campanas', label: 'Campañas', icon: 'campanas' },
  { href: '/pronto/personajes', label: 'Personajes', icon: 'personajes' },
  { href: '/mesas#amigos', label: 'Amigos', icon: 'amigos' },
]

/** Lo de la cuenta: va en el menu del avatar y al pie de la hamburguesa. */
export const ACCOUNT_ITEMS: readonly NavItem[] = [
  { href: '/perfil', label: 'Mi cuenta y créditos', icon: 'ajustes' },
  { href: '/ajustes', label: 'Voz', icon: 'avisos' },
  { href: '/guia', label: 'Guía del anfitrión', icon: 'misMundos' },
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
