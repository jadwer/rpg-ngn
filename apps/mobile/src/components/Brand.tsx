import Svg, { Path } from 'react-native-svg'
import { ISOTIPO, LOGO_VERTICAL, WORDMARK } from '../generated/brand'
import { theme } from '../theme'

interface Props {
  /** Alto en puntos; el ancho sale de la proporcion del trazo. */
  height: number
  color?: string
}

function ratio(viewBox: string): number {
  const [, , w, h] = viewBox.split(' ').map(Number)
  return (w ?? 1) / (h ?? 1)
}

function Mark({ shape, height, color = theme.colors.ink }: Props & { shape: { viewBox: string; d: string } }) {
  return (
    <Svg width={height * ratio(shape.viewBox)} height={height} viewBox={shape.viewBox} accessibilityRole="image" accessibilityLabel="Ad Astra Mentis">
      <Path d={shape.d} fill={color} fillRule="evenodd" />
    </Svg>
  )
}

/** El libro con la estrella (docs/22): icono, preloader, cabeceras. */
export function Isotipo(props: Props) {
  return <Mark shape={ISOTIPO} {...props} />
}

/** Isotipo sobre "AD ASTRA MENTIS": la portada. */
export function LogoVertical(props: Props) {
  return <Mark shape={LOGO_VERTICAL} {...props} />
}

/** Solo el nombre. */
export function Wordmark(props: Props) {
  return <Mark shape={WORDMARK} {...props} />
}
