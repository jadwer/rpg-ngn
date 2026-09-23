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
