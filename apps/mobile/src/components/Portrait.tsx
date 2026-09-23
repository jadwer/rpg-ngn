import { Image, StyleSheet, Text, View } from 'react-native'
import { portraitSource } from '../pack/portraits'
import { theme } from '../theme'

interface Props {
  path: string | null | undefined
  /** Retrato servido por la API (packs que la app no lleva dentro); manda sobre `path`. */
  uri?: string | null | undefined
  name: string
  size?: number
  /** Escala de grises: personaje fuera de la mesa. */
  muted?: boolean
  /** Circulo en vez de esquinas redondeadas (listas de jugadores del concepto). */
  round?: boolean
}

export function Portrait({ path, uri, name, size = 48, muted = false, round = false }: Props) {
  const source = uri ? { uri } : portraitSource(path)
  const box = { width: size, height: size, borderRadius: round ? size / 2 : Math.round(size / 5) }
  if (source) {
    return <Image source={source} style={[styles.image, box, muted && styles.muted]} accessibilityLabel={`Retrato de ${name}`} />
  }
  return (
    <View style={[styles.placeholder, box]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{name.charAt(0)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.borderSoft },
  muted: { opacity: 0.55 },
  placeholder: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.accentBright },
})
