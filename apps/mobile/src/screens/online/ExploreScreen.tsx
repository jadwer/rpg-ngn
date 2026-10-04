import { t, LANGUAGES, language, type Language } from '@rpg-ngn/i18n'
import { ApiError, packArtUrl, packMapUrl, packPortraitUrl, type ApiClient, type CatalogWorldCard, type CatalogWorldDetail, type SeasonPassOffer, type SeasonPath } from '@rpg-ngn/api-client'
import { languageCodes, worldLanguageNote, worldLanguages, durationLabel, passView, playersTag, ratingLine, seasonPathLine, seasonProgress } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, useWindowDimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTopInset } from '../../hooks/useTopInset'
import { Backdrop } from '../../components/Backdrop'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { TopBar } from '../../components/TopBar'
import { Icon, ICON } from '../../components/Icon'
import { Portrait } from '../../components/Portrait'
import { appCardView } from '../../online/storeRules'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  /** "Jugar": crear mesa con ese mundo elegido. */
  onPlay: (packId: string) => void
  /** Mis mundos: subir, revisar y los añadidos. */
  onMine: () => void
  onTab: (tab: BottomTab) => void
  /** El pase de descubridor y la coleccion. */
  onSeason: () => void
  onUnauthorized: () => void
}

/**
 * Explorar mundos en el telefono (E9, `conceptboard_catalog.png` movil,
 * 26-09): buscador, generos en chips y una tarjeta por mundo con su estado;
 * tocar una abre el detalle con personajes y lo que incluye.
 */
