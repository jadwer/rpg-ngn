import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { t, type Language } from '@rpg-ngn/i18n'
import { languageName, tableLanguageOf, COUNTDOWN_OPTIONS, countdownFixedHint, countdownHint, countdownLabel, countdownSecondsOf, DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, sceneImagesHint, sceneImagesOn, SESSION_LENGTHS, sessionLengthLabel, sessionLengthOf, withCountdown, withDiceMode, withSceneImages, withSessionLength, type DiceMode, type SessionLength } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Panel } from './Panel'
import { RadioRow } from './RadioRow'

interface Props {
  client: ApiClient
  table: TableSummary
  /** Idiomas que trae el mundo; con uno solo no se ofrece cambiar. */
  languages?: readonly Language[]
  onChanged: () => void
  onUnauthorized: () => void
}

/**
 * Quien tira los dados de la mesa y si se ilustran las escenas. Solo el anfitrion.
 *
 * Con la mesa reunida y dados de verdad, el numero que escribe un jugador
 * vale. A distancia eso es confiar en que nadie escriba "20", asi que el
 * servidor tira por todos. Tambien el idioma de la mesa y como se vigilan
 * los secretos del pack, como `TableRulesPanel` de la web (paridad, 02-10).
 */
const LINT_OPTIONS: ReadonlyArray<readonly [string, 'play.lintServer' | 'play.lintEnforce' | 'play.lintReport' | 'play.lintOff']> = [
  ['', 'play.lintServer'],
  ['enforce', 'play.lintEnforce'],
  ['report', 'play.lintReport'],
  ['off', 'play.lintOff'],
]

export function DiceModePanel({ client, table, languages = ['es'], onChanged, onUnauthorized }: Props) {
  const saved = useMemo(() => diceModeOf(table.settings), [table.settings])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const images = sceneImagesOn(table.settings)
  // El plan gratuito fija la cuenta atras del anfitrion: se ve, pero no se elige.
  const fixed = table.countdownFixed ?? null
  const seconds = fixed ?? countdownSecondsOf(table.settings)

  const chooseCountdown = (value: number) => {
    if (value === seconds || busy) return
    void save(withCountdown(table.settings, value), value === 0 ? t('play.savedCountdownNone') : t('play.savedCountdown', { seconds: value }))
  }

  const choose = (mode: DiceMode) => {
    if (mode === saved || busy) return
    void save(withDiceMode(table.settings, mode), t('play.savedDice', { mode: diceModeLabel(mode).toLowerCase() }))
  }

  // Largo de sesion (docs/26, H1): el director lleva el ritmo y cierra solo al final.
  const length = sessionLengthOf(table.settings)
  const chooseLength = (value: SessionLength) => {
    if (value === length || busy) return
    void save(withSessionLength(table.settings, value), t('play.saved'))
  }

  const chooseImages = (on: boolean) => {
    if (on === images || busy) return
    void save(withSceneImages(table.settings, on), on ? t('play.savedImagesOn') : t('play.savedImagesOff'))
  }

  const language = tableLanguageOf(table.settings)
  const chooseLanguage = (l: Language) => {
    if (l === language || busy) return
    void save({ ...(table.settings ?? {}), language: l }, t('play.savedLanguage', { language: languageName(l) }))
  }

  const lint = typeof table.settings?.['lint'] === 'string' ? (table.settings['lint'] as string) : ''
  const chooseLint = (value: string) => {
    if (value === lint || busy) return
    // Sin modo elegido se quita la clave: manda el del engine.
    const { lint: _previous, ...rest } = table.settings ?? {}
    void save(value === '' ? rest : { ...rest, lint: value }, t('play.saved'))
  }

  const save = async (settings: Record<string, unknown>, text: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await client.updateTableSettings(table.id, settings)
      setNotice({ ok: true, text })
      onChanged()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {languages.length > 1 ? (
        <Panel title={t('tableRules.idioma')}>
          {languages.map((l) => (
            <RadioRow key={l} label={t(`common.languages.${l}`)} selected={language === l} onSelect={() => chooseLanguage(l)} />
          ))}
          <Text style={styles.hint}>{t('tableRules.idiomaHint')}</Text>
        </Panel>
      ) : null}
      <Panel title={t('tableRules.dados')}>
        {DICE_MODES.map((mode) => (
          <RadioRow key={mode} label={diceModeLabel(mode)} selected={saved === mode} onSelect={() => choose(mode)} />
        ))}
        <Text style={styles.hint}>{diceModeHint(saved)}</Text>
      </Panel>
      <Panel title={t('tableRules.cuentaAtras')}>
        <View style={styles.chips}>
          {COUNTDOWN_OPTIONS.map((value) => (
            <Pressable key={value} disabled={fixed !== null} onPress={() => chooseCountdown(value)} style={[styles.chip, seconds === value && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: seconds === value, disabled: fixed !== null }}>
              <Text style={[styles.chipText, seconds === value && styles.chipTextOn]}>{countdownLabel(value)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{fixed !== null ? countdownFixedHint(fixed) : countdownHint(seconds)}</Text>
      </Panel>
      <Panel title={t('ending.lengthTitle')}>
        {SESSION_LENGTHS.map((value) => (
          <RadioRow key={value} label={sessionLengthLabel(value)} selected={length === value} onSelect={() => chooseLength(value)} />
        ))}
        <Text style={styles.hint}>{t('ending.lengthHint')}</Text>
      </Panel>
      <Panel title={t('tableRules.ilustraciones')}>
        <RadioRow label={t('tableRules.ilustrarEscenas')} selected={images} onSelect={() => chooseImages(true)} />
        <RadioRow label={t('tableRules.soloTexto')} selected={!images} onSelect={() => chooseImages(false)} />
        <Text style={styles.hint}>{sceneImagesHint(images, table.imagesPerSession)}</Text>
      </Panel>
      <Panel title={t('tableRules.secretosDelPack')}>
        {LINT_OPTIONS.map(([value, label]) => (
          <RadioRow key={value || 'servidor'} label={t(label)} selected={lint === value} onSelect={() => chooseLint(value)} />
        ))}
        <Text style={styles.hint}>{t('tableRules.elMotorComparaCada')}</Text>
        {notice ? <Text style={[styles.notice, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}
      </Panel>
    </>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 56, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: 'rgba(11, 15, 20, 0.55)' },
  chipOn: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.accent },
  chipText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.inkDim },
  chipTextOn: { color: '#ffffff' },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
