import type { ReactNode } from 'react'
import { Modal, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { theme } from '../theme'
import { SheetHeader } from './SheetHeader'

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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={onClose}>
      {/* Sin la barra de estado, que tapaba la cabecera (26-09). */}
      <StatusBar hidden />
      <View style={styles.modal}>
        <SheetHeader title={title} onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
})
