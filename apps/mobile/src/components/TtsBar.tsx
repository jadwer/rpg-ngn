import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Tts } from '../hooks/useTts'
import { theme } from '../theme'

/** Controles de la narracion por voz: leer, pausa o seguir, siguiente, parar. */
export function TtsBar({ tts }: { tts: Tts }) {
  const { state } = tts
  const active = state.status === 'speaking' || state.status === 'paused'
  const status =
    state.status === 'speaking'
      ? `Leyendo ${state.index + 1} de ${state.total}`
      : state.status === 'paused'
        ? tts.nativePause
          ? `En pausa (${state.index + 1} de ${state.total})`
          : `En pausa; seguir salta al bloque ${Math.min(state.index + 2, state.total)}`
        : state.status === 'done'
          ? 'Lectura terminada'
          : 'Sin narrar'

  return (
    <View style={styles.bar}>
      <View style={styles.buttons}>
        {!active ? <Button label="Leer" onPress={() => tts.start()} primary /> : null}
        {state.status === 'speaking' ? <Button label="Pausa" onPress={tts.pause} /> : null}
        {state.status === 'paused' ? <Button label="Seguir" onPress={tts.resume} primary /> : null}
        {active ? <Button label="Siguiente" onPress={tts.next} /> : null}
        {active ? <Button label="Parar" onPress={tts.stop} /> : null}
      </View>
      <Text style={styles.status}>{tts.error ? `Voz: ${tts.error}` : status}</Text>
    </View>
  )
}

function Button({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primary, pressed && styles.pressed]} accessibilityRole="button">
      <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: { gap: 4 },
  buttons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: theme.colors.panel },
  primary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  buttonText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold, letterSpacing: 0.5 },
  primaryText: { color: '#fff5e1' },
  status: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, fontStyle: 'italic' },
})
