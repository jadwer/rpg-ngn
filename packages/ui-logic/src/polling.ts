import type { TableState } from '@rpg-ngn/api-client'

/** Con la mesa jugando: lo que tarda en verse que alguien respondio o que llego la narracion. */
export const POLL_ACTIVE_MS = 1500
/** Sin sesion abierta no pasa nada que haya que ver al segundo. */
export const POLL_IDLE_MS = 5000

/**
 * Cada cuanto preguntar por el estado de la mesa (VAM del 19-09, S10). Antes
 * era cada 1.5 s siempre, tambien con la pestaña oculta o el telefono en el
 * bolsillo: bateria y peticiones que nadie leia. `null` es no preguntar; al
 * volver a la pantalla se pregunta en el acto. Si quien mira escucha la
 * narracion en voz alta ("Leer lo nuevo"), oculta sigue preguntando, despacio:
 * es justo cuando deja el telefono en la mesa. Web y app deciden igual.
 */
export function pollDelay(state: { visible: boolean; listening?: boolean; session: Pick<NonNullable<TableState['session']>, 'status'> | null; turn: Pick<NonNullable<TableState['turn']>, 'status'> | null }): number | null {
  if (!state.visible) return state.listening ? POLL_IDLE_MS : null
  const busyTurn = state.turn !== null && (state.turn.status === 'closing' || state.turn.status === 'resolving')
  const playing = state.session !== null && state.session.status === 'open'
  return busyTurn || playing ? POLL_ACTIVE_MS : POLL_IDLE_MS
}
