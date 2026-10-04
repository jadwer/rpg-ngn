'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleStatus } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'

/** Cada cuanto se pregunta si alguien pidio compartir la historia. */
const EVERY_MS = 20_000

/**
 * La solicitud de compartir la historia en ventana (03-10): antes vivia solo
 * en Lectura y nadie la encontraba, y el enlace se quedaba en "no se
 * comparte". Sale cuando hay una solicitud que espera a quien mira; "Ahora
 * no" la calla hasta la proxima visita.
 */
export function ShareConsentModal({ client, tableId }: { client: ApiClient; tableId: string | number }) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      client.chronicleShare(tableId).then(
        (s) => alive && setShare(s),
        () => undefined,
      )
    void load()
    const id = setInterval(load, EVERY_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [client, tableId])

  useEffect(() => {
    if (!share) return
    try {
      setDismissed(sessionStorage.getItem(`rpg:share-later:${share.token}`))
    } catch {
      // Sin almacenamiento se pregunta cada vez.
    }
  }, [share?.token])

  if (!share || !chronicleStatus(share).canConsent || dismissed === share.token) return null

  const asked = share.members.filter((m) => m.consented).map((m) => m.name ?? t('table.chronicle.someone'))
  const later = () => {
    setDismissed(share.token)
    try {
      sessionStorage.setItem(`rpg:share-later:${share.token}`, share.token)
    } catch {
      // Nada que guardar.
    }
  }
  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      setShare(await client.consentChronicle(tableId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="recap-overlay" role="dialog" aria-modal="true" aria-labelledby="share-consent-title">
      <div className="recap-card">
        <h2 id="share-consent-title">{t('shareConsent.title')}</h2>
        <p>{t('shareConsent.asked', { names: asked.join(', ') })}</p>
        <p>{share.listed ? t('shareConsent.listed') : t('shareConsent.link')}</p>
        {share.anonymize ? <p className="hint">{t('shareConsent.anonymous')}</p> : null}
        <p className="hint">{t('shareConsent.everyone')}</p>
        {error ? <p className="error">{error}</p> : null}
        <div className="row">
          <button type="button" className="btn primary" disabled={busy} onClick={() => void accept()} autoFocus>
            {t('shareConsent.accept')}
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={later}>
            {t('shareConsent.later')}
          </button>
        </div>
      </div>
    </div>
  )
}
