/**
 * Recurso acotado (HP, usos de una capacidad, energia). core no sabe que es
 * HP; el ruleset decide que recursos existen y cuando se gastan.
 */
export interface Resource {
  current: number
  max: number
}

export function resource(max: number, current = max): Resource {
  if (!Number.isInteger(max) || max < 0) {
    throw new RangeError(`resource: max debe ser un entero no negativo, llego ${String(max)}`)
  }
  return { current: clamp(current, 0, max), max }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Resta `amount` sin bajar de 0. */
export function spend(r: Resource, amount: number): Resource {
  assertAmount(amount)
  return { ...r, current: clamp(r.current - amount, 0, r.max) }
}

/** Suma `amount` sin pasar de max. */
export function restore(r: Resource, amount: number): Resource {
  assertAmount(amount)
  return { ...r, current: clamp(r.current + amount, 0, r.max) }
}

/** Cambio con signo: negativo gasta, positivo restaura. */
export function adjust(r: Resource, delta: number): Resource {
  return delta < 0 ? spend(r, -delta) : restore(r, delta)
}

export function isDepleted(r: Resource): boolean {
  return r.current <= 0
}

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`la cantidad debe ser un entero no negativo, llego ${String(amount)}`)
  }
}
