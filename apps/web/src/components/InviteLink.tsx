'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, TableInvite } from '@rpg-ngn/api-client'
import { useCallback, useEffect, useState } from 'react'
import { Panel } from './Panel'

interface Props {
  client: ApiClient
  tableId: string
}

/**
 * El enlace con el que entra la gente a la mesa (docs/18, D-UX-1).
 *
 * Sustituye a los seis pasos de antes: el anfitrion copia esto, lo manda por
 * donde quiera, y quien lo abre entra. La amistad sigue existiendo para
 * invitar a mano, pero ya no es obligatoria.
 *
 * **El token solo se ve al crearlo**, porque en el servidor vive hasheado.
 * Si se pierde, se genera otro (y el anterior deja de valer).
 */
export function InviteLink({ client, tableId }: Props) {
  const [invite, setInvite] = useState<TableInvite | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(() => {
    void client.currentInvite(tableId).then(setInvite, () => undefined)
  }, [client, tableId])

  useEffect(cargar, [cargar])

  const crear = async () => {
    setBusy(true)
    setError(null)
    setCopiado(false)
    try {
      const creado = await client.createInvite(tableId)
      setInvite(creado)
      if (creado.token) setEnlace(`${window.location.origin}/unirse/${creado.token}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const cortar = async () => {
    setBusy(true)
    setError(null)
    try {
      await client.revokeInvite(tableId)
      setInvite(null)
      setEnlace(null)
      setCopiado(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const copiar = () => {
    if (!enlace) return
    void navigator.clipboard.writeText(enlace).then(
      () => setCopiado(true),
      () => setError(t('play.copyFailed')),
    )
  }

  return (
    <Panel title={t('inviteLink.invitarConUnEnlace')} className="invitar-enlace">

      {enlace ? (
        <>
          <p className="hint">{t('inviteLink.mandaseloPorDondeQuieras')}</p>
          <input className="input enlace" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} aria-label={t('inviteLink.enlaceDeLaMesa')} />
          <div className="row">
            <button type="button" className="btn primary small" onClick={copiar}>
              {copiado ? t('play.copied') : t('play.copyLink')}
            </button>
            <span className="hint">{t('inviteLink.guardaloPorSeguridadNo')}</span>
          </div>
        </>
      ) : invite ? (
        <>
          <p className="hint">
            Hay un enlace activo: {invite.seatsLeft === 1 ? 'queda un sitio' : `quedan ${invite.seatsLeft} sitios`} de {invite.maxUses}. Por seguridad no se puede volver a mostrar.
          </p>
          <div className="row">
            <button type="button" className="btn small" disabled={busy} onClick={() => void crear()}>
              {t('inviteLink.crearUnoNuevo')}
            </button>
            <button type="button" className="btn ghost small" disabled={busy} onClick={() => void cortar()}>
              {t('inviteLink.desactivar')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">{t('inviteLink.creaUnEnlaceY')}</p>
          <div className="row">
            <button type="button" className="btn primary small" disabled={busy} onClick={() => void crear()}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Crear enlace
            </button>
            <span className="hint">{t('inviteLink.valeParaLasPlazas')}</span>
          </div>
        </>
      )}

      {error ? <div className="error">{error}</div> : null}
    </Panel>
  )
}
