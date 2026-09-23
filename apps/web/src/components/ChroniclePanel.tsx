'use client'

import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleStatus, chronicleUrl } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  client: ApiClient
  tableId: string
}

/**
 * Compartir la historia de la mesa (docs/24, seccion 4). Cualquiera de la
 * mesa lo pide, cada quien acepta, y el enlace solo funciona cuando han
 * aceptado todos. Cualquiera lo retira, y retirar es definitivo.
 */
export function ChroniclePanel({ client, tableId }: Props) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
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

  if (!loaded) return <p className="hint">Cargando...</p>
  const status = chronicleStatus(share)
  const url = share ? chronicleUrl(window.location.origin, share.token) : null

  return (
    <div className="stack chronicle-panel">
      <p className="hint">{status.text}</p>
      {status.state === 'none' ? (
        <>
          <label className="check">
            <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} /> Sin los nombres de quienes jugamos
          </label>
          <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.shareChronicle(tableId, { anonymize }))}>
            Pedir compartir la historia
          </button>
        </>
      ) : null}
      {share && status.canConsent ? (
        <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.consentChronicle(tableId))}>
          Acepto que se comparta
        </button>
      ) : null}
      {share && url ? (
        <div className="row">
          <input className="input" readOnly value={url} aria-label="Enlace a la historia" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true))
            }}
          >
            {copied ? 'Copiado' : 'Copiar'}
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
          Retirar el enlace
        </button>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
