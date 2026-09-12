import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { theme } from '../theme'

interface Props extends TextInputProps {
  label: string
  hint?: string | undefined
}

/** Campo de texto con etiqueta en versalitas, como las secciones de la ficha. */
export function Field({ label, hint, style, ...input }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={theme.colors.inkFaint} style={[styles.input, style]} {...input} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  input: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  hint: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim },
})
