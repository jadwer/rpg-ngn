import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { faceRange, releasePlan, runDieRoll, sidesOf, spinFace } from './die-roll.js'

describe('die-roll', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('las caras que giran caben en el dado', () => {
    expect(faceRange('1d20')).toEqual({ min: 1, max: 20 })
    expect(faceRange('2d6')).toEqual({ min: 2, max: 12 })
    expect(faceRange('1d8+2')).toEqual({ min: 1, max: 8 })
    expect(faceRange('lo que sea')).toEqual({ min: 1, max: 20 })
    expect(sidesOf('2d6+1')).toBe(6)
    expect(sidesOf('nada')).toBe(20)
    expect(spinFace({ min: 2, max: 12 }, () => 0)).toBe(2)
    expect(spinFace({ min: 2, max: 12 }, () => 0.999)).toBe(12)
  })

  it('frena entre 1 y 5 segundos segun cuanto se mantuvo, en pasos que se alargan', () => {
    expect(releasePlan(0).totalMs).toBe(1000)
    expect(releasePlan(9000).totalMs).toBe(5000)
    const { steps, totalMs } = releasePlan(1500)
    expect(steps.reduce((a, b) => a + b, 0)).toBe(totalMs)
    expect(steps[0]!).toBeLessThan(steps[steps.length - 1]!)
  })

  it('aterriza en el numero del servidor solo cuando termino de frenar y el numero llego', async () => {
    const faces: number[] = []
    const landed = vi.fn()
    const resolved = vi.fn()
    let resolve!: (n: number) => void
    runDieRoll({
      die: '1d20',
      heldMs: 0,
      resolve: () => new Promise<number>((r) => (resolve = r)),
      onFace: (f) => faces.push(f),
      onResolved: resolved,
      onLanded: landed,
      onFailed: () => {
        throw new Error('no debia fallar')
      },
    })
    // Termina de frenar sin numero: no aterriza.
    await vi.advanceTimersByTimeAsync(1000)
    expect(faces.length).toBeGreaterThan(3)
    expect(landed).not.toHaveBeenCalled()
    // Llega el numero: aterriza en el, no en la ultima cara al azar.
    resolve(17)
    await vi.advanceTimersByTimeAsync(0)
    expect(resolved).toHaveBeenCalledWith(17)
    expect(landed).toHaveBeenCalledWith(17)
    expect(landed).toHaveBeenCalledTimes(1)
  })

  it('si el numero llega antes de parar, avisa al momento (para un dado fisico) y aterriza al parar', async () => {
    const landed = vi.fn()
    const resolved = vi.fn()
    runDieRoll({ die: '1d6', heldMs: 0, resolve: () => Promise.resolve(4), onFace: () => {}, onResolved: resolved, onLanded: landed, onFailed: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    expect(resolved).toHaveBeenCalledWith(4)
    expect(landed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(landed).toHaveBeenCalledWith(4)
  })

  it('si el servidor falla, no aterriza y avisa; cancelar corta todo', async () => {
    const failed = vi.fn()
    const landed = vi.fn()
    runDieRoll({ die: '1d20', heldMs: 0, resolve: () => Promise.reject(new Error('409')), onFace: () => {}, onLanded: landed, onFailed: failed })
    await vi.advanceTimersByTimeAsync(1000)
    expect(failed).toHaveBeenCalled()
    expect(landed).not.toHaveBeenCalled()

    const faces = vi.fn()
    const cancel = runDieRoll({ die: '1d20', heldMs: 0, resolve: () => Promise.resolve(3), onFace: faces, onLanded: landed, onFailed: failed })
    cancel()
    await vi.advanceTimersByTimeAsync(1000)
    expect(faces).not.toHaveBeenCalled()
    expect(landed).not.toHaveBeenCalled()
  })
})
