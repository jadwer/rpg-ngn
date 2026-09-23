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
      {busy ? <ActivityIndicator size="small" color={primary ? theme.colors.onAccent : theme.colors.accentBright} /> : <Text style={[styles.text, small && styles.smallText, primary && styles.primaryText]}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel3, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  small: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 34, borderRadius: 10 },
  primary: { backgroundColor: theme.colors.accent },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  text: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink, letterSpacing: 0.2 },
  smallText: { fontSize: 13 },
  primaryText: { color: theme.colors.onAccent },
})
