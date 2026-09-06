import { portraits } from '../generated/pilot-portraits'

/** Fuente de imagen para un `portrait` del pack, o null si no esta empaquetado. */
export function portraitSource(path: string | null | undefined): number | null {
  if (!path) return null
  return portraits[path] ?? null
}
