import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { Tts } from '../hooks/useTts'
import { theme } from '../theme'

interface Props {
  tts: Tts
  /** Online: leer solos los bloques que vayan llegando. */
  autoRead?: { value: boolean; onChange: (value: boolean) => void } | undefined
}

/** Controles de la narracion por voz: leer, pausa o seguir, siguiente, parar. */
export function TtsBar({ tts, autoRead }: Props) {
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
      <View style={styles.row}>
        <View style={styles.buttons}>
          {!active ? <Button label="Leer" onPress={() => tts.start()} primary /> : null}
          {state.status === 'speaking' ? <Button label="Pausa" onPress={tts.pause} /> : null}
          {state.status === 'paused' ? <Button label="Seguir" onPress={tts.resume} primary /> : null}
          {active ? <Button label="Siguiente" onPress={tts.next} /> : null}
          {active ? <Button label="Parar" onPress={tts.stop} /> : null}
        </View>
        {autoRead ? (
          <View style={styles.auto}>
            <Text style={styles.autoLabel}>Leer lo nuevo</Text>
            <Switch value={autoRead.value} onValueChange={autoRead.onChange} trackColor={{ true: theme.colors.gold, false: theme.colors.border }} thumbColor={theme.colors.panel} />
          </View>
        ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  buttons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flexShrink: 1 },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoLabel: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  button: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: theme.colors.panel },
  primary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  buttonText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold, letterSpacing: 0.5 },
  primaryText: { color: '#fff5e1' },
  status: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, fontStyle: 'italic' },
})
