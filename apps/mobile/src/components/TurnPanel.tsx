import type { TurnView } from '@rpg-ngn/api-client'
import { turnStatusLine, type TurnProgress } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
}

/**
 * Cuadro de respuesta siempre visible (docs/09): quien respondio y quien
 * falta (nombres, nunca textos), el cuadro para escribir si toca, y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, onRespond, onClose }: Props) {
  const [text, setText] = useState('')
  const line = turnStatusLine(turn, progress, nameOf)

  const send = async () => {
    const value = text.trim()
    if (!value) return
    if (await onRespond(value)) setText('')
  }

  return (
    <View style={styles.panel}>
      <View style={styles.statusRow}>
        {progress.narrating ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        <Text style={[styles.status, progress.narrating && styles.statusNarrating]}>{turn ? `Turno ${turn.number}: ${line}` : line}</Text>
      </View>

      {turn && (progress.responded.length > 0 || progress.pending.length > 0) ? (
        <View style={styles.chips}>
          {progress.responded.map((id) => (
            <Text key={id} style={[styles.chip, styles.chipDone]}>{`${nameOf(id)} ya respondió`}</Text>
          ))}
          {progress.pending.map((id) => (
            <Text key={id} style={styles.chip}>{`${nameOf(id)} falta`}</Text>
          ))}
        </View>
      ) : null}

      {turn?.error ? <Text style={styles.error}>{`El DM tuvo un problema y el turno se reabrió: ${turn.error}`}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {progress.canRespond ? (
        <View style={styles.compose}>
          <TextInput value={text} onChangeText={setText} multiline placeholder="¿Qué haces? Escribe tu acción o di que no haces nada." placeholderTextColor={theme.colors.inkDim} style={styles.input} editable={!busy} />
          <Button label="Enviar" primary busy={busy} disabled={text.trim().length === 0} onPress={() => void send()} />
        </View>
      ) : null}
      {turn && progress.hasResponded && turn.status === 'open' ? <Text style={styles.sent}>Tu respuesta está enviada.</Text> : null}

      {progress.canClose || progress.canForceClose ? (
        <View style={styles.actions}>
          {progress.canClose ? <Button label="Cerrar turno y narrar" onPress={() => onClose(false)} busy={busy} /> : null}
          {progress.canForceClose ? <Button label="Forzar cierre (DM)" onPress={() => onClose(true)} busy={busy} /> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  statusNarrating: { color: theme.colors.accent, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipDone: { color: theme.colors.gold, borderColor: theme.colors.gold, backgroundColor: theme.colors.panel2 },
  error: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.accent, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: 8, padding: 8 },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.accent },
  compose: { gap: 8 },
  input: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 64, maxHeight: 140, textAlignVertical: 'top' },
  sent: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.gold, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
})
