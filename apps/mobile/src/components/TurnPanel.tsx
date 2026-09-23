import type { TurnView } from '@rpg-ngn/api-client'
import { appendRoll, countdownLine, QUICK_DICE, quickRoll, turnLine, type Countdown, type DiceMode, type TurnProgress } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  hasCharacter: boolean
  /** Quien tira en esta mesa; con `engine` los dados de aqui no pintan nada. */
  diceMode: DiceMode
  /** Cuenta atras antes de narrar, o en espera si alguien pidio un momento. */
  countdown: Countdown
  /** Quien esta, escribe, respondio o se fue (seatsSummary). */
  seatsLine?: string | null | undefined
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
  onHold: (held: boolean) => void
  /** El cuadro tiene texto: la mesa ve "escribiendo". */
  onTyping: (typing: boolean) => void
  /** El cuadro tomo el foco: la pantalla baja la narracion al final para que se vea lo ultimo sobre el teclado. */
  onFocusInput?: (() => void) | undefined
}

/**
 * Cuadro de respuesta siempre visible (docs/09): quien respondio y quien
 * falta (nombres, nunca textos), el cuadro para escribir si toca, y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso. Con el
 * teclado abierto los chips se esconden para que el cuadro y Enviar quepan.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, diceMode, countdown, seatsLine, onRespond, onClose, onHold, onTyping, onFocusInput }: Props) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const line = turnLine(turn, progress, nameOf)

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    onTyping(false)
    if (await onRespond(value)) setText('')
  }

  return (
    <View style={styles.panel}>
      <View style={styles.statusRow}>
        {progress.narrating ? <ActivityIndicator size="small" color={theme.colors.accentBright} /> : null}
        <Text style={[styles.status, progress.narrating && styles.statusNarrating]} numberOfLines={focused ? 1 : 3}>
          {line}
        </Text>
      </View>

      {countdown.active ? (
        <View style={styles.countdown}>
          <Text style={styles.countdownNumber}>{countdown.remaining}</Text>
          <Text style={styles.countdownText}>{countdownLine(countdown)}</Text>
          <Button label="Un momento" small busy={busy} onPress={() => onHold(true)} />
        </View>
      ) : countdown.held ? (
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>{countdownLine(countdown)}</Text>
          <Button label="Seguir" small busy={busy} onPress={() => onHold(false)} />
        </View>
      ) : null}
      {seatsLine && !focused ? <Text style={styles.seats}>{seatsLine}</Text> : null}

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
            onChangeText={(value) => {
              setText(value)
              onTyping(value.trim().length > 0)
            }}
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
          {/* Tirar por tu cuenta al declarar; cuando el DM pide una tirada, la
              resuelve el motor. En una mesa donde tira el servidor no se
              ofrece: el numero que escribieras se ignoraria. */}
          {diceMode === 'engine' ? (
            <Text style={styles.diceNotice}>En esta mesa los dados los tira el servidor.</Text>
          ) : (
            <View style={styles.dice}>
              <Text style={styles.diceLabel}>Tirar</Text>
              {QUICK_DICE.map((die) => (
                <Pressable
                  key={die}
                  onPress={() => setText((current) => appendRoll(current, quickRoll(die)))}
                  disabled={busy}
                  style={({ pressed }) => [styles.dieButton, busy && styles.dieDisabled, pressed && !busy && styles.diePressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Tirar ${die}`}
                >
                  <Text style={styles.dieText}>{die}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}
      {turn && turn.status === 'open' && !hasCharacter ? <Text style={styles.sent}>Miras la mesa sin personaje: puedes leer y cerrar el turno, pero no responder.</Text> : null}
      {turn && progress.hasResponded && turn.status === 'open' && !countdown.active && !countdown.held ? <Text style={styles.sent}>Tu respuesta está enviada.</Text> : null}

      {(progress.canClose && !countdown.active && !countdown.held) || progress.canForceClose ? (
        <View style={styles.actions}>
          {progress.canClose ? <Button label="Cerrar turno y narrar" onPress={() => onClose(false)} busy={busy} /> : null}
          {progress.canForceClose ? <Button label="Forzar cierre (anfitrión)" onPress={() => onClose(true)} busy={busy} /> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  countdownNumber: { fontFamily: theme.fonts.displayBold, fontSize: 22, color: theme.colors.accentBright, minWidth: 28, textAlign: 'center' },
  countdownText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.inkDim },
  seats: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  statusNarrating: { fontFamily: theme.fonts.serifItalic, color: theme.colors.goldBright },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipDone: { color: theme.colors.success, borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: theme.colors.panel2 },
  error: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 8, padding: 8 },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
  compose: { gap: 8 },
  dice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  diceNotice: { fontFamily: theme.fonts.serif, fontSize: 12, lineHeight: 16, color: theme.colors.inkDim },
  diceLabel: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.inkDim, marginRight: 2 },
  dieButton: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.colors.panel },
  dieText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.ink },
  dieDisabled: { opacity: 0.45 },
  diePressed: { opacity: 0.7 },
  input: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56, maxHeight: 120, textAlignVertical: 'top' },
  sent: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.success },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
})
