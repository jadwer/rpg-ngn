import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import { DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, withDiceMode, type DiceMode } from '@rpg-ngn/ui-logic'
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
 * Quien tira los dados de la mesa. Solo el anfitrion.
 *
 * Con la mesa reunida y dados de verdad, el numero que escribe un jugador
 * vale. A distancia eso es confiar en que nadie escriba "20", asi que el
 * servidor tira por todos.
 */
export function DiceModePanel({ client, table, onChanged, onUnauthorized }: Props) {
  const saved = useMemo(() => diceModeOf(table.settings), [table.settings])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const choose = async (mode: DiceMode) => {
    if (mode === saved || busy) return
    setBusy(true)
    setNotice(null)
    try {
      await client.updateTableSettings(table.id, withDiceMode(table.settings, mode))
      setNotice({ ok: true, text: `Guardado: ${diceModeLabel(mode).toLowerCase()}.` })
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
        <RadioRow key={mode} label={diceModeLabel(mode)} selected={saved === mode} onSelect={() => void choose(mode)} />
      ))}
      <Text style={styles.hint}>{diceModeHint(saved)}</Text>
      {notice ? <Text style={[styles.notice, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.inkDim },
  hint: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#cfe3b8', borderColor: '#5d803e', backgroundColor: 'rgba(93, 128, 62, 0.22)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
