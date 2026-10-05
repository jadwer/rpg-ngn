'use client'

import { t } from '@rpg-ngn/i18n'
import { endingTitle, type EndingBlock } from '@rpg-ngn/ui-logic'
import type { ApiClient } from '@rpg-ngn/api-client'
import { RatingForm } from './RatingForm'

interface Props {
  client: ApiClient
  tableId: string | number
  /** El fin que se enseña; null para no enseñar nada. */
  ending: EndingBlock | null
  isHost: boolean
  /** Se cierra: quien mira ya vio el fin y la mesa puede seguir. */
  onClose: () => void
  /** El anfitrion abre la sesion siguiente desde su panel. */
  onKeepPlaying: () => void
}

/**
 * La pantalla de fin (docs/26, H1): lo que lograron, lo que queda pendiente,
 * las estrellas y seguir jugando. No se abre sola (Gabino, 05-10: salia
 * encima del ultimo texto y no se alcanzaba a leer como acabo); la abre el
 * boton "Cerrar el capitulo" que queda al final de la historia.
 */
export function EndingOverlay({ client, tableId, ending, isHost, onClose, onKeepPlaying }: Props) {
  if (!ending) return null
  const close = onClose

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
