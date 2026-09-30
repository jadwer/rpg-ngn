import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { COUNTDOWN_OPTIONS, countdownFixedHint, countdownHint, countdownLabel, countdownSecondsOf, DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, sceneImagesHint, sceneImagesOn, withCountdown, withDiceMode, withSceneImages, type DiceMode } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Panel } from './Panel'
import { RadioRow } from './RadioRow'

interface Props {
  client: ApiClient
  table: TableSummary
  onChanged: () => void
  onUnauthorized: () => void
}

/**
 * Quien tira los dados de la mesa y si se ilustran las escenas. Solo el anfitrion.
 *
 * Con la mesa reunida y dados de verdad, el numero que escribe un jugador
 * vale. A distancia eso es confiar en que nadie escriba "20", asi que el
 * servidor tira por todos.
 */
export function DiceModePanel({ client, table, onChanged, onUnauthorized }: Props) {
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

  const chooseImages = (on: boolean) => {
    if (on === images || busy) return
    void save(withSceneImages(table.settings, on), on ? t('play.savedImagesOn') : t('play.savedImagesOff'))
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
      <Panel title={t('tableRules.ilustraciones')}>
        <RadioRow label={t('tableRules.ilustrarEscenas')} selected={images} onSelect={() => chooseImages(true)} />
        <RadioRow label={t('tableRules.soloTexto')} selected={!images} onSelect={() => chooseImages(false)} />
        <Text style={styles.hint}>{sceneImagesHint(images, table.imagesPerSession)}</Text>
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
