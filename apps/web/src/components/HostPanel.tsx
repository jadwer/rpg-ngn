'use client'

import type { ApiClient, SessionSummary, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { isValidSessionCode, sessionOptions } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import { DmSettingsPanel } from './DmSettingsPanel'
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
 * director de juego). Invitar vive en Jugadores. El DM es la IA; el anfitrion
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
    <section className={`host${embedded ? ' embedded' : ''}`} aria-label="Mando del anfitrión">
      {embedded ? (
        <p className="hint">{session ? `Sesión ${session.code} abierta.` : 'Sin sesión abierta.'}</p>
      ) : (
        <button type="button" className="head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          <span className="t">Anfitrión</span>
          <span className="s">{session ? `Sesión ${session.code} abierta` : 'Sin sesión abierta'}</span>
          <span className="muted">{expanded ? 'ocultar' : 'mostrar'}</span>
        </button>
      )}
      {embedded || expanded ? (
        <div className="body">
          <div className="segmented" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={tab === 'session'} onClick={() => setTab('session')}>
              Sesión
            </button>
            <button type="button" aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>
              Ajustes de la mesa
            </button>
          </div>

          {tab === 'session' && !session ? (
            <div className="stack">
              {table.premise ? <p className="premise">{table.premise}</p> : null}
              <div className="row">
                {opciones.length > 0 ? (
                  <label className="field" style={{ minWidth: 260 }}>
                    <span>Qué sesión juegan</span>
                    <select className="select" name="sesion" value={code} onChange={(e) => setCode(e.target.value)}>
                      {opciones.map((o) => (
                        <option key={o.code} value={o.code}>
                          {`${o.code} · ${o.title}${o.played ? ' (ya jugada)' : ''}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field">
                    <span>Código</span>
                    <input className="input code" name="codigo" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="001" />
                  </label>
                )}
                <label className="field" style={{ flex: 1, minWidth: 220 }}>
                  <span>Nota de la sesión</span>
                  <input className="input" name="nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Momento del mundo o lo que pasa hoy; el DM la recibe" maxLength={120} />
                </label>
              </div>
              <div className="row">
                <button type="button" className="btn primary" onClick={() => onOpenSession(code, note.trim() || null)} disabled={busy || !isValidSessionCode(code)}>
                  Abrir sesión
                </button>
                <span className="hint">{elegida ? elegida.summary : 'Abre el turno 1 e interpela a la party.'}</span>
              </div>
            </div>
          ) : null}

          {tab === 'session' && session ? (
            <div className="stack">
              {table.premise ? <p className="premise">{table.premise}</p> : null}
              <label className="field">
                <span>Cliffhanger para la próxima</span>
                <input className="input" name="cliffhanger" value={cliffhanger} onChange={(e) => setCliffhanger(e.target.value)} placeholder="Opcional: con qué se queda la mesa" />
              </label>
              <div className="row">
                {!confirmClose ? (
                  <button type="button" className="btn" onClick={() => setConfirmClose(true)} disabled={busy}>
                    Cerrar sesión
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
                      Sí, cerrar y congelar el estado
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setConfirmClose(false)}>
                      No, seguir jugando
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'settings' ? (
            <div className="stack">
              <TableRulesPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
              <div className="label">Director de juego</div>
              <DmSettingsPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
