'use client'

import { ApiError, providerChoice, withProvider, type ApiClient, type DmPreset, type DmProbeResult, type DmProviderChoice, type TableSummary } from '@rpg-ngn/api-client'
import { describePreset, savedProviderText } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  client: ApiClient
  table: TableSummary
  busy?: boolean
  /** La mesa cambio (proveedor guardado): que el padre la recargue. */
  onChanged: () => void
  onUnauthorized: () => void
}

/**
 * Proveedor del DM de la mesa (docs/09: configurable, obligatorio antes de
 * jugar). Se elige entre los presets del servidor, sin credenciales; el
 * modelo es opcional; "Probar" llama al engine con el preset antes de
 * guardarlo. Solo el anfitrion ve este panel (la API tambien lo exige).
 */
export function DmSettingsPanel({ client, table, busy = false, onChanged, onUnauthorized }: Props) {
  const [presets, setPresets] = useState<DmPreset[] | null>(null)
  const [defaultPreset, setDefaultPreset] = useState<string>('')
  const saved = useMemo(() => providerChoice(table.settings), [table.settings])
  const [preset, setPreset] = useState<string>(saved?.preset ?? '')
  const [model, setModel] = useState<string>(saved?.model ?? '')
  const [working, setWorking] = useState(false)
  const [probe, setProbe] = useState<DmProbeResult | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setPreset(saved?.preset ?? '')
    setModel(saved?.model ?? '')
  }, [saved])

  useEffect(() => {
    let alive = true
    void client.listDmPresets().then(
      (result) => {
        if (!alive) return
        setPresets(result.presets)
        setDefaultPreset(result.defaultPreset)
      },
      (caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
        else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
      },
    )
    return () => {
      alive = false
    }
  }, [client, onUnauthorized])

  const chosen: DmProviderChoice | null = preset ? { preset, model: model.trim() || null } : null
  const current = presets?.find((p) => p.name === (preset || defaultPreset)) ?? null
  const dirty = (chosen?.preset ?? '') !== (saved?.preset ?? '') || (chosen?.model ?? '') !== (saved?.model ?? '')

  const run = async (action: () => Promise<void>) => {
    setWorking(true)
    setNotice(null)
    try {
      await action()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        onUnauthorized()
        return
      }
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setWorking(false)
    }
  }

  const test = () =>
    run(async () => {
      setProbe(null)
      const result = await client.probeDm(table.id, chosen ?? { preset: defaultPreset, model: null })
      setProbe(result)
    })

  const save = () =>
    run(async () => {
      await client.updateTableSettings(table.id, withProvider(table.settings, chosen))
      setNotice({ ok: true, text: savedProviderText(chosen) })
      onChanged()
    })

  const disabled = busy || working

  return (
    <div className="stack dm-settings">
      <p className="hint">El director de juego de esta mesa. Las claves viven en el servidor; aquí solo eliges cuál usar. Traer tu propia clave llegará más adelante.</p>

      <label className="field">
        <span>Proveedor</span>
        <select className="select" name="preset" value={preset} onChange={(e) => setPreset(e.target.value)} disabled={disabled || presets === null}>
          <option value="">{defaultPreset ? `El del servidor (${describePreset(defaultPreset)})` : 'El del servidor'}</option>
          {(presets ?? []).map((p) => (
            <option key={p.name} value={p.name} disabled={!p.configured}>
              {describePreset(p.name)}
              {p.configured ? '' : ', sin configurar'}
            </option>
          ))}
        </select>
      </label>

      {current && current.kind !== 'scripted' ? (
        <label className="field">
          <span>Modelo (opcional)</span>
          <input className="input" name="modelo" value={model} onChange={(e) => setModel(e.target.value)} placeholder={current.model ?? ''} maxLength={120} disabled={disabled} />
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            Vacío: {current.model ?? 'el del preset'}. Solo si sabes qué modelo quieres.
          </span>
        </label>
      ) : null}

      {probe ? (
        <div className={probe.ok ? 'ok' : 'error'}>
          {probe.ok ? 'Listo: ' : 'No responde: '}
          {probe.message}
          {probe.model ? ` (${probe.model})` : ''}
        </div>
      ) : null}
      {notice ? <div className={notice.ok ? 'ok' : 'error'}>{notice.text}</div> : null}

      <div className="row">
        <button type="button" className="btn" onClick={() => void test()} disabled={disabled || presets === null}>
          {working ? <span className="spinner" aria-hidden /> : null}
          Probar
        </button>
        <button type="button" className="btn primary" onClick={() => void save()} disabled={disabled || !dirty}>
          Guardar
        </button>
        <span className="hint">Probar no gasta un turno; solo comprueba clave y modelo.</span>
      </div>
    </div>
  )
}
