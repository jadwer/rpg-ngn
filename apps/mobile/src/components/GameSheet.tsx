import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

interface Props {
  visible: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Una hoja de la barra del juego (docs/18, D-UX-6): se abre sobre la mesa,
 * se cierra con Cerrar o con el boton atras de Android, y la narracion sigue
 * debajo. Es el cajon de la web en el telefono.
 */
export function GameSheet({ visible, title, onClose, children }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.side} />
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.side} accessibilityRole="button">
            <Text style={styles.close}>Cerrar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  side: { width: 64, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: theme.colors.ink, letterSpacing: 0.2 },
  close: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
})
