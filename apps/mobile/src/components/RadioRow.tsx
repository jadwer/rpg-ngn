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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  rowSelected: { borderColor: theme.colors.gold, backgroundColor: theme.colors.panel2 },
  rowDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  radio: { color: theme.colors.inkDim, fontSize: 16 },
  radioOn: { color: theme.colors.gold },
  text: { flex: 1 },
  label: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  labelOn: { color: theme.colors.goldBright },
  sub: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim },
})
