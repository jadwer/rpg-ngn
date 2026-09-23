'use client'

import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import { Drawer } from './Drawer'
import { Portrait } from './Portrait'

interface Props {
  seats: readonly Seat[]
  portraitOf: (characterId: string) => string | null
  /** null cuando quien mira no tiene personaje o no hay sesion: no hay presencia que cambiar. */
  ownPresent: boolean | null
  busy: boolean
  onTogglePresence: () => void
  onClose: () => void
}

/**
 * La mesa como personas (docs/14, punto 7): una fila por asiento con su
 * estado (listo, escribiendo, pensando, fuera, narra). Aqui vive tambien
 * "me tengo que ir", que es un estado de jugador y no un ajuste.
 */
export function PlayersPanel({ seats, portraitOf, ownPresent, busy, onTogglePresence, onClose }: Props) {
  return (
    <Drawer title="Jugadores" onClose={onClose} className="seats-panel">
      <ul className="seats">
        {seats.map((seat) => (
          <li key={seat.memberId} className={`seat st-${seat.state}${seat.mine ? ' mine' : ''}`}>
            <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={44} muted={seat.state === 'away'} />
            <div className="n">
              <span className="name">{seat.name}</span>
              {seat.role === 'host' ? <span className="tag">anfitrión</span> : null}
              {seat.mine ? <span className="tag">tú</span> : null}
            </div>
            <span className="state">
              <i aria-hidden />
              {SEAT_LABELS[seat.state]}
            </span>
          </li>
        ))}
      </ul>
      {ownPresent !== null ? (
        <div className="row" style={{ marginTop: 18 }}>
          <button type="button" className="btn small" disabled={busy} onClick={onTogglePresence} title={ownPresent ? 'El DM aparta a tu personaje sin matarlo y la mesa no te espera para cerrar el turno' : 'Vuelves a contar para el turno y el DM te devuelve la palabra'}>
            {ownPresent ? 'Me tengo que ir' : 'He vuelto'}
          </button>
          <span className="hint">{ownPresent ? 'La mesa no te esperará para cerrar el turno.' : 'Estás fuera: el DM apartó a tu personaje.'}</span>
        </div>
      ) : null}
    </Drawer>
  )
}
