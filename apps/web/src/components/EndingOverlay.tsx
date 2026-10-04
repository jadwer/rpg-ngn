'use client'

import { t } from '@rpg-ngn/i18n'
import { endingTitle, latestEnding, type TurnBlock } from '@rpg-ngn/ui-logic'
import type { ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { RatingForm } from './RatingForm'

interface Props {
  client: ApiClient
  tableId: string | number
  blocks: readonly TurnBlock[]
  isHost: boolean
  /** El anfitrion abre la sesion siguiente desde su panel. */
  onKeepPlaying: () => void
}

/**
 * La pantalla de fin (docs/26, H1): cuando el director cierra la sesion, o el
 * anfitrion la cierra a mano, toda la mesa ve el fin a pantalla completa, con
 * lo que lograron y lo que queda pendiente. Nacio de la partida del 03-10:
 * dos horas sin una sola sensacion de cierre. Una vez por fin y navegador.
 */
export function EndingOverlay({ client, tableId, blocks, isHost, onKeepPlaying }: Props) {
  const ending = latestEnding(blocks)
  const key = ending ? `rpg:ending:${tableId}:${ending.id}` : null
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!key) return
    try {
      if (localStorage.getItem(key) === '1') return
    } catch {
      // Sin almacenamiento se enseña cada vez que se entra.
    }
    setOpen(true)
  }, [key])

  if (!open || !ending) return null

  const close = () => {
    setOpen(false)
    try {
      if (key) localStorage.setItem(key, '1')
    } catch {
      // Nada que guardar.
    }
  }

  return (
    <div className="recap-overlay ending-overlay" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <div className="recap-card ending-panel">
        <h2 id="ending-title" className="ending-title">
          {endingTitle(ending)}
        </h2>
        {ending.text ? <p className="ending-text">{ending.text}</p> : null}
        {ending.achievements.length > 0 ? (
          <section className="ending-achievements">
            <h3>{t('ending.achievements')}</h3>
            <ul>
              {ending.achievements.map((title, index) => (
                <li key={index}>
                  <span aria-hidden="true">✦</span> {title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {ending.cliffhanger ? (
          <p className="ending-next">
            <b>{t('ending.toBeContinued')}</b> {ending.cliffhanger}
          </p>
        ) : null}
        <section className="ending-rate">
          <h3>{t('ending.rateTitle')}</h3>
          <p>{t('ending.rateText')}</p>
          <RatingForm client={client} tableId={tableId} />
        </section>
        <div className="ending-actions">
          {ending.scope !== 'story' && isHost ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                close()
                onKeepPlaying()
              }}
              autoFocus
            >
              {t('ending.keepPlaying')}
            </button>
          ) : null}
          {ending.scope !== 'story' && !isHost ? <p className="hint">{t('ending.waitingHost')}</p> : null}
          <button type="button" className={`btn${isHost && ending.scope !== 'story' ? ' ghost' : ' primary'}`} onClick={close} autoFocus={!isHost || ending.scope === 'story'}>
            {t('ending.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
