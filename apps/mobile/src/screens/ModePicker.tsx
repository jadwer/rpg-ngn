/* eslint-disable @typescript-eslint/no-require-imports -- React Native exige require() estatico por imagen empaquetada. */
import { createApiClient, normalizeBaseUrl, packArtUrl, type CatalogWorldCard, type SeasonPassOffer, type SeasonPath } from '@rpg-ngn/api-client'
import { cardView, passView } from '@rpg-ngn/ui-logic'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomNav, type BottomTab } from '../components/BottomNav'
import { Isotipo, LogoHorizontal, LogoVertical } from '../components/Brand'
import { storage } from '../online/storage'
import { theme } from '../theme'

interface Props {
  packName: string
  motto: string | null
  onOnline: () => void
  onOffline: () => void
  /** La barra inferior: Mundos, Mesas y Comunidad entran a la app en esa pestaña. */
  onTab: (tab: BottomTab) => void
}

/** Mundos que caben en el carrusel antes del hueco "Proximamente". */
const FILA = 4

interface Live {
  worlds: CatalogWorldCard[]
  season: SeasonPath | null
  pass: SeasonPassOffer | null
  base: string
}

/**
 * El catalogo, para que el Inicio diga lo mismo que la web. Con sesion
 * guardada pregunta con ella (el camino dice lo tuyo, como en Mundos); si la
 * sesion caduco, sin ella. Sin red, null y las tarjetas de siempre.
 */
