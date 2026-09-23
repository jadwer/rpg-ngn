import Link from 'next/link'
import { ISOTIPO, ISOTIPO_MINI, LOGO_HORIZONTAL, LOGO_VERTICAL, WORDMARK } from '../generated/brand'

/**
 * La marca como SVG en linea (img/branding, docs/22): el color lo pone el
 * CSS via `color`, asi que la misma marca vale sobre oscuro, sobre claro y en
 * monocromo. `mini` es el isotipo sin arco ni destellos, para tamaños chicos.
 */

interface MarkProps {
  className?: string | undefined
  /** Alto en px; el ancho sale de la proporcion. */
  height?: number | undefined
  title?: string | undefined
}

function Mark({ shape, className, height, title }: MarkProps & { shape: { viewBox: string; d: string } }) {
  const [, , w, h] = shape.viewBox.split(' ').map(Number)
  const style = height ? { height, width: Math.round((height * (w ?? 1)) / (h ?? 1)) } : undefined
  return (
    <svg className={className} viewBox={shape.viewBox} style={style} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path fill="currentColor" fillRule="evenodd" d={shape.d} />
    </svg>
  )
}

export const Isotipo = (p: MarkProps & { mini?: boolean | undefined }) => <Mark {...p} shape={p.mini ? ISOTIPO_MINI : ISOTIPO} />
export const Wordmark = (p: MarkProps) => <Mark {...p} shape={WORDMARK} />
export const LogoHorizontal = (p: MarkProps) => <Mark {...p} shape={LOGO_HORIZONTAL} />
export const LogoVertical = (p: MarkProps) => <Mark {...p} shape={LOGO_VERTICAL} />

/** Marca chica que lleva a la portada, para las cabeceras de entrar, crear cuenta y compañia. */
export function BrandMark({ height = 34 }: { height?: number | undefined }) {
  return (
    <Link href="/" className="brand-mark" aria-label="Ad Astra Mentis, portada">
      <LogoHorizontal height={height} title="Ad Astra Mentis" />
    </Link>
  )
}
