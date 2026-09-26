/**
 * El calculo del zoom del mapa, igual en web y app (VAM 26-09, A3: estaba
 * escrito dos veces). Aqui no hay eventos: la web los saca de los punteros y
 * la app de los dedos, y los dos le pasan puntos.
 *
 * El lienzo se transforma con `translate(x, y) scale(s)` desde el centro; la
 * caja mide lo que la imagen, asi que los lugares en porcentaje no se mueven.
 */

export const ZOOM_MAX = 4
/** Lo que acerca o aleja cada boton. */
export const ZOOM_STEP = 1.5
/** Lo que acerca o aleja cada paso de la rueda (web). */
export const ZOOM_WHEEL = 1.15

export interface ZoomState {
  s: number
  x: number
  y: number
}

export const ZOOM_IDENTITY: ZoomState = { s: 1, x: 0, y: 0 }

/** Los dedos o punteros en pantalla: cuantos, su centro y la distancia entre los dos primeros. */
export interface Fingers {
  count: number
  cx: number
  cy: number
  dist: number
}

export function fingersFrom(points: ReadonlyArray<{ x: number; y: number }>): Fingers {
  const [a, b] = points
  if (!a) return { count: 0, cx: 0, cy: 0, dist: 0 }
  if (!b) return { count: points.length, cx: a.x, cy: a.y, dist: 0 }
  return { count: points.length, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) }
}

/** Entre 1 y ZOOM_MAX, y sin dejar ver fuera de la imagen. */
export function clampZoom(z: ZoomState, width: number, height: number): ZoomState {
  const s = Math.min(ZOOM_MAX, Math.max(1, z.s))
  const mx = ((s - 1) * width) / 2
  const my = ((s - 1) * height) / 2
  return { s, x: Math.min(mx, Math.max(-mx, z.x)), y: Math.min(my, Math.max(-my, z.y)) }
}

/** Botones y rueda: acerca o aleja desde el centro, conservando lo que se ve. */
export function zoomStep(z: ZoomState, factor: number, width: number, height: number): ZoomState {
  return clampZoom({ s: z.s * factor, x: z.x * factor, y: z.y * factor }, width, height)
}

/**
 * Un movimiento del gesto contra la referencia tomada al empezar (o al
 * cambiar cuantos dedos hay). Devuelve null cuando hay que tomar la
 * referencia de nuevo: cambio el numero de dedos.
 *
 * Dos dedos: pellizco y arrastre por su centro. Uno: arrastre, solo si esta
 * acercado. Sin zoom, un dedo no mueve nada.
 */
export function zoomGesture(base: ZoomState & Fingers, now: Fingers, width: number, height: number): ZoomState | null {
  if (now.count !== base.count) return null
  if (now.count >= 2 && base.dist > 0) {
    const s = (base.s * now.dist) / base.dist
    const k = Math.min(ZOOM_MAX, Math.max(1, s)) / base.s
    return clampZoom({ s, x: base.x * k + (now.cx - base.cx), y: base.y * k + (now.cy - base.cy) }, width, height)
  }
  if (now.count === 1 && base.s > 1) {
    return clampZoom({ s: base.s, x: base.x + (now.cx - base.cx), y: base.y + (now.cy - base.cy) }, width, height)
  }
  return { s: base.s, x: base.x, y: base.y }
}
