import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

interface Props {
  /** El mapa del pack como fondo; sin mapa, el panel liso. */
  image: string | null
  kicker: string
  title: string
  when: string | null
  pill: string | null
}

/**
 * Cabecera de escena al principio de la narracion (B1, como la web): el
 * mundo, la sesion, el momento del mundo y en que fase va el turno, sobre el
 * mapa del pack. Situa antes de leer.
 */
export function SceneHero({ image, kicker, title, when, pill }: Props) {
  const content = (
    <View style={styles.shade}>
      {pill ? <Text style={styles.pill}>{pill}</Text> : null}
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      {when ? <Text style={styles.when}>{when}</Text> : null}
    </View>
  )
  return image ? (
    <ImageBackground source={{ uri: image }} style={styles.hero} imageStyle={styles.image} resizeMode="cover">
      {content}
    </ImageBackground>
  ) : (
    <View style={[styles.hero, styles.plain]}>{content}</View>
  )
}

const styles = StyleSheet.create({
  hero: { minHeight: 170, borderRadius: theme.radius, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.borderSoft },
  image: { opacity: 0.55 },
  plain: { backgroundColor: theme.colors.panel2 },
  shade: { flex: 1, justifyContent: 'flex-end', padding: 16, gap: 4, backgroundColor: 'rgba(11, 15, 20, 0.45)' },
  pill: { alignSelf: 'flex-start', fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.ink, backgroundColor: theme.colors.highlight, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 6 },
  kicker: { fontFamily: theme.fonts.uiMedium, fontSize: 11, letterSpacing: 0.2, color: theme.colors.accentBright },
  title: { fontFamily: theme.fonts.serifSemiBold, fontSize: 22, color: theme.colors.ink },
  when: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim },
})
