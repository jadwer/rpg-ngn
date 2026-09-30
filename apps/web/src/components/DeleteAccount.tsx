'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Props {
  client: ApiClient
  /** Cerrar la sesion local: la cuenta ya no existe. */
  onDeleted: () => void
}

/**
 * Borrar la propia cuenta, que es el derecho de cancelacion del aviso de
 * privacidad llevado al producto.
 *
 * Se explica lo que pasa de verdad, en vez de decir solo "esto es
 * irreversible": la persona desaparece y **lo que escribio en las partidas se
 * queda sin su nombre**, porque esa partida tambien es de quienes jugaron con
 * ella. Y si es anfitriona de alguna mesa, se le dice cual antes de que lo
 * intente.
 */
export function DeleteAccount({ client, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<{ canDelete: boolean; ownedTables: Array<{ id: string; name: string; played: boolean }> } | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    void client.deletionPreview().then(
      (p) => {
        if (alive) setPreview(p)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [open, client])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await client.deleteAccount(password)
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="card stack" style={{ marginTop: 16 }}>
        <div className="label" style={{ marginTop: 0 }}>
          {t('deleteAccount.borrarMiCuenta')}
        </div>
        <p className="hint">
          Puedes borrar tu cuenta cuando quieras. Lo que escribiste en las partidas se conserva sin tu nombre, porque también es de quienes jugaron contigo. Lo explica el{' '}
          <Link href="/privacidad">{t('deleteAccount.avisoDePrivacidad')}</Link>.
        </p>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>
            {t('deleteAccount.quieroBorrarMiCuenta')}
          </button>
        </div>
      </div>
    )
  }

  const mesas = preview?.ownedTables ?? []

  return (
    <div className="card stack" style={{ marginTop: 16 }}>
      <div className="label" style={{ marginTop: 0 }}>
        {t('deleteAccount.borrarMiCuenta')}
      </div>

      {preview === null ? <p className="hint">{t('deleteAccount.comprobando')}</p> : null}

      {mesas.length > 0 ? (
        <>
          <p className="hint">{t('deleteAccount.antesTienesQueRetirar')}</p>
          <ul className="hint">
            {mesas.map((m) => (
              <li key={m.id}>
                <Link href="/mesas">{m.name}</Link>
                {m.played ? ' (jugada: archívala)' : ' (sin jugar: puedes borrarla)'}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {preview?.canDelete ? (
        <>
          <p className="hint">
            <b>{t('deleteAccount.estoNoSePuede')}</b> {t('deleteAccount.desaparecenTuNombreTu')}
          </p>
          <label className="field">
            <span>{t('deleteAccount.escribeTuContrasenaPara')}</span>
            <input className="input" type="password" name="confirmar_password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
        </>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      <div className="row">
        {preview?.canDelete ? (
          <button type="button" className="btn danger" disabled={busy || password.length === 0} onClick={() => void submit()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            Borrar mi cuenta para siempre
          </button>
        ) : null}
        <button type="button" className="btn ghost small" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setError(null) }}>
          {t('deleteAccount.cancelar')}
        </button>
      </div>
    </div>
  )
}
