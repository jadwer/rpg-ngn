import { useState } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { theme } from '../theme'

interface Props extends TextInputProps {
  label: string
  hint?: string | undefined
}

/** Campo de texto como el concepto (img/ideas_movil.png): etiqueta en Inter, caja rellena y redondeada, borde violeta con el foco. */
export function Field({ label, hint, style, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.inkFaint}
        style={[styles.input, focused && styles.focused, style]}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.inkDim },
  input: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  focused: { borderColor: theme.colors.accentBright },
  hint: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
})
