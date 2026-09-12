import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { theme } from '../theme'

interface Props {
  label: string
  onPress: () => void
  primary?: boolean
  disabled?: boolean
  busy?: boolean
  small?: boolean
}

/** Boton del tema: borde dorado sobre panel, o relleno granate si es la accion principal. */
export function Button({ label, onPress, primary = false, disabled = false, busy = false, small = false }: Props) {
  const off = disabled || busy
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [styles.button, small && styles.small, primary && styles.primary, off && styles.disabled, pressed && !off && styles.pressed]} accessibilityRole="button" accessibilityState={{ disabled: off }}>
      {busy ? <ActivityIndicator size="small" color={primary ? theme.colors.onAccent : theme.colors.gold} /> : <Text style={[styles.text, small && styles.smallText, primary && styles.primaryText]}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: theme.colors.panel, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  small: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 },
  primary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  text: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.gold, letterSpacing: 0.5 },
  smallText: { fontSize: 13 },
  primaryText: { color: theme.colors.onAccent },
})
