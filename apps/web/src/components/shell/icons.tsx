/** Iconos de trazo del marco comun (24x24), en la linea de los de la portada. */
export const SHELL_ICON = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  mundos: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c-3 3-3 15 0 18m0-18c3 3 3 15 0 18M3 12h18M5 7.5h14M5 16.5h14',
  misMundos: 'M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5zM12 6v13.5',
  mesas: 'M4 5h16v11H4zM2 19h20M9 9h6m-6 3h4',
  campanas: 'M12 3 20 6v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  personajes: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1',
  amigos: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7-1a2.5 2.5 0 1 0 0-5M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1m2-6h1a4 4 0 0 1 4 4v2',
  comunidad: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 20v-1a5 5 0 0 1 10 0v1M1.5 18v-.5a3.5 3.5 0 0 1 4.2-3.4M22.5 18v-.5a3.5 3.5 0 0 0-4.2-3.4',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h5l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4',
  avisos: 'M6 17V11a6 6 0 1 1 12 0v6l2 2H4zm4 3a2 2 0 0 0 4 0',
  mas: 'M12 5v14M5 12h14',
  enlace: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
  jugar: 'M7 4.5v15L19.5 12z',
  opciones: 'M5 12h.01M12 12h.01M19 12h.01',
  orden: 'M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3',
} as const

export type ShellIconName = keyof typeof SHELL_ICON

export function ShellIcon({ name, className }: { name: ShellIconName; className?: string | undefined }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'shell-icon'} aria-hidden>
      <path d={SHELL_ICON[name]} />
    </svg>
  )
}
