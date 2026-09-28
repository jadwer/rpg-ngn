import type { ReactNode } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SheetModal } from './SheetModal'

interface Props {
  visible: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Una hoja de la barra del juego (docs/18, D-UX-6): se abre sobre la mesa,
 * se cierra con Cerrar o con el boton atras de Android, y la narracion sigue
 * debajo. Es el cajon de la web en el telefono. Cada seccion va en un `Panel`.
 */
export function GameSheet({ visible, title, onClose, children }: Props) {
  return (
    <SheetModal visible={visible} title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SheetModal>
  )
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
})
