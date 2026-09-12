'use client'

import type { ApiClient, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { useEffect, useRef, useState } from 'react'
import { isValidSessionCode } from '../lib/tableSetup'
import { InvitePanel } from './InvitePanel'

interface Props {
  client: ApiClient
  table: TableSummary
  meId: string
  pack: LoadedPack | null
  session: { code: string; status: string } | null
  /** true cuando ya llego el primer estado de la mesa (para abrir el mando solo si no hay sesion). */
  loaded: boolean
  /** Codigo sugerido (la siguiente de la campaña). */
  suggestedCode: string
  busy: boolean
  onOpenSession: (code: string, note: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
  onTableChanged: () => void
  onUnauthorized: () => void
}

/**
 * Mando del anfitrion: abrir la sesion (codigo de tres digitos y una nota
 * que el DM tambien recibe), cerrarla con cliffhanger, la premisa de la
 * mesa e invitaciones. El DM es la IA; el anfitrion dirige la mesa.
 */
export function HostPanel({ client, table, meId, pack, session, loaded, suggestedCode, busy, onOpenSession, onCloseSession, onTableChanged, onUnauthorized }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'session' | 'invite'>('session')
  const [code, setCode] = useState(suggestedCode)
  const [note, setNote] = useState('')
  const [cliffhanger, setCliffhanger] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const decidedRef = useRef(false)

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
    <section className="host" aria-label="Mando del anfitrión">
      <button type="button" className="head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className="t">Anfitrión</span>
        <span className="s">{session ? `Sesión ${session.code} abierta` : 'Sin sesión abierta'}</span>
        <span className="muted">{expanded ? 'ocultar' : 'mostrar'}</span>
      </button>
      {expanded ? (
        <div className="body">
          <div className="segmented" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={tab === 'session'} onClick={() => setTab('session')}>
              Sesión
            </button>
            <button type="button" aria-pressed={tab === 'invite'} onClick={() => setTab('invite')}>
              Invitados
            </button>
          </div>

          {tab === 'session' && !session ? (
            <div className="stack">
              {table.premise ? <p className="premise">{table.premise}</p> : null}
              <div className="row">
                <label className="field">
                  <span>Código</span>
                  <input className="input code" name="codigo" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="003" />
                </label>
                <label className="field" style={{ flex: 1, minWidth: 220 }}>
                  <span>Nota de la sesión</span>
                  <input className="input" name="nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Momento del mundo o lo que pasa hoy; el DM la recibe" maxLength={120} />
                </label>
              </div>
              <div className="row">
                <button type="button" className="btn primary" onClick={() => onOpenSession(code, note.trim() || null)} disabled={busy || !isValidSessionCode(code)}>
                  Abrir sesión
                </button>
                <span className="hint">Abre el turno 1 e interpela a la party.</span>
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

          {tab === 'invite' ? <InvitePanel client={client} table={table} meId={meId} pack={pack} onChanged={onTableChanged} onUnauthorized={onUnauthorized} /> : null}
        </div>
      ) : null}
    </section>
  )
}
