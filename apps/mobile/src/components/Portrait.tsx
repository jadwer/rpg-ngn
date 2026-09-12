import { Image, StyleSheet, Text, View } from 'react-native'
import { portraitSource } from '../pack/portraits'
import { theme } from '../theme'

interface Props {
  path: string | null | undefined
  name: string
  size?: number
  /** Escala de grises: personaje fuera de la mesa. */
  muted?: boolean
}

export function Portrait({ path, name, size = 48, muted = false }: Props) {
  const source = portraitSource(path)
  const box = { width: size, height: size, borderRadius: Math.round(size / 5) }
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
  image: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border },
  muted: { opacity: 0.55 },
  placeholder: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: theme.fonts.displayBold, color: theme.colors.gold },
})
