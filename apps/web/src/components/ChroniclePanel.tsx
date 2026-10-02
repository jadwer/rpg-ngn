'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleStatus, chronicleUrl } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { ChronicleShortcuts } from './ChronicleShortcuts'

interface Props {
  client: ApiClient
  tableId: string
}

/**
 * Compartir la historia de la mesa (docs/24, seccion 4). Cualquiera de la
 * mesa lo pide, cada quien acepta, y el enlace solo funciona cuando han
 * aceptado todos. Cualquiera lo retira, y retirar es definitivo. Publicarla
 * en Comunidad (02-10) es aparte del enlace y todos lo aceptan sabiendolo.
 */
export function ChroniclePanel({ client, tableId }: Props) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
  const [listed, setListed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    void client.chronicleShare(tableId).then(
      (s) => {
        setShare(s)
        setLoaded(true)
      },
      () => setLoaded(true),
    )
  }, [client, tableId])
  useEffect(load, [load])

  const act = async (fn: () => Promise<ChronicleShare | null | void>) => {
    setBusy(true)
    setError(null)
    try {
      const result = await fn()
      setShare(result ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <p className="hint">{t('chroniclePanel.cargando')}</p>
  const status = chronicleStatus(share)
  const url = share ? chronicleUrl(window.location.origin, share.token) : null

  return (
    <div className="stack chronicle-panel">
      <p className="hint">{status.text}</p>
      {status.state === 'none' ? (
        <>
          <label className="check">
            <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} /> {t('chroniclePanel.sinLosNombresDe')}
          </label>
          <label className="check">
            <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} /> {t('chroniclePanel.publicarEnComunidad')}
          </label>
          {listed ? <p className="hint">{t('chroniclePanel.publicarHint')}</p> : null}
          <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.shareChronicle(tableId, { anonymize, listed }))}>
            {t('chroniclePanel.pedirCompartirLaHistoria')}
          </button>
        </>
      ) : null}
      {share?.listed ? <p className="hint">{share.public ? t('chroniclePanel.publicada') : t('chroniclePanel.seraPublicada')}</p> : null}
      {share && !share.listed ? (
        <>
          <p className="hint">{t('chroniclePanel.publicarHint')}</p>
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => void act(() => client.shareChronicle(tableId, { anonymize: share.anonymize, listed: true }))}>
            {t('chroniclePanel.publicarEnComunidad')}
          </button>
        </>
      ) : null}
      {share && status.canConsent ? (
        <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.consentChronicle(tableId))}>
          {t('chroniclePanel.aceptoQueSeComparta')}
        </button>
      ) : null}
      {share?.public ? <ChronicleShortcuts client={client} tableId={tableId} share={share} /> : null}
      {share && url ? (
        <div className="row">
          <input className="input" readOnly value={url} aria-label={t('chroniclePanel.enlaceALaHistoria')} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true))
            }}
          >
            {copied ? t('play.copied') : t('play.copy')}
          </button>
        </div>
      ) : null}
      {share ? (
        <button
          type="button"
          className="btn ghost small danger"
          disabled={busy}
          onClick={() => void act(async () => {
            await client.withdrawChronicle(tableId)
            return null
          })}
        >
          {t('chroniclePanel.retirarElEnlace')}
        </button>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
