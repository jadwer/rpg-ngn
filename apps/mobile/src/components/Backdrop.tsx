/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from 'react-native'

const VERTICAL: ImageSourcePropType = require('../../assets/fondo-mesas.webp')
const ANCHO: ImageSourcePropType = require('../../assets/fondo-mesas-ancho.webp')

/**
 * El fondo de las pantallas de la app (`mesas_ux.png`): la escena arriba y
 * su parte oscura detras del contenido, a lo ancho de la pantalla y con su
 * proporcion. Va como primer hijo del ScrollView para que se desplace con
 * el contenido. En horizontal, el recorte ancho; el vertical se pixelaba.
 */
export function Backdrop() {
  const { width, height } = useWindowDimensions()
  const landscape = width > height
  return <Image source={landscape ? ANCHO : VERTICAL} style={[styles.backdrop, { width, height: width * (landscape ? 1024 / 1145 : 1024 / 367) }]} resizeMode="cover" />
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0 },
})
