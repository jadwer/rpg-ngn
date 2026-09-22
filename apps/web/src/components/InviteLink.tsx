'use client'

import type { ApiClient, TableInvite } from '@rpg-ngn/api-client'
import { useCallback, useEffect, useState } from 'react'

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
      () => setError('No se pudo copiar. Selecciona el enlace y cópialo a mano.'),
    )
  }

  return (
    <div className="card stack invitar-enlace">
      <div className="label" style={{ marginTop: 0 }}>
        Invitar con un enlace
      </div>

      {enlace ? (
        <>
          <p className="hint">Mándaselo por donde quieras. Quien lo abra entra a la mesa y elige personaje.</p>
          <input className="input enlace" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de la mesa" />
          <div className="row">
            <button type="button" className="btn primary small" onClick={copiar}>
              {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <span className="hint">Guárdalo: por seguridad no se vuelve a mostrar.</span>
          </div>
        </>
      ) : invite ? (
        <>
          <p className="hint">
            Hay un enlace activo: {invite.seatsLeft === 1 ? 'queda un sitio' : `quedan ${invite.seatsLeft} sitios`} de {invite.maxUses}. Por seguridad no se puede volver a mostrar.
          </p>
          <div className="row">
            <button type="button" className="btn small" disabled={busy} onClick={() => void crear()}>
              Crear uno nuevo
            </button>
            <button type="button" className="btn ghost small" disabled={busy} onClick={() => void cortar()}>
              Desactivar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">Crea un enlace y pásaselo a quien quieras. No hace falta que sean tus amigos aquí ni que te den su correo.</p>
          <div className="row">
            <button type="button" className="btn primary small" disabled={busy} onClick={() => void crear()}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Crear enlace
            </button>
            <span className="hint">Vale para 5 personas y caduca en una semana.</span>
          </div>
        </>
      )}

      {error ? <div className="error">{error}</div> : null}
    </div>
  )
}
