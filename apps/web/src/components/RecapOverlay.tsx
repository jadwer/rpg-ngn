'use client'

import type { SystemBlock } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'

interface Props {
  tableId: string | number
  /** El "Anteriormente..." de la sesion abierta, o null. */
  recap: SystemBlock | null
  /** Solo al entrar: si llega en vivo durante la apertura, ya se lee en la narracion. */
  enabled: boolean
}

/**
 * "Anteriormente..." (E10c): al entrar a una mesa con la sesion abierta, el
 * resumen de lo que paso antes en una pantalla con Continuar, como el capitulo
 * previo de una serie. Una vez por resumen y navegador.
 */
export function RecapOverlay({ tableId, recap, enabled }: Props) {
  const key = recap ? `rpg:recap:${tableId}:${recap.id}` : null
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled || !key) return
    try {
      if (localStorage.getItem(key) === '1') return
    } catch {
      // Sin almacenamiento se enseña cada vez que se entra.
    }
    setOpen(true)
  }, [enabled, key])

  if (!open || !recap) return null

  const close = () => {
    setOpen(false)
    try {
      if (key) localStorage.setItem(key, '1')
    } catch {
      // Nada que guardar.
    }
  }

  return (
    <div className="recap-overlay" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      <div className="recap-card">
        <h2 id="recap-title">Anteriormente...</h2>
        {(recap.text ?? '').split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
        <button type="button" className="btn primary" onClick={close} autoFocus>
          Continuar
        </button>
      </div>
    </div>
  )
}
