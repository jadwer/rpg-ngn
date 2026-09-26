/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native'
import { theme } from '../theme'

const VERTICAL: ImageSourcePropType = require('../../assets/fondo-mesas.webp')
const ANCHO: ImageSourcePropType = require('../../assets/fondo-mesas-ancho.webp')

/**
 * El fondo de las pantallas de la app (`mesas_ux.png`): la escena arriba y
 * su parte oscura detras del contenido, a lo ancho de la pantalla y con su
 * proporcion. Va como primer hijo del ScrollView para que se desplace con
 * el contenido. En horizontal, el recorte ancho; el vertical se pixelaba.
 *
 * El tercio de abajo se funde con el color de la pantalla: la imagen
 * terminaba en una linea recta a media lista (Gabino, 26-09).
 */
export function Backdrop() {
  const { width, height } = useWindowDimensions()
  const landscape = width > height
  const alto = width * (landscape ? 1024 / 1145 : 1024 / 367)
  return (
    <View style={[styles.backdrop, { width, height: alto }]} pointerEvents="none">
      <Image source={landscape ? ANCHO : VERTICAL} style={{ width, height: alto }} resizeMode="cover" />
      <LinearGradient colors={['rgba(11, 15, 20, 0)', theme.colors.bg]} locations={[0, 1]} style={[styles.fade, { height: alto * 0.4 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
})
