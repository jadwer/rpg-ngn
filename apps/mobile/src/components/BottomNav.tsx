import { t } from '@rpg-ngn/i18n'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../theme'
import { Icon, ICON } from './Icon'

export type BottomTab = 'inicio' | 'mundos' | 'mesas' | 'tienda' | 'comunidad'

/** La barra inferior del tablero de Gabino (`mesas_ux.png`, 26-09), la misma que la web a 390. */
export function BottomNav({ active, onSelect }: { active: BottomTab; onSelect: (tab: BottomTab) => void }) {
  const insets = useSafeAreaInsets()
  // Dentro del componente: t() fijaria el idioma al importar el modulo si viviera a nivel de modulo.
  const TABS: ReadonlyArray<{ id: BottomTab; label: string; icon: string }> = [
    { id: 'inicio', label: t('shell.nav.home'), icon: ICON.home },
    { id: 'mundos', label: t('shell.nav.worlds'), icon: ICON.globe },
    { id: 'mesas', label: t('shell.nav.tables'), icon: ICON.tables },
    { id: 'tienda', label: t('shell.nav.shop'), icon: ICON.shop },
    { id: 'comunidad', label: t('shell.nav.community'), icon: ICON.community },
  ]
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
  // Cinco pestañas como la web a 390: cada una a partes iguales.
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  label: { fontFamily: theme.fonts.ui, fontSize: 11 },
})
