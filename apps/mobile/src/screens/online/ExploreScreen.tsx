import { ApiError, packArtUrl, packMapUrl, packPortraitUrl, type ApiClient, type CatalogWorldCard, type CatalogWorldDetail } from '@rpg-ngn/api-client'
import { cardView, durationLabel, playersTag } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { LogoHorizontal } from '../../components/Brand'
import { Icon, ICON } from '../../components/Icon'
import { Portrait } from '../../components/Portrait'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  /** "Jugar": crear mesa con ese mundo elegido. */
  onPlay: (packId: string) => void
  /** Mis mundos: subir, revisar y los añadidos. */
  onMine: () => void
  onTab: (tab: BottomTab) => void
  onUnauthorized: () => void
}

/**
 * Explorar mundos en el telefono (E9, `conceptboard_catalog.png` movil,
 * 26-09): buscador, generos en chips y una tarjeta por mundo con su estado;
 * tocar una abre el detalle con personajes y lo que incluye.
 */
export function ExploreScreen({ client, onPlay, onMine, onTab, onUnauthorized }: Props) {
  const insets = useSafeAreaInsets()
  const [worlds, setWorlds] = useState<CatalogWorldCard[] | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [genre, setGenre] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<CatalogWorldDetail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const url = (path: string | null) => (path ? `${client.baseUrl}${path}` : null)

  const load = useCallback(async () => {
    try {
      const result = await client.catalogWorlds({ genre: genre ?? undefined, q: q.trim() || undefined })
      setWorlds(result.worlds)
      if (result.genres.length) setGenres((actual) => (actual.length ? actual : result.genres))
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return onUnauthorized()
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.')
    }
  }, [client, genre, q, onUnauthorized])

  useEffect(() => {
    const timer = setTimeout(() => void load(), q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, q])

  const open = async (world: CatalogWorldCard) => {
    setBusy(world.id)
    try {
      setDetail(await client.catalogWorld(world.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir este mundo.')
    } finally {
      setBusy(null)
    }
  }

  const act = async (world: CatalogWorldCard) => {
    const view = cardView(world)
    if (view.action === 'jugar') return onPlay(world.id)
    if (view.action === 'anadir' && world.packId !== undefined) {
      setBusy(world.id)
      try {
        await client.activatePack(world.packId)
        await load()
        if (detail?.id === world.id) setDetail(await client.catalogWorld(world.id))
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No se pudo añadir el mundo.')
      } finally {
        setBusy(null)
      }
      return
    }
    void open(world)
  }

  if (detail) {
    const view = cardView(detail)
    const cover = url(packArtUrl(detail.id, detail.catalog.cover))
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => setDetail(null)} hitSlop={10} style={styles.back}>
            <Icon d={ICON.back} size={20} color={theme.colors.nebula} />
            <Text style={styles.link}>Explorar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.detail}>
          {cover ? <Image source={{ uri: cover }} style={styles.detailCover} resizeMode="cover" /> : null}
          <Text style={styles.detailTitle}>{detail.name}</Text>
          <View style={styles.chips}>
            {[detail.catalog.genre, `${playersTag(detail.catalog.players)} jugadores`, durationLabel(detail.catalog.duration)].map((c) => (
              <Text key={c} style={styles.chip}>
                {c}
              </Text>
            ))}
          </View>
          <Text style={styles.byline}>{view.byline}</Text>
          <View style={styles.row}>
            {view.action === 'jugar' || view.action === 'anadir' ? (
              <Pressable onPress={() => void act(detail)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} accessibilityRole="button">
                {busy === detail.id ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.ctaText}>{view.label}</Text>}
              </Pressable>
            ) : null}
            {view.price ? <Text style={styles.price}>{view.price}</Text> : null}
            {view.badge ? <Text style={styles.badgeText}>{view.badge}</Text> : null}
          </View>
          {view.hint ? <Text style={styles.byline}>{view.hint}</Text> : null}
          <Text style={styles.synopsis}>{detail.catalog.synopsis}</Text>

          {detail.maps.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {detail.maps.map((m) => (
                <Image key={m.id} source={{ uri: url(packMapUrl(detail.id, m.image)) ?? '' }} style={styles.galleryImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : null}

          {detail.playable.length ? (
            <>
              <Text style={styles.h2}>Personajes jugables</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                {detail.playable.map((c) => (
                  <View key={c.id} style={styles.pj}>
                    <Portrait path={null} uri={url(packPortraitUrl(detail.id, c.portrait))} name={c.name} size={84} />
                    <Text style={styles.pjName}>{c.name}</Text>
                    {c.role ? <Text style={styles.pjRole}>{c.role}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.box}>
            <Text style={styles.h2}>Qué incluye</Text>
            <Text style={styles.item}>Escenario completo</Text>
            <Text style={styles.item}>{`${detail.characters} personajes jugables con trasfondo`}</Text>
            {detail.maps.length ? <Text style={styles.item}>{detail.maps.length === 1 ? `Mapa de ${detail.maps[0]!.name}` : `${detail.maps.length} mapas`}</Text> : null}
            <Text style={styles.item}>{detail.sessions === 1 ? 'Una sesión con su misión' : `${detail.sessions} sesiones y misiones`}</Text>
            <Text style={styles.item}>Director de juego por IA</Text>
            <Text style={styles.meta}>{`Autor: ${detail.catalog.author}`}</Text>
          </View>
        </ScrollView>
        <BottomNav active="mundos" onSelect={onTab} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <LogoHorizontal height={28} color={theme.colors.ink} />
        <Pressable onPress={onMine} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>Mis mundos</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Mundos</Text>
        <Text style={styles.subtitle}>Historias que existen porque tú las viviste</Text>
        <View style={styles.search}>
          <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4" size={18} color={theme.colors.inkDim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Buscar mundos…" placeholderTextColor={theme.colors.inkFaint} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[null, ...genres].map((g) => (
            <Pressable key={g ?? 'todos'} onPress={() => setGenre(g)} style={[styles.filter, genre === g && styles.filterOn]}>
              <Text style={[styles.filterText, genre === g && styles.filterTextOn]}>{g ?? 'Todos'}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {worlds === null ? <ActivityIndicator color={theme.colors.accentBright} /> : null}
        {worlds?.length === 0 ? <Text style={styles.meta}>Ningún mundo coincide.</Text> : null}

        <View style={styles.grid}>
          {worlds?.map((world) => {
            const view = cardView(world)
            const cover = url(packArtUrl(world.id, world.catalog.cover))
            return (
              <View key={world.id} style={[styles.card, (world.state === 'tuyo' || world.state === 'pase') && styles.cardOwned]}>
                <Pressable onPress={() => void open(world)} accessibilityRole="button">
                  <View style={styles.coverBox}>
                    {cover ? <Image source={{ uri: cover }} style={[styles.cover, view.action === 'bloqueado' && styles.coverLocked]} resizeMode="cover" /> : null}
                    {view.badge ? <Text style={styles.badge}>{view.badge}</Text> : null}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {world.name}
                    </Text>
                    <Text style={styles.meta}>{view.price ?? view.hint ?? view.byline}</Text>
                    {view.progress !== null ? (
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${Math.round(view.progress * 100)}%` }]} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable onPress={() => void act(world)} style={({ pressed }) => [styles.cardBtn, view.action === 'comprar' || view.action === 'bloqueado' ? styles.cardBtnOutline : null, pressed && styles.pressed]} accessibilityRole="button">
                  {busy === world.id ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.cardBtnText}>{view.label}</Text>}
                </Pressable>
              </View>
            )
          })}
        </View>
      </ScrollView>
      <BottomNav active="mundos" onSelect={onTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.nebula },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontFamily: theme.fonts.display, fontSize: 32, color: '#ffffff' },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.panel },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink },
  chipsRow: { gap: 8, paddingRight: 16 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  filterOn: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.25)' },
  filterText: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  filterTextOn: { color: '#ffffff' },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  meta: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  cardOwned: { borderColor: theme.colors.goldDim },
  coverBox: { aspectRatio: 1.1, backgroundColor: theme.colors.panel2 },
  cover: { width: '100%', height: '100%' },
  coverLocked: { opacity: 0.45 },
  badge: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(11,15,20,0.85)', color: theme.colors.goldBright, fontFamily: theme.fonts.ui, fontSize: 11, overflow: 'hidden' },
  cardBody: { padding: 10, gap: 4 },
  cardTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: '#ffffff' },
  bar: { height: 5, borderRadius: 3, backgroundColor: theme.colors.panel3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.accentBright },
  cardBtn: { margin: 10, marginTop: 0, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent },
  cardBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.accentBright },
  cardBtnText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: '#ffffff' },
  pressed: { opacity: 0.8 },
  detail: { padding: 16, gap: 10, paddingBottom: 32 },
  detailCover: { width: '100%', aspectRatio: 1.6, borderRadius: 14 },
  detailTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 28, color: '#ffffff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
  byline: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cta: { minWidth: 140, minHeight: 46, paddingHorizontal: 20, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent },
  ctaText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 16, color: '#ffffff' },
  price: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink },
  badgeText: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.goldBright },
  synopsis: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink },
  gallery: { gap: 10, paddingRight: 16 },
  galleryImage: { width: 180, height: 130, borderRadius: 10 },
  h2: { fontFamily: theme.fonts.serifSemiBold, fontSize: 20, color: theme.colors.ink, marginTop: 6 },
  pj: { width: 90, alignItems: 'center', gap: 3 },
  pjName: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.ink },
  pjRole: { fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.inkDim, textAlign: 'center' },
  box: { gap: 6, padding: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.panel, marginTop: 6 },
  item: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.ink },
})