function useCatalog(): Live | null {
  const [live, setLive] = useState<Live | null>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      const [url, token] = await Promise.all([storage.serverUrl(), storage.token()])
      const baseUrl = normalizeBaseUrl(url)
      for (const withToken of token ? [token, null] : [null]) {
        try {
          const client = createApiClient({ baseUrl, tokenProvider: () => withToken })
          const r = await client.catalogWorlds()
          if (alive) setLive({ worlds: r.worlds.filter((w) => w.origin === 'oficial'), season: r.season, pass: r.pass, base: client.baseUrl })
          return
        } catch {
          // Con token caducado se intenta sin el; sin red no hay mas que hacer.
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return live
}

const HERO: ImageSourcePropType = require('../../assets/hero-movil.webp')
// Respaldo sin conexion (el Inicio tambien es la puerta a leer sin red).
const WORLDS: Array<{ image: ImageSourcePropType; title: string; tags: string[] }> = [
  { image: require('../../assets/mundo-valdoria.webp'), title: 'Fantasía medieval', tags: ['Aventura', 'Dados'] },
  { image: require('../../assets/mundo-boticaria.webp'), title: 'China antigua', tags: ['Intriga', 'Misterio'] },
  { image: require('../../assets/mundo-mascarada.webp'), title: 'Romance', tags: ['Drama', 'Social'] },
]

/** Degradado de las tarjetas: transparente arriba, casi negro donde va el texto. */
const VELO = ['rgba(11, 15, 20, 0)', 'rgba(11, 15, 20, 0.55)', 'rgba(11, 15, 20, 0.92)'] as const

/**
 * La portada de la app segun la version movil de img/branding/concepto
 * home.png (la misma propuesta que la web): barra con el logo horizontal,
 * lamina con el emblema y el llamado, "Un motor. Infinitos mundos." y los
 * mundos destacados en carrusel. Desde el 26-09 las tarjetas salen del
 * catalogo con su estado, como en la web, con la temporada y el pase debajo
 * y la barra inferior de las demas pantallas.
 */
export function ModePicker({ packName, onOnline, onOffline, onTab }: Props) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  // El carrusel corre a todo lo ancho pero arranca donde arranca el texto (columna de 960).
  const inset = Math.max(20, (width - 960) / 2 + 20)
  const live = useCatalog()
  const destacados = (live?.worlds ?? []).slice(0, FILA)
  const pase = passView(live?.pass ?? null)
  const names = Object.fromEntries((live?.worlds ?? []).map((w) => [w.id, w.name]))
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
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
            <Text style={styles.ctaText}>COMIENZA TU HISTORIA →</Text>
          </Pressable>
        </ImageBackground>

        {/* En tablet el contenido se centra con un ancho maximo; el hero y el carrusel van a todo lo ancho. */}
        <View style={styles.column}>
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
            <Pressable onPress={() => onTab('mundos')} hitSlop={8}>
              <Text style={styles.seeAll}>Ver todos →</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.carousel, { paddingHorizontal: inset }]}>
          {live
            ? destacados.map((w) => {
                const view = cardView(w)
                const cover = packArtUrl(w.id, w.catalog.cover)
                return (
                  <Pressable key={w.id} onPress={() => onTab('mundos')} style={styles.world} accessibilityRole="button" accessibilityLabel={w.name}>
                    <ImageBackground source={cover ? { uri: `${live.base}${cover}` } : WORLDS[0]!.image} style={styles.worldImage} resizeMode="cover">
                      {/* Degradado real abajo: el texto sobre la portada se perdia y el velo por escalones marcaba una linea (Gabino, 26-09). */}
                      <LinearGradient colors={VELO} locations={[0.3, 0.55, 0.85]} style={styles.worldLive}>
                        <Text style={styles.worldKicker}>{w.catalog.genre}</Text>
                        <Text style={styles.worldTitle}>{w.name}</Text>
                        <Text style={styles.worldState}>{view.badge ?? view.hint ?? view.price ?? ''}</Text>
                      </LinearGradient>
                    </ImageBackground>
                  </Pressable>
                )
              })
            : WORLDS.map((w) => (
                <Pressable key={w.title} onPress={onOnline} style={styles.world} accessibilityRole="button">
                  <ImageBackground source={w.image} style={styles.worldImage} resizeMode="cover">
                    <LinearGradient colors={VELO} locations={[0.3, 0.55, 0.85]} style={styles.worldLive}>
                      <Text style={styles.worldTitle}>{w.title}</Text>
                      <View style={styles.tags}>
                        {w.tags.map((t) => (
                          <Text key={t} style={styles.tag}>
                            {t}
                          </Text>
                        ))}
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              ))}
          {live && destacados.length < FILA ? (
            <View style={[styles.world, styles.proximo]}>
              <Isotipo height={40} color={theme.colors.inkFaint} />
              <Text style={styles.worldKicker}>Próximamente</Text>
              <Text style={styles.proximoText}>Un mundo nuevo se está escribiendo.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.column}>
          {live?.season && live.season.worlds.length > 0 ? (
            <Pressable onPress={() => onTab('mundos')} style={styles.season} accessibilityRole="button">
              <View style={styles.seasonHead}>
                <Text style={styles.seasonKicker}>{live.season.name}</Text>
                {live.season.chapters > 0 ? <Text style={styles.seasonChapters}>{`${live.season.chapters} ${live.season.chapters === 1 ? 'capítulo' : 'capítulos'}`}</Text> : null}
              </View>
              <Text style={styles.seasonTitle}>Caminos que se abren jugando</Text>
              <Text style={styles.body}>Cada turno que juegas es un capítulo. Los capítulos abren mundos nuevos, y lo que abres se queda contigo.</Text>
              <Text style={styles.seasonPath}>
                {live.season.worlds.map((w) => `${names[w.packId] ?? w.packId}: ${w.threshold === 0 ? 'gratis' : w.unlocked ? 'abierto' : `${w.threshold} capítulos`}`).join('  ·  ')}
              </Text>
              {pase ? (
                <View style={styles.pass}>
                  <Text style={styles.passTitle}>Pase de temporada · Capítulos x2</Text>
                  <Text style={styles.passPrice}>{pase.owned ? 'Ya es tuyo esta temporada' : `${pase.price}, pago único`}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          <Text style={styles.offline}>{`Sin conexión puedes leer ${packName}: sus sesiones, fichas y reglas.`}</Text>
        </View>
      </ScrollView>
      <BottomNav active="inicio" onSelect={onTab} />
    </View>
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
  column: { width: '100%', maxWidth: 960, alignSelf: 'center' },
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
  worldLive: { flex: 1, justifyContent: 'flex-end', padding: 12, gap: 4 },
  worldTitle: { fontFamily: theme.fonts.display, fontSize: 15, color: '#ffffff' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { fontFamily: theme.fonts.serif, fontSize: 11, color: theme.colors.ink, borderWidth: 1, borderColor: 'rgba(229, 231, 235, 0.35)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  worldKicker: { fontFamily: theme.fonts.uiMedium, fontSize: 10, letterSpacing: 1.5, color: theme.colors.gold, textTransform: 'uppercase' },
  worldState: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: '#d8ccff', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowRadius: 4 },
  proximo: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border },
  proximoText: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center' },
  season: { marginHorizontal: 20, marginTop: 24, padding: 16, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  seasonHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  seasonKicker: { fontFamily: theme.fonts.uiMedium, fontSize: 11, letterSpacing: 1.5, color: theme.colors.gold, textTransform: 'uppercase' },
  seasonChapters: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.accentBright },
  seasonTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.ink },
  seasonPath: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  pass: { marginTop: 4, padding: 12, gap: 2, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.45)', backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  passTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 15, color: theme.colors.gold },
  passPrice: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.ink },
  offline: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkFaint, paddingHorizontal: 20, paddingTop: 18 },
})
