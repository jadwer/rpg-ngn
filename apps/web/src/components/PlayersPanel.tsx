'use client'

import { t } from '@rpg-ngn/i18n'
import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import { useState, type ReactNode } from 'react'
import { Drawer } from './Drawer'
import { Panel } from './Panel'
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
  /** El anfitrion saca a alguien de la mesa. */
  onRemove: (memberId: string) => void
  /** Bloquear a la persona de un asiento (cualquiera, sobre los demas). */
  onBlock: (seat: Seat) => void
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
export function PlayersPanel({ seats, portraitOf, ownPresent, isHost, busy, onTogglePresence, onPresence, onRemove, onBlock, invite, onClose }: Props) {
  // Sacar y bloquear no se deshacen con un clic: se confirman en la misma fila.
  const [confirming, setConfirming] = useState<{ memberId: string; action: 'remove' | 'block' } | null>(null)
  return (
    <Drawer title={t('playersPanel.jugadores')} onClose={onClose} className="seats-panel">
      <div className="hojas">
        <Panel title={t('playersPanel.enLaMesa')}>
          <ul className="seats">
            {seats.map((seat) => {
              const away = seat.state === 'away'
              return (
                <li key={seat.memberId} className={`seat st-${seat.state}${seat.mine ? ' mine' : ''}`}>
                  <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={44} muted={away} />
                  <div className="n">
                    <span className="name">{seat.name}</span>
                    {seat.role === 'host' ? <span className="tag">{t('playersPanel.anfitrion')}</span> : null}
                    {seat.mine ? <span className="tag">{t('playersPanel.tu')}</span> : null}
                  </div>
                  <div className="right">
                    <span className="state">
                      <i aria-hidden />
                      {SEAT_LABELS[seat.state]}
                    </span>
                    {seat.mine && ownPresent !== null ? (
                      <button type="button" className="btn ghost small" disabled={busy} onClick={onTogglePresence} title={ownPresent ? t('play.leaveTitle') : t('play.backTitle')}>
                        {ownPresent ? t('play.leave') : t('play.back')}
                      </button>
                    ) : null}
                    {!seat.mine && isHost && seat.characterId ? (
                      <button type="button" className="btn ghost small" disabled={busy} onClick={() => onPresence(seat.memberId, away)} title={away ? t('play.presentTitle') : t('play.awayTitle')}>
                        {away ? t('play.markPresent') : t('play.markAway')}
                      </button>
                    ) : null}
                    {!seat.mine && isHost && seat.role !== 'host' ? (
                      <button type="button" className="btn ghost small" disabled={busy} onClick={() => setConfirming({ memberId: seat.memberId, action: 'remove' })} title={t('playersPanel.sacarTitle')}>
                        {t('playersPanel.sacar')}
                      </button>
                    ) : null}
                    {!seat.mine && seat.userId ? (
                      <button type="button" className="btn ghost small danger" disabled={busy} onClick={() => setConfirming({ memberId: seat.memberId, action: 'block' })} title={t('playersPanel.bloquearTitle')}>
                        {t('playersPanel.bloquear')}
                      </button>
                    ) : null}
                  </div>
                  {confirming?.memberId === seat.memberId ? (
                    <div className="seat-confirm" role="alertdialog">
                      <p>
                        {confirming.action === 'remove'
                          ? t('playersPanel.confirmSacar', { name: seat.name })
                          : seat.role === 'host'
                            ? t('playersPanel.confirmBloquearAnfitrion', { name: seat.name })
                            : t('playersPanel.confirmBloquear', { name: seat.name })}
                      </p>
                      <div className="row">
                        <button
                          type="button"
                          className="btn small danger"
                          disabled={busy}
                          onClick={() => {
                            setConfirming(null)
                            if (confirming.action === 'remove') onRemove(seat.memberId)
                            else onBlock(seat)
                          }}
                        >
                          {confirming.action === 'remove' ? t('playersPanel.siSacar') : t('playersPanel.siBloquear')}
                        </button>
                        <button type="button" className="btn ghost small" onClick={() => setConfirming(null)}>
                          {t('playersPanel.cancelar')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Panel>
        {invite}
      </div>
    </Drawer>
  )
}
