'use client'

export type GamePanel = 'sheets' | 'map' | 'players' | 'host' | 'more'

interface Props {
  active: GamePanel | null
  onSelect: (panel: GamePanel) => void
  hasMap: boolean
  isHost: boolean
  /** Bajo "Jugadores": "2 de 4 listos", "Calder está escribiendo". */
  playersSummary: string
  /** Donde va: al pie en el telefono, en la cabecera en escritorio. La misma barra dos veces; el CSS enseña una. */
  placement: 'bottom' | 'header'
}

const ICONS: Record<GamePanel, string> = {
  sheets: 'M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1v5h5M8 13h8M8 17h8',
  map: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  players: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1',
  host: 'M3 18h18M4 17l1.5-9 4.5 4 2-6 2 6 4.5-4L20 17',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

const LABELS: Record<GamePanel, string> = { sheets: 'Fichas', map: 'Mapa', players: 'Jugadores', host: 'Anfitrión', more: 'Más' }

/**
 * La barra del juego (docs/18, D-UX-6): lo que se abre durante la partida,
 * separado de la navegacion del sitio. Al pie en 390 px, en la cabecera en
 * escritorio. Un solo elemento activo; tocarlo otra vez lo cierra.
 */
export function GameBar({ active, onSelect, hasMap, isHost, playersSummary, placement }: Props) {
  const items: GamePanel[] = ['sheets', ...(hasMap ? (['map'] as const) : []), 'players', ...(isHost ? (['host'] as const) : []), 'more']
  return (
    <nav className={`gamebar ${placement === 'bottom' ? 'at-bottom' : 'in-header'} hide-on-screen`} aria-label="Partida">
      {items.map((item) => (
        <button key={item} type="button" aria-pressed={active === item} onClick={() => onSelect(item)} title={item === 'players' ? playersSummary : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={ICONS[item]} />
          </svg>
          <span className="l">{LABELS[item]}</span>
          {item === 'players' ? <span className="s">{playersSummary}</span> : null}
        </button>
      ))}
    </nav>
  )
}
