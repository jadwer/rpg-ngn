import { describe, expect, it } from 'vitest'
import { clampZoom, fingersFrom, ZOOM_IDENTITY, ZOOM_MAX, zoomGesture, zoomStep } from './map-zoom.js'

describe('zoom del mapa', () => {
  it('no baja de 1, no pasa del maximo y no deja ver fuera de la imagen', () => {
    expect(clampZoom({ s: 0.5, x: 30, y: 30 }, 300, 200)).toEqual({ s: 1, x: 0, y: 0 })
    expect(clampZoom({ s: 9, x: 0, y: 0 }, 300, 200).s).toBe(ZOOM_MAX)
    expect(clampZoom({ s: 2, x: 999, y: -999 }, 300, 200)).toEqual({ s: 2, x: 150, y: -100 })
  })

  it('los botones acercan y alejan desde el centro', () => {
    const z = zoomStep(ZOOM_IDENTITY, 1.5, 300, 200)
    expect(z.s).toBe(1.5)
    expect(zoomStep(z, 1 / 1.5, 300, 200)).toEqual({ s: 1, x: 0, y: 0 })
  })

  it('dos dedos que se separan acercan; uno arrastra solo si ya esta acercado', () => {
    const base = { ...ZOOM_IDENTITY, ...fingersFrom([{ x: 100, y: 100 }, { x: 200, y: 100 }]) }
    const pinch = zoomGesture(base, fingersFrom([{ x: 50, y: 100 }, { x: 250, y: 100 }]), 300, 200)
    expect(pinch?.s).toBe(2)

    const oneAtRest = { ...ZOOM_IDENTITY, ...fingersFrom([{ x: 10, y: 10 }]) }
    expect(zoomGesture(oneAtRest, fingersFrom([{ x: 60, y: 10 }]), 300, 200)).toEqual(ZOOM_IDENTITY)

    const oneZoomed = { s: 2, x: 0, y: 0, ...fingersFrom([{ x: 10, y: 10 }]) }
    expect(zoomGesture(oneZoomed, fingersFrom([{ x: 60, y: 30 }]), 300, 200)).toEqual({ s: 2, x: 50, y: 20 })
  })

  it('si cambia cuantos dedos hay, pide tomar la referencia de nuevo', () => {
    const base = { ...ZOOM_IDENTITY, ...fingersFrom([{ x: 10, y: 10 }]) }
    expect(zoomGesture(base, fingersFrom([{ x: 10, y: 10 }, { x: 90, y: 10 }]), 300, 200)).toBeNull()
  })
})
