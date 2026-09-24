import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, sceneImagesHint, sceneImagesOn, withDiceMode, withSceneImages, type DiceMode } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
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

  const choose = (mode: DiceMode) => {
    if (mode === saved || busy) return
    void save(withDiceMode(table.settings, mode), `Guardado: ${diceModeLabel(mode).toLowerCase()}.`)
  }

  const chooseImages = (on: boolean) => {
    if (on === images || busy) return
    void save(withSceneImages(table.settings, on), on ? 'Guardado: la mesa se ilustra.' : 'Guardado: solo texto.')
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
    <View style={styles.block}>
      <Text style={styles.label}>Dados</Text>
      {DICE_MODES.map((mode) => (
        <RadioRow key={mode} label={diceModeLabel(mode)} selected={saved === mode} onSelect={() => choose(mode)} />
      ))}
      <Text style={styles.hint}>{diceModeHint(saved)}</Text>
      <Text style={[styles.label, styles.spaced]}>Ilustraciones</Text>
      <RadioRow label="Ilustrar escenas" selected={images} onSelect={() => chooseImages(true)} />
      <RadioRow label="Solo texto" selected={!images} onSelect={() => chooseImages(false)} />
      <Text style={styles.hint}>{sceneImagesHint(images)}</Text>
      {notice ? <Text style={[styles.notice, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  spaced: { marginTop: 10 },
  label: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
