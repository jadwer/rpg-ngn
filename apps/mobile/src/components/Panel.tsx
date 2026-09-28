import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { theme } from '../theme'

/**
 * Titulo de seccion: Cinzel en versales doradas, el de Perfil, Mis mundos y
 * las hojas de la mesa. Antes habia cinco copias del estilo y las hojas
 * usaban la etiqueta gris de los campos, con la misma letra que el texto.
 */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  )
}

/**
 * Una seccion de hoja: superficie translucida sobre la textura, con un
 * resplandor violeta arriba como las tarjetas de Mesas, y su titulo.
 */
export function Panel({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      <LinearGradient colors={['rgba(124, 58, 237, 0.09)', 'rgba(124, 58, 237, 0)']} style={styles.glow} pointerEvents="none" />
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: theme.fonts.display, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  panel: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 72 },
})
