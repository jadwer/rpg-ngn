import Svg, { Path } from 'react-native-svg'
import { theme } from '../theme'

/** Trazos de linea en 24x24, como los iconos del concepto (img/ideas_movil.png). */
export const ICON = {
  back: 'M15 5l-7 7 7 7',
  shield: 'M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6zm0 5v5m0 3h.01',
  send: 'M4 12l16-8-6 16-2.5-6.5z M11.5 13.5L20 4',
  dice: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l8 4.5 8-4.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  speak: 'M4 10v4h3l4 4V6L7 10zM15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7z',
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c-3 3-3 15 0 18m0-18c3 3 3 15 0 18M3 12h18M5 7.5h14M5 16.5h14',
  tables: 'M4 5h16v11H4zM2 19h20M9 9h6m-6 3h4',
  community: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 20v-1a5 5 0 0 1 10 0v1',
  plus: 'M12 5v14M5 12h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
} as const

interface Props {
  d: string
  size?: number
  color?: string
  strokeWidth?: number
}

export function Icon({ d, size = 20, color = theme.colors.ink, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
