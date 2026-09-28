/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native'
import { theme } from '../theme'

/** La parte oscura de `img/assets/backgrounds/backgrounds.png`: nebulosa, hiedra y la rosa de los vientos. */
const ANGOSTA: ImageSourcePropType = require('../../assets/textura-hoja.webp')
const ANCHA: ImageSourcePropType = require('../../assets/textura-hoja-ancha.webp')

/**
 * El fondo de las hojas de la mesa (27-09): un resplandor violeta arriba y la
 * textura del fondo de Mesas abajo, fundida con el color de la pantalla para
 * que nunca compita con el texto. Va detras de todo, sin tocar los gestos.
 */
export function SheetTexture() {
  const { width } = useWindowDimensions()
  const wide = width > 600
  const alto = width * (wide ? 554 / 1145 : 554 / 640)
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['rgba(124, 58, 237, 0.10)', 'rgba(124, 58, 237, 0)']} style={styles.glow} />
      <Image source={wide ? ANCHA : ANGOSTA} style={[styles.texture, { width, height: alto }]} resizeMode="cover" />
      <LinearGradient colors={[theme.colors.bg, 'rgba(11, 15, 20, 0)']} style={[styles.fade, { bottom: alto * 0.5, height: alto * 0.5 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  texture: { position: 'absolute', left: 0, bottom: 0, opacity: 0.85 },
  fade: { position: 'absolute', left: 0, right: 0 },
})
