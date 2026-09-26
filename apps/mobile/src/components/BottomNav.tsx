import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../theme'
import { Icon, ICON } from './Icon'

export type BottomTab = 'inicio' | 'mundos' | 'mesas' | 'comunidad'

const TABS: ReadonlyArray<{ id: BottomTab; label: string; icon: string }> = [
  { id: 'inicio', label: 'Inicio', icon: ICON.home },
  { id: 'mundos', label: 'Mundos', icon: ICON.globe },
  { id: 'mesas', label: 'Mesas', icon: ICON.tables },
  { id: 'comunidad', label: 'Comunidad', icon: ICON.community },
]

/** La barra inferior del tablero de Gabino (`mesas_ux.png`, 26-09), la misma que la web a 390. */
export function BottomNav({ active, onSelect }: { active: BottomTab; onSelect: (tab: BottomTab) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab) => {
        const on = tab.id === active
        const color = on ? theme.colors.accentBright : theme.colors.inkDim
        return (
          <Pressable key={tab.id} onPress={() => onSelect(tab.id)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Icon d={tab.icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, backgroundColor: 'rgba(11, 15, 20, 0.97)', borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  tab: { alignItems: 'center', gap: 3, minWidth: 64, paddingVertical: 2 },
  label: { fontFamily: theme.fonts.ui, fontSize: 11 },
})
