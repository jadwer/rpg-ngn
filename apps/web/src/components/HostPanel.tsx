'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, SessionSummary, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { isValidSessionCode, sessionOptions } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import { GmSettingsPanel } from './GmSettingsPanel'
import { Panel } from './Panel'
import { TableRulesPanel } from './TableRulesPanel'

interface Props {
  client: ApiClient
  table: TableSummary
  pack: LoadedPack | null
  session: { code: string; status: string } | null
  /** true cuando ya llego el primer estado de la mesa (para abrir el mando solo si no hay sesion). */
  loaded: boolean
  /** Codigo sugerido (la siguiente de la campaña). */
  suggestedCode: string
  /** Sesiones ya jugadas por ESTA campaña, para marcarlas en el selector. */
  playedSessions?: readonly SessionSummary[]
  busy: boolean
  onOpenSession: (code: string, note: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
  onTableChanged: () => void
  onUnauthorized: () => void
  /** Dentro de un panel de la barra del juego: sin cabecera plegable, siempre abierto. */
  embedded?: boolean | undefined
}

/**
 * Mando del anfitrion, en dos pestañas (docs/18, D-UX-7): **Sesion**, lo de
 * cada noche (abrir con codigo y nota, cerrar con cliffhanger, la premisa), y
 * **Ajustes de la mesa**, lo que casi nunca cambia (dados, secretos del pack,
 * director de juego). Invitar vive en Jugadores. El GM es la IA; el anfitrion
 * dirige la mesa.
 */
export function HostPanel({ client, table, pack, session, loaded, suggestedCode, playedSessions = [], busy, onOpenSession, onCloseSession, onTableChanged, onUnauthorized, embedded = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'session' | 'settings'>('session')
  const [code, setCode] = useState(suggestedCode)
  const [note, setNote] = useState('')
  const [cliffhanger, setCliffhanger] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const decidedRef = useRef(false)
  const opciones = sessionOptions(pack, playedSessions)
  const elegida = opciones.find((o) => o.code === code) ?? null

  useEffect(() => {
    setCode(suggestedCode)
  }, [suggestedCode])

  // Al entrar: abierto si no hay sesion (hay que abrirla), plegado si ya se juega.
  useEffect(() => {
    if (!loaded || decidedRef.current) return
    decidedRef.current = true
    setExpanded(!session)
  }, [loaded, session])

  // Al cerrarse la sesion, el mando vuelve a mostrarse para abrir la siguiente.
  useEffect(() => {
    if (loaded && !session) setExpanded(true)
  }, [loaded, session])

  return (
    <section className={`host${embedded ? ' embedded' : ''}`} aria-label={t('hostPanel.mandoDelAnfitrion')}>
      {embedded ? (
        <p className="hint">{session ? t('play.sessionOpenDot', { code: session.code }) : t('play.noSessionDot')}</p>
      ) : (
        <button type="button" className="head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          <span className="t">{t('hostPanel.anfitrion')}</span>
          <span className="s">{session ? t('play.sessionOpen', { code: session.code }) : t('play.noSession')}</span>
          <span className="muted">{expanded ? 'ocultar' : 'mostrar'}</span>
        </button>
      )}
      {embedded || expanded ? (
        <div className="body">
          <div className="segmented" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={tab === 'session'} onClick={() => setTab('session')}>
              {t('hostPanel.sesion')}
            </button>
            <button type="button" aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>
              {t('hostPanel.ajustesDeLaMesa')}
            </button>
          </div>

          {tab === 'session' && !session ? (
            <Panel title={t('hostPanel.abrirSesion')}>
              <div className="row">
                {opciones.length > 0 ? (
                  <label className="field" style={{ minWidth: 260 }}>
                    <span>{t('hostPanel.queSesionJuegan')}</span>
                    <select className="select" name="sesion" value={code} onChange={(e) => setCode(e.target.value)}>
                      {opciones.map((o) => (
                        <option key={o.code} value={o.code}>
                          {`${o.code} · ${o.title}${o.played ? t('hostPanel.yaJugada') : ''}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field">
                    <span>{t('hostPanel.codigo')}</span>
                    <input className="input code" name="codigo" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="001" />
                  </label>
                )}
                <label className="field" style={{ flex: 1, minWidth: 220 }}>
                  <span>{t('hostPanel.notaDeLaSesion')}</span>
                  <input className="input" name="nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('hostPanel.momentoDelMundo')} maxLength={120} />
                </label>
              </div>
              <div className="row">
                <button type="button" className="btn primary" onClick={() => onOpenSession(code, note.trim() || null)} disabled={busy || !isValidSessionCode(code)}>
                  {t('hostPanel.abrirSesion')}
                </button>
                <span className="hint">{elegida ? elegida.summary : t('play.openTurnOne')}</span>
              </div>
            </Panel>
          ) : null}

          {tab === 'session' && session ? (
            <Panel title={t('play.session', { code: session.code })}>
              <label className="field">
                <span>{t('hostPanel.cliffhangerParaLaProxima')}</span>
                <input className="input" name="cliffhanger" value={cliffhanger} onChange={(e) => setCliffhanger(e.target.value)} placeholder={t('hostPanel.opcionalConQueSe')} />
              </label>
              <div className="row">
                {!confirmClose ? (
                  <button type="button" className="btn" onClick={() => setConfirmClose(true)} disabled={busy}>
                    {t('hostPanel.cerrarSesion')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        setConfirmClose(false)
                        onCloseSession(cliffhanger.trim() || null)
                      }}
                      disabled={busy}
                    >
                      {t('hostPanel.siCerrarYCongelar')}
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setConfirmClose(false)}>
                      {t('hostPanel.noSeguirJugando')}
                    </button>
                  </>
                )}
              </div>
            </Panel>
          ) : null}

          {tab === 'session' && table.premise ? (
            <Panel title={t('hostPanel.premisa')}>
              <p className="premise">{table.premise}</p>
            </Panel>
          ) : null}

          {tab === 'settings' ? (
            <div className="hojas">
              <Panel title={t('hostPanel.reglasDeLaMesa')}>
                <TableRulesPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
              </Panel>
              <Panel title={t('hostPanel.directorDeJuego')}>
                <GmSettingsPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
              </Panel>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
