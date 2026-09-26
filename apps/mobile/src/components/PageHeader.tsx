import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../theme'
import { LogoHorizontal } from './Brand'

/**
 * La cabecera de las subpantallas (Mis mundos, Tu perfil) con el aire de Mesas
 * y Mundos: volver a la izquierda, el logo al centro y una accion a la
 * derecha. Sustituye a la barra lisa con el titulo pequeño (26-09).
 */
export function PageHeader({ back, onBack, right }: { back: string; onBack: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.side} accessibilityRole="button">
        <Text style={styles.link} numberOfLines={1}>{`‹ ${back}`}</Text>
      </Pressable>
      <LogoHorizontal height={28} color={theme.colors.ink} />
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  side: { minWidth: 90, height: 34, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  link: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula },
})
