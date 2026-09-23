'use client'

import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import type { ReactNode } from 'react'
import { Drawer } from './Drawer'
import { Portrait } from './Portrait'

interface Props {
  seats: readonly Seat[]
  portraitOf: (characterId: string) => string | null
  /** null cuando quien mira no tiene personaje o no hay sesion: no hay presencia que cambiar. */
  ownPresent: boolean | null
  /** El anfitrion marca ausente o presente a los demas, e invita. */
  isHost: boolean
  busy: boolean
  onTogglePresence: () => void
  onPresence: (memberId: string, present: boolean) => void
  /** El bloque de invitar (enlace y por correo); solo lo pasa el anfitrion. */
  invite?: ReactNode
  onClose: () => void
}

/**
 * La mesa como personas (docs/14, punto 7; docs/18, D-UX-7): una fila por
 * asiento con su estado (listo, escribiendo, pensando, fuera, narra). En tu
 * fila, "me tengo que ir"; en las ajenas, el anfitrion puede marcar ausente a
 * quien se fue sin avisar. Y abajo, para el anfitrion, como traer a mas gente.
 * Todo lo que es "quien esta en la mesa" vive aqui y en ningun otro panel.
 */
export function PlayersPanel({ seats, portraitOf, ownPresent, isHost, busy, onTogglePresence, onPresence, invite, onClose }: Props) {
  return (
    <Drawer title="Jugadores" onClose={onClose} className="seats-panel">
      <ul className="seats">
        {seats.map((seat) => {
          const away = seat.state === 'away'
          return (
            <li key={seat.memberId} className={`seat st-${seat.state}${seat.mine ? ' mine' : ''}`}>
              <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={44} muted={away} />
              <div className="n">
                <span className="name">{seat.name}</span>
                {seat.role === 'host' ? <span className="tag">anfitrión</span> : null}
                {seat.mine ? <span className="tag">tú</span> : null}
              </div>
              <div className="right">
                <span className="state">
                  <i aria-hidden />
                  {SEAT_LABELS[seat.state]}
                </span>
                {seat.mine && ownPresent !== null ? (
                  <button type="button" className="btn ghost small" disabled={busy} onClick={onTogglePresence} title={ownPresent ? 'El DM aparta a tu personaje sin matarlo y la mesa no te espera para cerrar el turno' : 'Vuelves a contar para el turno y el DM te devuelve la palabra'}>
                    {ownPresent ? 'Me tengo que ir' : 'He vuelto'}
                  </button>
                ) : null}
                {!seat.mine && isHost && seat.characterId ? (
                  <button type="button" className="btn ghost small" disabled={busy} onClick={() => onPresence(seat.memberId, away)} title={away ? 'Vuelve a contar para el turno' : 'Si se fue sin avisar: la mesa no lo espera y el DM lo aparta sin matarlo'}>
                    {away ? 'Marcar presente' : 'Marcar ausente'}
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {invite ? (
        <div className="invitar stack">
          <div className="label">Invitar</div>
          {invite}
        </div>
      ) : null}
    </Drawer>
  )
}
