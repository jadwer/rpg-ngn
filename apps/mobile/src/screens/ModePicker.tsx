/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogoVertical } from '../components/Brand'
import { theme } from '../theme'

interface Props {
  packName: string
  motto: string | null
  onOnline: () => void
  onOffline: () => void
}

const HERO: ImageSourcePropType = require('../../assets/hero-movil.webp')
const WORLDS: Array<{ image: ImageSourcePropType; title: string; text: string }> = [
  { image: require('../../assets/mundo-valdoria.webp'), title: 'Fantasía medieval', text: 'Un pueblo minero, una mina cerrada y viajeros a los que nadie recuerda.' },
  { image: require('../../assets/mundo-boticaria.webp'), title: 'China antigua', text: 'Intriga en palacio: crédito, sospecha y un veneno que nadie nombra.' },
  { image: require('../../assets/mundo-mascarada.webp'), title: 'Romance y máscaras', text: 'Un baile de corte donde cada quien es otra persona esta noche.' },
]

/**
 * La portada de la app (docs/22, "Home Hero"), la misma que la web: la
 * lamina con el logo, el lema y dos puertas. Jugar en mesa es la principal;
 * leer sin conexion se queda como segunda. Debajo, los mundos por escenario,
 * sin nombres de terceros.
 */
export function ModePicker({ packName, onOnline, onOffline }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <ImageBackground source={HERO} style={[styles.hero, { paddingTop: insets.top + 36 }]} resizeMode="cover">
        <View style={styles.veil} />
        <LogoVertical height={190} color="#f1f0fb" />
        <Text style={styles.motto}>WORLDS BORN FROM IMAGINATION</Text>
        <Text style={styles.phrase}>Tu imaginación también es un mundo.</Text>
        <View style={styles.actions}>
          <Pressable onPress={onOnline} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.primaryText}>Entrar a mis mesas</Text>
          </Pressable>
          <Pressable onPress={onOffline} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.secondaryText}>{`Leer ${packName} sin conexión`}</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <View style={styles.section}>
        <Text style={styles.h2}>Un motor. Infinitos mundos.</Text>
        <Text style={styles.body}>Una historia donde tú decides qué pasa: tu novela ligera o tu campaña de rol, con amigos o sola, y un director de juego que no se cansa.</Text>
      </View>

      {WORLDS.map((w) => (
        <View key={w.title} style={styles.world}>
          <Image source={w.image} style={styles.worldImage} resizeMode="cover" />
          <View style={styles.worldText}>
            <Text style={styles.worldTitle}>{w.title}</Text>
            <Text style={styles.worldBody}>{w.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  hero: { minHeight: 620, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 20, 0.45)' },
  motto: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 3, color: theme.colors.accentBright, textAlign: 'center', marginTop: 4 },
  phrase: { fontFamily: theme.fonts.serifItalic, fontSize: 19, color: theme.colors.ink, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 14 },
  primary: { backgroundColor: theme.colors.accent, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: theme.fonts.displayBold, fontSize: 16, color: '#ffffff', letterSpacing: 0.5 },
  secondary: { backgroundColor: 'rgba(22, 29, 46, 0.85)', borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.ink },
  pressed: { opacity: 0.8 },
  section: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 8 },
  h2: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.ink },
  body: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 23, color: theme.colors.inkDim },
  world: { marginHorizontal: 20, marginTop: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.panel2 },
  worldImage: { width: '100%', height: 150 },
  worldText: { padding: 16, gap: 4 },
  worldTitle: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.ink },
  worldBody: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.inkDim },
})
