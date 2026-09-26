import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

/**
 * La cabecera de todas las hojas de la app: volver a la izquierda (si hay a
 * donde), el titulo al centro y Cerrar siempre a la derecha. Antes cada hoja
 * la armaba a mano y el mapa ponia Cerrar a la izquierda (VAM 26-09, D5 y D6).
 */
export function SheetHeader({ title, onClose, back }: { title: string; onClose?: (() => void) | undefined; back?: { label: string; onPress: () => void } | undefined }) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {back ? (
          <Pressable onPress={back.onPress} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link} numberOfLines={1}>{`‹ ${back.label}`}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>Cerrar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft, backgroundColor: theme.colors.bg },
  side: { width: 88 },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: theme.colors.ink, letterSpacing: 0.2 },
  link: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula },
})
