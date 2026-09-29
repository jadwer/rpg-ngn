/**
 * La cubeta de turnos gratuitos (docs de monetizacion, plan gratuito): tope de
 * 5, uno mas cada 96 minutos. El servidor la calcula; aqui solo se dice en
 * palabras cuando entra el siguiente.
 */
export interface TurnBucketState {
  bucketTurns?: number
  bucketCapacity?: number
  /** ISO 8601; null con la cubeta llena. */
  nextTurnAt?: string | null
}

/** "42 min", "1 h 12 min", "2 h". Nunca menos de un minuto. */
export function waitLabel(nextTurnAt: string, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.ceil((Date.parse(nextTurnAt) - now.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** "El siguiente turno gratuito llega en 42 min.", o null si no hay espera. */
export function nextFreeTurnText(bucket: TurnBucketState | null | undefined, now: Date = new Date()): string | null {
  if (!bucket?.nextTurnAt) return null
  return `El siguiente turno gratuito llega en ${waitLabel(bucket.nextTurnAt, now)}.`
}

/** "Turnos gratuitos: 3 de 5. El siguiente llega en 40 min." */
export function bucketText(bucket: TurnBucketState | null | undefined, now: Date = new Date()): string | null {
  if (bucket?.bucketCapacity === undefined || bucket.bucketCapacity === 0) return null
  const base = `Turnos gratuitos: ${bucket.bucketTurns ?? 0} de ${bucket.bucketCapacity}.`
  if (!bucket.nextTurnAt) return `${base} Se recargan solos, uno cada 96 minutos, cuando los gastas.`
  return `${base} El siguiente llega en ${waitLabel(bucket.nextTurnAt, now)}.`
}

/**
 * El aviso de mesa sin turnos, o null si le quedan. Lo ven todos: el
 * anfitrion es quien puede recargar, el resto sabe cuanto esperar.
 */
export function outOfTurnsText(quota: ({ remainingTurns: number } & TurnBucketState) | null | undefined, host: boolean, now: Date = new Date()): string | null {
  if (!quota || quota.remainingTurns > 0) return null
  const next = nextFreeTurnText(quota, now)
  const action = host ? 'Para no esperar, recarga en Mi cuenta.' : 'Quien creó la mesa puede recargar para no esperar.'
  return ['La mesa se quedó sin turnos.', next, action].filter(Boolean).join(' ')
}
