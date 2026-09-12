import type { TurnView } from '@rpg-ngn/api-client'
import type { TurnProgress } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

/** Frase de estado del turno, con acentos (la de ui-logic va sin ellos). */
export function statusLine(turn: TurnView | null, progress: TurnProgress, nameOf: (id: string) => string): string {
  if (!turn) return 'No hay turno abierto.'
  if (progress.narrating) return 'El DM está narrando...'
  if (turn.status === 'resolved') return 'Turno resuelto.'
  if (progress.complete) return turn.required.length === 0 ? 'Nadie tiene pregunta directa; cualquiera puede cerrar.' : 'Todos respondieron; cualquiera puede cerrar el turno.'
  return `Faltan: ${progress.pending.map(nameOf).join(', ')}.`
}

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  hasCharacter: boolean
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
  /** El cuadro tomo el foco: la pantalla baja la narracion al final para que se vea lo ultimo sobre el teclado. */
  onFocusInput?: (() => void) | undefined
}

/**
 * Cuadro de respuesta siempre visible (docs/09): quien respondio y quien
 * falta (nombres, nunca textos), el cuadro para escribir si toca, y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso. Con el
 * teclado abierto los chips se esconden para que el cuadro y Enviar quepan.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, onRespond, onClose, onFocusInput }: Props) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const line = statusLine(turn, progress, nameOf)

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    if (await onRespond(value)) setText('')
  }

  return (
    <View style={styles.panel}>
      <View style={styles.statusRow}>
        {progress.narrating ? <ActivityIndicator size="small" color={theme.colors.goldBright} /> : null}
        <Text style={[styles.status, progress.narrating && styles.statusNarrating]} numberOfLines={focused ? 1 : 3}>
          {turn ? `Turno ${turn.number}: ${line}` : line}
        </Text>
      </View>

      {turn && !focused && !progress.narrating && (progress.responded.length > 0 || progress.pending.length > 0) ? (
        <View style={styles.chips}>
          {progress.responded.map((id) => (
            <Text key={id} style={[styles.chip, styles.chipDone]}>{`${nameOf(id)} ya respondió`}</Text>
          ))}
          {progress.pending.map((id) => (
            <Text key={id} style={styles.chip}>{`falta ${nameOf(id)}`}</Text>
          ))}
        </View>
      ) : null}

      {turn?.error ? <Text style={styles.error}>{`El DM tuvo un problema y el turno se reabrió: ${turn.error}`}</Text> : null}
      {notice && notice !== turn?.error ? <Text style={styles.notice}>{notice}</Text> : null}

      {progress.canRespond ? (
        <View style={styles.compose}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="¿Qué haces? Escribe tu acción o di que no haces nada."
            placeholderTextColor={theme.colors.inkFaint}
            style={styles.input}
            editable={!busy}
            onFocus={() => {
              setFocused(true)
              onFocusInput?.()
            }}
            onBlur={() => setFocused(false)}
          />
          <Button label="Enviar" primary busy={busy} disabled={text.trim().length === 0} onPress={() => void send()} />
        </View>
      ) : null}
      {turn && turn.status === 'open' && !hasCharacter ? <Text style={styles.sent}>Miras la mesa sin personaje: puedes leer y cerrar el turno, pero no responder.</Text> : null}
      {turn && progress.hasResponded && turn.status === 'open' ? <Text style={styles.sent}>Tu respuesta está enviada.</Text> : null}

      {progress.canClose || progress.canForceClose ? (
        <View style={styles.actions}>
          {progress.canClose ? <Button label="Cerrar turno y narrar" onPress={() => onClose(false)} busy={busy} /> : null}
          {progress.canForceClose ? <Button label="Forzar cierre (anfitrión)" onPress={() => onClose(true)} busy={busy} /> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  statusNarrating: { fontFamily: theme.fonts.serifItalic, color: theme.colors.goldBright },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipDone: { color: theme.colors.gold, borderColor: theme.colors.goldDim, backgroundColor: theme.colors.panel2 },
  error: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 8, padding: 8 },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
  compose: { gap: 8 },
  input: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56, maxHeight: 120, textAlignVertical: 'top' },
  sent: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.gold },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
})
