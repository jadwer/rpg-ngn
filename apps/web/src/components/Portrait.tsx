import { portraitUrl } from '../lib/pack'

interface Props {
  path: string | null | undefined
  name: string
  size?: number | undefined
  /** Escala de grises: personaje fuera de la mesa. */
  muted?: boolean | undefined
  className?: string | undefined
}

/** Retrato del pack o la inicial del nombre si no hay imagen. */
export function Portrait({ path, name, size, muted = false, className }: Props) {
  const url = portraitUrl(path)
  const style = size ? { width: size, height: size, fontSize: size * 0.45 } : undefined
  const classes = ['portrait', muted ? 'muted' : '', className ?? ''].filter(Boolean).join(' ')
  if (url) {
    // <img> a proposito: los retratos son estaticos del pack y next/image no aporta nada en la LAN.
    return <img className={classes} src={url} alt={`Retrato de ${name}`} style={style} loading="lazy" />
  }
  return (
    <span className={`${classes} placeholder`} style={style} aria-label={`Sin retrato de ${name}`}>
      {name.charAt(0)}
    </span>
  )
}
