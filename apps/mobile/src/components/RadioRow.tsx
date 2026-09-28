import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

interface Props {
  label: string
  sub?: string | null | undefined
  selected: boolean
  disabled?: boolean | undefined
  onSelect: () => void
}

/** Una opcion de una lista excluyente (presets del DM), con el mismo dibujo que las voces del selector. */
export function RadioRow({ label, sub, selected, disabled = false, onSelect }: Props) {
  return (
    <Pressable onPress={onSelect} disabled={disabled} style={({ pressed }) => [styles.row, selected && styles.rowSelected, disabled && styles.rowDisabled, pressed && !disabled && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected, disabled }}>
      <Text style={[styles.radio, selected && styles.radioOn]}>{selected ? '◉' : '○'}</Text>
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={2}>
          {label}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(11, 15, 20, 0.55)', borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rowSelected: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.14)' },
  rowDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  radio: { color: theme.colors.inkDim, fontSize: 16 },
  radioOn: { color: theme.colors.accentBright },
  text: { flex: 1 },
  label: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink },
  labelOn: { color: '#ffffff' },
  sub: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
})
