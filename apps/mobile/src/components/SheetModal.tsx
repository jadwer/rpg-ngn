import type { ReactNode } from 'react'
import { Modal, StatusBar, StyleSheet, View } from 'react-native'
import { theme } from '../theme'
import { SheetHeader } from './SheetHeader'
import { SheetTexture } from './SheetTexture'

interface Props {
  visible: boolean
  title: string
  onClose: () => void
  /** Lo que hace el boton atras de Android; por omision, cerrar. */
  onBack?: (() => void) | undefined
  back?: { label: string; onPress: () => void } | undefined
  children: ReactNode
}

/**
 * El armazon de toda hoja de la app (Lectura, Anfitrion, Jugadores, la party,
 * el mapa, la voz): modal a pantalla completa sin barra de estado, la textura
 * de fondo y la cabecera comun. Antes cada hoja armaba el suyo y todas eran
 * negro plano (27-09). El cuerpo lo pone cada una.
 */
export function SheetModal({ visible, title, onClose, onBack, back, children }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={onBack ?? onClose}>
      {/* Sin la barra de estado, que tapaba la cabecera (26-09). */}
      <StatusBar hidden />
      <View style={styles.modal}>
        <SheetTexture />
        <SheetHeader title={title} onClose={onClose} back={back} />
        {children}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
})
