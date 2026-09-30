'use client'

import { t, type MessageKey } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'

const HINTS: Record<PushState, MessageKey> = {
  on: 'play.pushOn',
  off: 'play.pushOff',
  blocked: 'play.pushBlocked',
  'needs-install': 'play.pushInstall',
  unsupported: 'play.pushUnsupported',
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
        {t('pushToggle.avisos')}
      </div>
      <p className="hint" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
        {t(HINTS[state])}
      </p>
      {error ? <div className="error">{error}</div> : null}
      {state === 'on' || state === 'off' ? (
        <div className="row">
          <button type="button" className={state === 'on' ? 'btn' : 'btn primary'} disabled={busy} onClick={() => void toggle()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            {state === 'on' ? t('play.pushStop') : t('play.pushStart')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
