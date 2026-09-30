'use client'

import { t, type Language, type MessageKey } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { languageName, tableLanguageOf, COUNTDOWN_OPTIONS, countdownFixedHint, countdownHint, countdownLabel, countdownSecondsOf, DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, sceneImagesHint, sceneImagesOn, withCountdown, withDiceMode, withSceneImages, type DiceMode } from '@rpg-ngn/ui-logic'
import { useState } from 'react'

interface Props {
  client: ApiClient
  table: TableSummary
  /** Idiomas en que se juega el mundo (i18n); con uno solo no hay nada que elegir. */
  languages?: readonly Language[] | undefined
  busy?: boolean | undefined
  /** La mesa cambio: que el padre la recargue (de ahi sale el valor guardado). */
  onChanged: () => void
  onUnauthorized: () => void
}

const LINT_OPTIONS: ReadonlyArray<[string, MessageKey]> = [
  ['', 'play.lintServer'],
  ['enforce', 'play.lintEnforce'],
  ['report', 'play.lintReport'],
  ['off', 'play.lintOff'],
]

/**
 * Las reglas de la mesa que casi nunca cambian: quien tira los dados y que
 * hace el motor con los secretos del pack. Cada control guarda al elegir,
 * sin formulario ni boton (docs/18, D-UX-7): antes vivian dentro del
 * formulario del director, cuyo "Guardar" solo se encendia al cambiar el
 * proveedor, y cambiar los dados no guardaba nada. El valor que se ve es el
 * guardado, que llega con la mesa recargada.
 */
export function TableRulesPanel({ client, table, languages = ['es'], busy = false, onChanged, onUnauthorized }: Props) {
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
    void save(withDiceMode(table.settings, mode), t('play.savedDice', { mode: diceModeLabel(mode).toLowerCase() }))
  }

  // Cambia el idioma en que narra el GM y en que salen los textos del mundo;
  // la API solo acepta los que el mundo trae.
  const language = tableLanguageOf(table.settings)
  const chooseLanguage = (l: Language) => {
    if (l === language || disabled) return
    void save({ ...(table.settings ?? {}), language: l }, t('play.savedLanguage', { language: languageName(l) }))
  }

  const images = sceneImagesOn(table.settings)
  // El plan gratuito fija la cuenta atras del anfitrion: se ve, pero no se elige.
  const fixed = table.countdownFixed ?? null
  const seconds = fixed ?? countdownSecondsOf(table.settings)
  const chooseCountdown = (value: number) => {
    if (value === seconds || disabled) return
    void save(withCountdown(table.settings, value), value === 0 ? t('play.savedCountdownNone') : t('play.savedCountdown', { seconds: value }))
  }
  const chooseImages = (on: boolean) => {
    if (on === images || disabled) return
    void save(withSceneImages(table.settings, on), on ? t('play.savedImagesOn') : t('play.savedImagesOff'))
  }

  const chooseLint = (value: string) => {
    if (value === lint || disabled) return
    // Sin modo elegido se quita la clave: manda el del engine.
    const { lint: _previous, ...rest } = table.settings ?? {}
    void save(value === '' ? rest : { ...rest, lint: value }, t('play.saved'))
  }

  return (
    <div className="stack table-rules">
      {languages.length > 1 ? (
        <div className="field">
          <span>{t('tableRules.idioma')}</span>
          <div className="segmented" role="group" aria-label={t('tableRules.idioma')}>
            {languages.map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={language === l} disabled={disabled} onClick={() => chooseLanguage(l)}>
                {t(`common.languages.${l}`)}
              </button>
            ))}
          </div>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            {t('tableRules.idiomaHint')}
          </span>
        </div>
      ) : null}

      {/* div y no label: un label con botones dentro pulsa el primero al tocar el texto. */}
      <div className="field">
        <span>{t('tableRules.dados')}</span>
        <div className="segmented" role="group" aria-label={t('tableRules.dados')}>
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

      <div className="field">
        <span>{t('tableRules.cuentaAtras')}</span>
        <div className="segmented" role="group" aria-label={t('tableRules.cuentaAtras')}>
          {COUNTDOWN_OPTIONS.map((value) => (
            <button key={value} type="button" aria-pressed={seconds === value} disabled={disabled || fixed !== null} onClick={() => chooseCountdown(value)}>
              {countdownLabel(value)}
            </button>
          ))}
        </div>
        <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
          {fixed !== null ? countdownFixedHint(fixed) : countdownHint(seconds)}
        </span>
      </div>

      <div className="field">
        <span>{t('tableRules.ilustraciones')}</span>
        <div className="segmented" role="group" aria-label={t('tableRules.ilustraciones')}>
          <button type="button" aria-pressed={images} disabled={disabled} onClick={() => chooseImages(true)}>
            {t('tableRules.ilustrarEscenas')}
          </button>
          <button type="button" aria-pressed={!images} disabled={disabled} onClick={() => chooseImages(false)}>
            {t('tableRules.soloTexto')}
          </button>
        </div>
        <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
          {sceneImagesHint(images, table.imagesPerSession)}
        </span>
      </div>

      <label className="field">
        <span>{t('tableRules.secretosDelPack')}</span>
        <select className="select" name="lint" value={lint} onChange={(e) => chooseLint(e.target.value)} disabled={disabled}>
          {LINT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
        <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
          {t('tableRules.elMotorComparaCada')}
        </span>
      </label>

      {notice ? <div className={notice.ok ? 'ok' : 'error'}>{notice.text}</div> : null}
    </div>
  )
}