export function ExploreScreen({ client, onSeason, onPlay, onMine, onTab, onUnauthorized }: Props) {
  const topInset = useTopInset()
  // En tablet, tres columnas y el contenido centrado.
  const wide = useWindowDimensions().width >= 700
  const [worlds, setWorlds] = useState<CatalogWorldCard[] | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [season, setSeason] = useState<SeasonPath | null>(null)
  const [pass, setPass] = useState<SeasonPassOffer | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [genre, setGenre] = useState<string | null>(null)
  // Idioma del mundo, como el filtro de la web (paridad, 02-10).
  const [lang, setLang] = useState<Language | null>(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<CatalogWorldDetail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const url = (path: string | null) => (path ? `${client.baseUrl}${path}` : null)
  const offer = passView(pass)

  const load = useCallback(async () => {
    try {
      const result = await client.catalogWorlds({ genre: genre ?? undefined, q: q.trim() || undefined, language: lang ?? undefined })
      setWorlds(result.worlds)
      setSeason(result.season)
      setPass(result.pass)
      setNames((actual) => ({ ...actual, ...Object.fromEntries(result.worlds.map((w) => [w.id, w.name])) }))
      if (result.genres.length) setGenres((actual) => (actual.length ? actual : result.genres))
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return onUnauthorized()
      setError(e instanceof ApiError ? e.message : t('play.catalogLoadFailed'))
    }
  }, [client, genre, q, lang, onUnauthorized])

  useEffect(() => {
    const timer = setTimeout(() => void load(), q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, q])

  const open = async (world: CatalogWorldCard) => {
    setBusy(world.id)
    try {
      setDetail(await client.catalogWorld(world.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('play.worldOpenFailed'))
    } finally {
      setBusy(null)
    }
  }

  const act = async (world: CatalogWorldCard) => {
    const view = appCardView(world)
    if (view.action === 'jugar') return onPlay(world.id)
    if (view.action === 'anadir' && world.packId !== undefined) {
      setBusy(world.id)
      try {
        await client.activatePack(world.packId)
        await load()
        if (detail?.id === world.id) setDetail(await client.catalogWorld(world.id))
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('play.worldAddFailed'))
      } finally {
        setBusy(null)
      }
      return
    }
    void open(world)
  }

  if (detail) {
    const view = appCardView(detail)
    const cover = url(packArtUrl(detail.id, detail.catalog.cover))
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: topInset + 8 }]}>
          <Pressable onPress={() => setDetail(null)} hitSlop={10} style={styles.back}>
            <Icon d={ICON.back} size={20} color={theme.colors.nebula} />
            <Text style={styles.link}>{t('home.explorar')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Backdrop />
          <View style={styles.detail}>
          {cover ? <Image source={{ uri: cover }} style={styles.detailCover} resizeMode="cover" /> : null}
          <Text style={styles.detailTitle}>{detail.name}</Text>
          <View style={styles.chips}>
            {[detail.catalog.genre, `${playersTag(detail.catalog.players)} ${t('explorePage.jugadores').toLowerCase()}`, durationLabel(detail.catalog.duration), languageCodes(worldLanguages(detail))].map((c) => (
              <Text key={c} style={styles.chip}>
                {c}
              </Text>
            ))}
          </View>
          <Text style={styles.byline}>{view.byline}</Text>
          {ratingLine(detail.rating) ? <Text style={styles.stars}>{ratingLine(detail.rating)}</Text> : null}
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
              <Text style={styles.h2}>{t('worldPage.personajesJugables')}</Text>
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
            <Text style={styles.h2}>{t('worldPage.queIncluye')}</Text>
            <Text style={styles.item}>{t('worldPage.escenarioCompleto')}</Text>
            <Text style={styles.item}>{t('mobile.exploreScreen.personajesJugablesConTrasfondo', { count: detail.characters })}</Text>
            {detail.maps.length ? <Text style={styles.item}>{detail.maps.length === 1 ? t('mobile.exploreScreen.mapaDe', { name: detail.maps[0]!.name }) : t('mobile.exploreScreen.nMapas', { count: detail.maps.length })}</Text> : null}
            <Text style={styles.item}>{detail.sessions === 1 ? t('play.oneSession') : t('play.sessionsN', { count: detail.sessions })}</Text>
            <Text style={styles.item}>{t('worldPage.directorDeJuegoPor')}</Text>
            <Text style={styles.meta}>{t('mobile.exploreScreen.autorNombre', { author: detail.catalog.author })}</Text>
          </View>
          </View>
        </ScrollView>
        <BottomNav active="mundos" onSelect={onTab} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <TopBar
        client={client}
        extra={
          <Pressable onPress={onMine} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>{t('myWorldsPage.misMundos')}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* El mismo fondo que Mesas (Gabino, 26-09). */}
        <Backdrop />
        <View style={styles.list}>
        <Text style={styles.title}>{t('shell.nav.worlds')}</Text>
        <Text style={styles.subtitle}>{`${t('explorePage.historiasQueExisten')} ${t('explorePage.porqueTuLasViviste')}`}</Text>
        {season && season.worlds.length > 0 ? (
          <View style={styles.season}>
            <View style={styles.seasonHead}>
              <Text style={styles.seasonName}>{season.name}</Text>
              <Text style={styles.seasonChapters}>{season.chapters === 1 ? t('worlds.chapterOne') : t('worlds.chapterMany', { count: season.chapters })}</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.round(seasonProgress(season).progress * 100)}%` }]} />
            </View>
            <Text style={styles.meta}>{seasonPathLine(season.worlds, names)}</Text>
            <Pressable onPress={onSeason} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>{t('seasonPage.paseDeDescubridor')} ›</Text>
            </Pressable>
            {offer ? (
              <View style={styles.pass}>
                <Text style={styles.passTitle}>{t('explorePage.paseDeTemporada')}</Text>
                <Text style={styles.meta}>{offer.perks.join('  ·  ')}</Text>
                {/* El pase no se vende ni se cobra fuera desde la app (Google Play, 02-10): solo si ya es tuyo. */}
                {offer.owned ? <Text style={styles.seasonChapters}>{offer.label}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.search}>
          <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4-4" size={18} color={theme.colors.inkDim} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('explorePage.buscarMundos')} placeholderTextColor={theme.colors.inkFaint} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[null, ...genres].map((g) => (
            <Pressable key={g ?? 'todos'} onPress={() => setGenre(g)} style={[styles.filter, genre === g && styles.filterOn]}>
              <Text style={[styles.filterText, genre === g && styles.filterTextOn]}>{g ?? t('mobile.exploreScreen.todos')}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[null, ...LANGUAGES].map((l) => (
            <Pressable key={l ?? 'todos'} onPress={() => setLang(l)} style={[styles.filter, lang === l && styles.filterOn]} accessibilityRole="button">
              <Text style={[styles.filterText, lang === l && styles.filterTextOn]}>{l ? t(`common.languages.${l}`) : t('mobile.exploreScreen.todosLosIdiomas')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {worlds === null ? <ActivityIndicator color={theme.colors.accentBright} /> : null}
        {worlds?.length === 0 ? <Text style={styles.meta}>{t('mobile.exploreScreen.ningunMundoCoincide')}</Text> : null}

        <View style={styles.grid}>
          {worlds?.map((world) => {
            const view = appCardView(world)
            const cover = url(packArtUrl(world.id, world.catalog.cover))
            return (
              <View key={world.id} style={[styles.card, wide && styles.cardWide, (world.state === 'tuyo' || world.state === 'pase') && styles.cardOwned]}>
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
                    <Text style={styles.meta}>{worldLanguageNote(world, language()) ?? languageCodes(worldLanguages(world))}</Text>
                    {ratingLine(world.rating) ? <Text style={styles.stars}>{ratingLine(world.rating)}</Text> : null}
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
  scroll: { paddingBottom: 32 },
  list: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 16, gap: 12 },
  title: { fontFamily: theme.fonts.display, fontSize: 32, color: '#ffffff' },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -6 },
  season: { gap: 6, padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: 'rgba(17, 22, 34, 0.9)' },
  pass: { gap: 4, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  passPrice: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.ink },
  passTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 15, color: theme.colors.gold },
  seasonHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  seasonName: { fontFamily: theme.fonts.serifSemiBold, fontSize: 17, color: theme.colors.ink },
  seasonChapters: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.accentBright },
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
  card: { width: '47.5%', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: 'rgba(17, 22, 34, 0.9)', overflow: 'hidden' },
  cardWide: { width: '31.6%' },
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
  detail: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 16, gap: 10 },
  detailCover: { width: '100%', aspectRatio: 1.6, borderRadius: 14 },
  detailTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 28, color: '#ffffff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
  byline: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  stars: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.goldBright },
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
