/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogoHorizontal, LogoVertical } from '../components/Brand'
import { theme } from '../theme'

interface Props {
  packName: string
  motto: string | null
  onOnline: () => void
  onOffline: () => void
}

const HERO: ImageSourcePropType = require('../../assets/hero-movil.webp')
const WORLDS: Array<{ image: ImageSourcePropType; title: string; tags: string[] }> = [
  { image: require('../../assets/mundo-valdoria.webp'), title: 'Fantasía medieval', tags: ['Aventura', 'Dados'] },
  { image: require('../../assets/mundo-boticaria.webp'), title: 'China antigua', tags: ['Intriga', 'Misterio'] },
  { image: require('../../assets/mundo-mascarada.webp'), title: 'Romance', tags: ['Drama', 'Social'] },
]

/**
 * La portada de la app segun la version movil de img/branding/concepto
 * home.png (la misma propuesta que la web): barra con el logo horizontal,
 * lamina con el emblema y el llamado, "Un motor. Infinitos mundos." y los
 * mundos destacados en carrusel, por escenario y sin nombres de terceros.
 */
export function ModePicker({ packName, onOnline, onOffline }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <LogoHorizontal height={30} color="#f1f0fb" />
      </View>

      <ImageBackground source={HERO} style={styles.hero} resizeMode="cover">
        <View style={styles.veil} />
        {/* El logo completo en vector, como en la web: el hero ya no lo trae pintado (25-09). */}
        <View style={styles.emblem}>
          <LogoVertical height={190} color="#f1f0fb" />
          <Text style={styles.motto}>WORLDS BORN FROM IMAGINATION</Text>
        </View>
        <Text style={styles.phrase}>Tu imaginación también es un mundo.</Text>
        <Pressable onPress={onOnline} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.ctaText}>COMIENZA TU HISTORIA  →</Text>
        </Pressable>
      </ImageBackground>

      <View style={styles.section}>
        <Text style={styles.h2}>Un motor.{'\n'}Infinitos mundos.</Text>
        <Text style={styles.body}>Explora, crea y vive historias en cualquier universo: tu novela ligera o tu campaña de rol, con amigos o sola, y un director de juego que no se cansa. Tú decides el mundo.</Text>
        <View style={styles.row}>
          <Pressable onPress={onOnline} style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>Explorar mundos</Text>
          </Pressable>
          <Pressable onPress={onOffline} style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.btnOutlineText}>Leer sin conexión</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.h3}>MUNDOS DESTACADOS</Text>
        <Pressable onPress={onOnline} hitSlop={8}>
          <Text style={styles.seeAll}>Ver todos →</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {WORLDS.map((w) => (
          <Pressable key={w.title} onPress={onOnline} style={styles.world} accessibilityRole="button">
            <ImageBackground source={w.image} style={styles.worldImage} resizeMode="cover">
              <View style={styles.worldShade}>
                <Text style={styles.worldTitle}>{w.title}</Text>
                <View style={styles.tags}>
                  {w.tags.map((t) => (
                    <Text key={t} style={styles.tag}>
                      {t}
                    </Text>
                  ))}
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.offline}>{`Sin conexión puedes leer ${packName}: sus sesiones, fichas y reglas.`}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  bar: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  hero: { minHeight: 560, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 28, gap: 14 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 20, 0.35)' },
  emblem: { alignItems: 'center', gap: 10, marginBottom: 'auto', marginTop: 32 },
  motto: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 3.5, color: '#f1f0fb', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  phrase: { fontFamily: theme.fonts.serifItalic, fontSize: 22, lineHeight: 28, color: '#f1f0fb', textAlign: 'center' },
  cta: { backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 26, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: theme.fonts.displayBold, fontSize: 13, letterSpacing: 1.5, color: '#ffffff' },
  pressed: { opacity: 0.8 },
  section: { paddingHorizontal: 20, paddingTop: 28, gap: 10 },
  h2: { fontFamily: theme.fonts.display, fontSize: 24, lineHeight: 30, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 23, color: theme.colors.inkDim },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: theme.colors.accent, borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontFamily: theme.fonts.display, fontSize: 14, color: '#ffffff' },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.ink },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 12 },
  h3: { fontFamily: theme.fonts.display, fontSize: 14, letterSpacing: 1.5, color: theme.colors.ink },
  seeAll: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.accentBright },
  carousel: { paddingHorizontal: 20, gap: 12 },
  world: { width: 170, height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.panel2 },
  worldImage: { flex: 1, overflow: 'hidden' },
  worldShade: { flex: 1, justifyContent: 'flex-end', padding: 12, gap: 6, backgroundColor: 'rgba(11, 15, 20, 0.35)' },
  worldTitle: { fontFamily: theme.fonts.display, fontSize: 15, color: '#ffffff' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { fontFamily: theme.fonts.serif, fontSize: 11, color: theme.colors.ink, borderWidth: 1, borderColor: 'rgba(229, 231, 235, 0.35)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  offline: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkFaint, paddingHorizontal: 20, paddingTop: 18 },
})
