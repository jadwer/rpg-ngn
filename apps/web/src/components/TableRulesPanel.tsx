'use client'

import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, withDiceMode, type DiceMode } from '@rpg-ngn/ui-logic'
import { useState } from 'react'

interface Props {
  client: ApiClient
  table: TableSummary
  busy?: boolean | undefined
  /** La mesa cambio: que el padre la recargue (de ahi sale el valor guardado). */
  onChanged: () => void
  onUnauthorized: () => void
}

const LINT_OPTIONS: ReadonlyArray<[string, string]> = [
  ['', 'El del servidor'],
  ['enforce', 'Cortar lo que revele un secreto'],
  ['report', 'Dejar pasar y avisarme'],
  ['off', 'No revisar'],
]

/**
 * Las reglas de la mesa que casi nunca cambian: quien tira los dados y que
 * hace el motor con los secretos del pack. Cada control guarda al elegir,
 * sin formulario ni boton (docs/18, D-UX-7): antes vivian dentro del
 * formulario del director, cuyo "Guardar" solo se encendia al cambiar el
 * proveedor, y cambiar los dados no guardaba nada. El valor que se ve es el
 * guardado, que llega con la mesa recargada.
 */
export function TableRulesPanel({ client, table, busy = false, onChanged, onUnauthorized }: Props) {
  const dice = diceModeOf(table.settings)
  const lint = typeof table.settings?.['lint'] === 'string' ? (table.settings['lint'] as string) : ''
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const disabled = busy || working

  const save = async (settings: Record<string, unknown>, text: string) => {
    setWorking(true)
    setNotice(null)
    try {
      await client.updateTableSettings(table.id, settings)
      setNotice({ ok: true, text })
      onChanged()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setWorking(false)
    }
  }

  const chooseDice = (mode: DiceMode) => {
    if (mode === dice || disabled) return
    void save(withDiceMode(table.settings, mode), `Guardado: ${diceModeLabel(mode).toLowerCase()}.`)
  }

  const chooseLint = (value: string) => {
    if (value === lint || disabled) return
    // Sin modo elegido se quita la clave: manda el del engine.
    const { lint: _previous, ...rest } = table.settings ?? {}
    void save(value === '' ? rest : { ...rest, lint: value }, 'Guardado.')
  }

  return (
    <div className="stack table-rules">
      {/* div y no label: un label con botones dentro pulsa el primero al tocar el texto. */}
      <div className="field">
        <span>Dados</span>
        <div className="segmented" role="group" aria-label="Dados">
          {DICE_MODES.map((m) => (
            <button key={m} type="button" aria-pressed={dice === m} disabled={disabled} onClick={() => chooseDice(m)}>
              {diceModeLabel(m)}
            </button>
          ))}
        </div>
        <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
          {diceModeHint(dice)}
        </span>
      </div>

      <label className="field">
        <span>Secretos del pack</span>
        <select className="select" name="lint" value={lint} onChange={(e) => chooseLint(e.target.value)} disabled={disabled}>
          {LINT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
          El motor compara cada bloque del DM con lo que la mesa ha descubierto. Los avisos solo los ves tú.
        </span>
      </label>

      {notice ? <div className={notice.ok ? 'ok' : 'error'}>{notice.text}</div> : null}
    </div>
  )
}
