import { describe, expect, it } from 'vitest'
import { bucketText, nextFreeTurnText, outOfTurnsText, waitLabel } from './turn-bucket.js'

const now = new Date('2026-09-29T12:00:00Z')
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()

describe('cubeta de turnos', () => {
  it('dice la espera en minutos u horas, nunca cero', () => {
    expect(waitLabel(at(42), now)).toBe('42 min')
    expect(waitLabel(at(72), now)).toBe('1 h 12 min')
    expect(waitLabel(at(120), now)).toBe('2 h')
    expect(waitLabel(at(-5), now)).toBe('1 min')
  })

  it('anuncia el siguiente turno gratuito solo si hay espera', () => {
    expect(nextFreeTurnText({ bucketTurns: 0, bucketCapacity: 5, nextTurnAt: at(96) }, now)).toBe('El siguiente turno gratuito llega en 1 h 36 min.')
    expect(nextFreeTurnText({ bucketTurns: 5, bucketCapacity: 5, nextTurnAt: null }, now)).toBeNull()
    expect(nextFreeTurnText(null, now)).toBeNull()
  })

  it('resume la cubeta, y calla si el servidor no la manda o esta apagada', () => {
    expect(bucketText({ bucketTurns: 3, bucketCapacity: 5, nextTurnAt: at(40) }, now)).toBe('Turnos gratuitos: 3 de 5. El siguiente llega en 40 min.')
    expect(bucketText({ bucketTurns: 5, bucketCapacity: 5, nextTurnAt: null }, now)).toBe('Turnos gratuitos: 5 de 5. Se recargan solos, uno cada 96 minutos, cuando los gastas.')
    expect(bucketText({}, now)).toBeNull()
    expect(bucketText({ bucketTurns: 0, bucketCapacity: 0 }, now)).toBeNull()
  })

  it('avisa de la mesa sin turnos a todos, y solo al anfitrion le ofrece recargar', () => {
    const empty = { remainingTurns: 0, bucketTurns: 0, bucketCapacity: 5, nextTurnAt: at(30) }
    expect(outOfTurnsText(empty, true, now)).toBe('La mesa se quedó sin turnos. El siguiente turno gratuito llega en 30 min. Para no esperar, recarga en Mi cuenta.')
    expect(outOfTurnsText(empty, false, now)).toBe('La mesa se quedó sin turnos. El siguiente turno gratuito llega en 30 min. Quien creó la mesa puede recargar para no esperar.')
    expect(outOfTurnsText({ remainingTurns: 3 }, true, now)).toBeNull()
    expect(outOfTurnsText(null, true, now)).toBeNull()
  })
})
