'use client'

import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'

const HINTS: Record<PushState, string> = {
  on: 'Este navegador te avisa cuando tu mesa tenga turno otra vez y cuando tus turnos gratuitos estén listos.',
  off: 'Te avisamos cuando tu mesa tenga turno otra vez y cuando tus turnos gratuitos estén listos. Solo eso.',
  blocked: 'Bloqueaste los avisos para este sitio. Actívalos en los permisos del navegador (el candado junto a la dirección) y vuelve aquí.',
  'needs-install': 'En iPhone, primero agrega Ad Astra Mentis a tu pantalla de inicio (Compartir, "Agregar a inicio") y ábrelo desde ahí.',
  unsupported: 'Este navegador no puede recibir avisos.',
}

/** Activar o quitar los avisos en este navegador (Mi cuenta). */
export function PushToggle({ client, onUnauthorized }: { client: ApiClient; onUnauthorized: () => void }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void pushState().then(setState)
  }, [])

  if (state === null) return null

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      setState(state === 'on' ? await disablePush(client) : await enablePush(client))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <div className="label" style={{ marginTop: 0 }}>
        Avisos
      </div>
      <p className="hint" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
        {HINTS[state]}
      </p>
      {error ? <div className="error">{error}</div> : null}
      {state === 'on' || state === 'off' ? (
        <div className="row">
          <button type="button" className={state === 'on' ? 'btn' : 'btn primary'} disabled={busy} onClick={() => void toggle()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            {state === 'on' ? 'Dejar de avisarme aquí' : 'Avisarme en este navegador'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
