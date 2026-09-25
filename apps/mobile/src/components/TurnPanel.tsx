import type { TurnView } from '@rpg-ngn/api-client'
import { appendRoll, countdownLine, QUICK_DICE, turnLine, type Countdown, type DiceMode, type TurnProgress } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { HoldDie } from './HoldDie'
import { Icon, ICON } from './Icon'

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
  /** Si a este jugador le falta tirar la Fortuna de la sesion. */
  fortunePending: boolean
  /** Pide la tirada a la API; devuelve el numero que saco el servidor. */
  onFortune: () => Promise<number>
  /** Ideas de accion del DM para este personaje (E10b); el cuadro sigue libre. */
  suggestions: string[]
  /** Se abre solo cuando quien lee bajo hasta el final y el director ya no narra (como la web). */
  autoOpen: boolean
  /** Avisa si el cuadro esta abierto: la escena de fondo cede alto mientras se escribe. */
  onComposingChange?: (open: boolean) => void
}

/**
 * Cuadro de respuesta siempre visible (docs/09): quien respondio y quien
 * falta (nombres, nunca textos), el cuadro para escribir si toca, y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso. Con el
 * teclado abierto los chips se esconden para que el cuadro y Enviar quepan.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, diceMode, countdown, seatsLine, onRespond, onClose, onHold, onTyping, onFocusInput, fortunePending, onFortune, suggestions, autoOpen, onComposingChange }: Props) {
  const [showIdeas, setShowIdeas] = useState(true)
  const [opened, setOpened] = useState(false)
  // Plegado a mano: manda sobre la apertura sola hasta el turno siguiente.
  const [folded, setFolded] = useState(false)
  useEffect(() => {
    setOpened(false)
    setFolded(false)
  }, [turn?.id])
  const [text, setText] = useState('')
  const composing = !folded && (opened || autoOpen || text.length > 0)
  useEffect(() => onComposingChange?.(composing && progress.canRespond), [composing, progress.canRespond, onComposingChange])
  const [focused, setFocused] = useState(false)
  const line = turnLine(turn, progress, nameOf)
  const [fortuneError, setFortuneError] = useState<string | null>(null)
  // Tras caer el dado el cuadro se va sin esperar al siguiente sondeo.
  const [fortuneLanded, setFortuneLanded] = useState(false)
  useEffect(() => {
    if (!fortunePending) setFortuneLanded(false)
  }, [fortunePending])

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    onTyping(false)
    if (await onRespond(value)) setText('')
  }

  return (
    <View style={styles.panel}>
      {/* Con el cuadro de respuesta delante, el turno ya lo dice la cabecera y
          quien falta, Jugadores: aqui solo cuando no toca responder. */}
      {!progress.canRespond ? (
        <View style={styles.statusRow}>
          {progress.narrating ? <ActivityIndicator size="small" color={theme.colors.accentBright} /> : null}
          <Text style={[styles.status, progress.narrating && styles.statusNarrating]} numberOfLines={focused ? 1 : 3}>
            {line}
          </Text>
        </View>
      ) : null}

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


      {turn?.error ? <Text style={styles.error}>{`El DM tuvo un problema y el turno se reabrió: ${turn.error}`}</Text> : null}
      {notice && notice !== turn?.error ? <Text style={styles.notice}>{notice}</Text> : null}

      {/* La Fortuna la tira cada jugador con su dado; el numero lo saca el servidor. */}
      {turn?.status === 'open' && hasCharacter && fortunePending && !fortuneLanded ? (
        <View style={styles.fortune}>
          <HoldDie
            die="1d20"
            label="Fortuna"
            large
            disabled={busy}
            serverRoll={onFortune}
            onRolled={() => {
              setFortuneError(null)
              setTimeout(() => setFortuneLanded(true), 1500)
            }}
            onFailed={(error) => setFortuneError(error instanceof Error ? error.message : 'No se pudo tirar; prueba otra vez.')}
          />
          <View style={styles.fortuneText}>
            <Text style={styles.fortuneTitle}>Tira tu Fortuna.</Text>
            <Text style={styles.fortuneHint}>Mantén presionado el dado y suéltalo. No se te dice para qué sirve.</Text>
            {fortuneError ? <Text style={styles.error}>{fortuneError}</Text> : null}
          </View>
        </View>
      ) : null}

      {progress.canRespond && !composing ? (
        <Pressable
          style={({ pressed }) => [styles.composeBar, pressed && styles.ideaPressed]}
          onPress={() => {
            setFolded(false)
            setOpened(true)
          }}
          accessibilityRole="button"
        >
          <Text style={styles.composeBarText}>¿Qué hace tu personaje?</Text>
          {suggestions.length > 0 ? <Text style={styles.ideasToggle}>{`${suggestions.length} ideas`}</Text> : null}
        </Pressable>
      ) : null}
      {progress.canRespond && composing ? (
        <View style={styles.compose}>
          <Pressable
            style={styles.hide}
            hitSlop={8}
            onPress={() => {
              setOpened(false)
              setFolded(true)
            }}
          >
            <Text style={styles.ideasToggle}>Ocultar</Text>
          </Pressable>
          {!focused ? <Text style={styles.ask}>¿Qué hace tu personaje?</Text> : null}
          {/* Ideas del DM: tocar una la copia al cuadro, donde se edita; escribir otra cosa siempre vale. */}
          {suggestions.length > 0 && !focused ? (
            showIdeas ? (
              <View style={styles.ideas}>
                {suggestions.map((idea) => (
                  <Pressable key={idea} style={({ pressed }) => [styles.idea, pressed && styles.ideaPressed]} disabled={busy} onPress={() => setText(idea)} accessibilityRole="button">
                    <Text style={styles.ideaText}>{idea}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setShowIdeas(false)} hitSlop={8}>
                  <Text style={styles.ideasToggle}>Ocultar ideas</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setShowIdeas(true)} hitSlop={8}>
                <Text style={styles.ideasToggle}>Ver ideas</Text>
              </Pressable>
            )
          ) : null}
          <TextInput
            value={text}
            onChangeText={(value) => {
              setText(value)
              onTyping(value.trim().length > 0)
            }}
            multiline
            maxLength={1000}
            placeholder="Describe tu acción, o di que no haces nada."
            placeholderTextColor={theme.colors.inkFaint}
            style={[styles.input, focused && styles.inputFocused]}
            editable={!busy}
            onFocus={() => {
              setFocused(true)
              onFocusInput?.()
            }}
            onBlur={() => setFocused(false)}
          />
          <Text style={styles.counter}>{`${text.length}/1000`}</Text>
          {/* Tirar por tu cuenta al declarar; cuando el DM pide una tirada, la
              resuelve el motor. En una mesa donde tira el servidor no se
              ofrece: el numero que escribieras se ignoraria. */}
          {diceMode === 'engine' ? (
            <Text style={styles.diceNotice}>En esta mesa los dados los tira el servidor.</Text>
          ) : (
            <View style={styles.dice}>
              {QUICK_DICE.map((die) => (
                <HoldDie key={die} die={die} disabled={busy} onRolled={(roll) => setText((current) => appendRoll(current, roll))} />
              ))}
            </View>
          )}
          <Pressable onPress={() => void send()} disabled={busy || text.trim().length === 0} style={({ pressed }) => [styles.sendButton, (busy || text.trim().length === 0) && styles.sendOff, pressed && styles.sendPressed]} accessibilityRole="button">
            <Icon d={ICON.send} size={18} color="#ffffff" />
            <Text style={styles.sendText}>Enviar acción</Text>
          </Pressable>
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
  ideas: { gap: 8 },
  composeBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 12, backgroundColor: 'rgba(124, 58, 237, 0.14)' },
  composeBarText: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink },
  hide: { alignSelf: 'flex-end' },
  idea: { borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(124, 58, 237, 0.12)' },
  ideaPressed: { backgroundColor: 'rgba(124, 58, 237, 0.26)' },
  ideaText: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink },
  ideasToggle: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.nebula },
  fortune: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 12, backgroundColor: 'rgba(124, 58, 237, 0.12)' },
  fortuneText: { flex: 1, gap: 2 },
  fortuneTitle: { fontFamily: theme.fonts.uiBold, fontSize: 15, color: theme.colors.ink },
  fortuneHint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  ask: { fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: theme.colors.ink },
  inputFocused: { borderColor: theme.colors.accentBright },
  counter: { alignSelf: 'flex-end', fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkFaint, marginTop: -4 },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 12, backgroundColor: theme.colors.accent },
  sendOff: { opacity: 0.45 },
  sendPressed: { opacity: 0.8 },
  sendText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 16, color: '#ffffff' },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  countdownNumber: { fontFamily: theme.fonts.uiSemiBold, fontSize: 22, color: theme.colors.accentBright, minWidth: 28, textAlign: 'center' },
  countdownText: { flex: 1, fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim },
  seats: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, backgroundColor: theme.colors.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink },
  statusNarrating: { fontFamily: theme.fonts.ui, color: theme.colors.goldBright },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 8, padding: 8 },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  compose: { gap: 8 },
  dice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  diceNotice: { fontFamily: theme.fonts.ui, fontSize: 12, lineHeight: 16, color: theme.colors.inkDim },
  diceLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim, marginRight: 2 },
  dieButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.colors.panel },
  dieText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.ink },
  dieDisabled: { opacity: 0.45 },
  diePressed: { opacity: 0.7 },
  input: { fontFamily: theme.fonts.ui, fontSize: 16, lineHeight: 22, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56, maxHeight: 120, textAlignVertical: 'top' },
  sent: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.success },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
})
