'use client'

import type { ApiClient, TableSummary } from '@rpg-ngn/api-client'
import { retirementText, tableRetirement } from '@rpg-ngn/ui-logic'
import { useState } from 'react'

interface Props {
  client: ApiClient
  table: TableSummary
  host: boolean
  /** La lista se recarga sola despues de cada accion. */
  onChanged: () => void
}

/**
 * Retirar una mesa de la lista, que hasta el 22-09 solo se podia hacer por
 * SSH (Gabino: "no hay mecanismos para borrar mesas").
 *
 * La regla se explica en el propio panel, porque no es obvia: **una partida
 * jugada se archiva, no se borra**, ya que lo que paso en ella tambien es de
 * los demas jugadores. Borrar de verdad queda para las mesas que nunca se
 * jugaron. El invitado no borra nada: se va.
 *
 * Vive dentro de una tarjeta que es un enlace, asi que cada boton corta la
 * propagacion para no navegar a la mesa al pulsarlo.
 */
export function RetireTable({ client, table, host, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const retirement = tableRetirement(table, { host, played: table.headSeq > 0 })
  const texto = retirementText(retirement)

  const act = async (accion: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await accion()
      setOpen(false)
      setConfirmando(false)
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const stop = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault()
    e.stopPropagation()
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost small retirar"
        onClick={(e) => {
          stop(e)
          setOpen(true)
        }}
      >
        {retirement.archived ? 'Recuperar' : 'Retirar'}
      </button>
    )
  }

  return (
    <div className="retirar-panel" onClick={stop}>
      <p className="hint">{texto.hint}</p>
      {error ? <div className="error">{error}</div> : null}

      <div className="row">
        {retirement.canArchive ? (
          <button type="button" className="btn small" disabled={busy} onClick={(e) => { stop(e); void act(() => client.archiveTable(table.id, !retirement.archived)) }}>
            {texto.archive}
          </button>
        ) : null}

        {retirement.canLeave ? (
          <button type="button" className="btn small" disabled={busy} onClick={(e) => { stop(e); void act(() => client.leaveTable(table.id)) }}>
            Salir de la mesa
          </button>
        ) : null}

        <button type="button" className="btn ghost small" disabled={busy} onClick={(e) => { stop(e); setOpen(false); setConfirmando(false) }}>
          Cancelar
        </button>
      </div>

      {retirement.canDelete ? (
        <div className="row borrar">
          {confirmando ? (
            <>
              <span className="hint">{retirement.deleteWarning}</span>
              <button type="button" className="btn danger small" disabled={busy} onClick={(e) => { stop(e); void act(() => client.deleteTable(table.id)) }}>
                Sí, borrar
              </button>
            </>
          ) : (
            <button type="button" className="btn ghost small" disabled={busy} onClick={(e) => { stop(e); setConfirmando(true) }}>
              Borrar del todo
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
