import { memberOf, packArtUrl, packPortraitUrl, type ApiClient, type PackCharacter, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { characterNameFrom, filterCounts, filterLabel, filterTables, relativeTime, seatLabel, stateLabel, TABLE_FILTERS, tableState, worldOf, worldTags, type TableFilter } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { LogoHorizontal } from '../../components/Brand'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Icon, ICON } from '../../components/Icon'
import { JoinByLink } from '../../components/JoinByLink'
import { Portrait } from '../../components/Portrait'
import { RetireTable } from '../../components/RetireTable'
import type { StoredUser } from '../../online/storage'
import { theme } from '../../theme'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FONDO: ImageSourcePropType = require('../../../assets/fondo-mesas.webp')

interface Props {
  client: ApiClient
  user: StoredUser
  tables: TableSummary[] | null
  loading: boolean
  error: string | null
  pack: LoadedPack | null
  /** Catalogo del servidor: nombre, portada y etiquetas del mundo de cada mesa. */
  packs?: readonly PackOption[]
  /** Nombres de personaje de los packs que la app no lleva dentro. */
  remoteNames?: Readonly<Record<string, string>>
  /** Personajes de esos packs, por pack: para los retratos de la tarjeta. */
  remoteCharacters?: Readonly<Record<string, readonly PackCharacter[]>>
  onOpen: (table: TableSummary) => void
  onCreate: () => void
  onRefresh: () => void
  /** Tocar la inicial abre el perfil (nombre, contraseña, creditos). */
  onProfile: () => void
  onTab: (tab: BottomTab) => void
  onUnauthorized: () => void
}

/**
 * Las mesas donde el usuario es miembro, con el tablero de Gabino
 * (`img/design_ui_ux/mesas_ux.png`, 26-09): logo arriba, la escena de fondo,
 * filtros con conteo, orden por ultima actividad y tarjetas con la portada
 * del mundo y quien juega. Al pie, amigos y la barra inferior.
 */
export function TablesScreen({ client, user, tables, loading, error, pack, packs = [], remoteNames = {}, remoteCharacters = {}, onOpen, onCreate, onRefresh, onProfile, onTab, onUnauthorized }: Props) {
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState<TableFilter>('todas')
  const [joining, setJoining] = useState(false)
  const [options, setOptions] = useState<string | null>(null)
  const nameOf = (id: string) => characterNameFrom(pack, remoteNames, id)
  const counts = useMemo(() => filterCounts(tables ?? []), [tables])
  const shown = useMemo(() => filterTables(tables ?? [], filter), [tables, filter])

  const portraitOf = (packId: string, characterId: string | null): { path: string | null; uri: string | null } => {
    if (!characterId) return { path: null, uri: null }
    if (pack && packId === pack.manifest.id) return { path: pack.characters.get(characterId)?.portrait ?? null, uri: null }
    const c = (remoteCharacters[packId] ?? []).find((x) => x.id === characterId)
    const path = packPortraitUrl(packId, c?.portrait)
    return { path: null, uri: path ? `${client.baseUrl}${path}` : null }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <LogoHorizontal height={28} color={theme.colors.ink} />
        <Pressable onPress={onProfile} hitSlop={10} accessibilityRole="button" accessibilityLabel="Tu cuenta" style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name.trim()[0] ?? '?').toUpperCase()}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading && tables !== null} onRefresh={onRefresh} tintColor={theme.colors.accentBright} colors={[theme.colors.accentBright]} progressBackgroundColor={theme.colors.panel} />}
      >
        <ImageBackground source={FONDO} style={styles.hero} imageStyle={styles.heroImage} resizeMode="cover">
          <View style={styles.heroShade} />
          <Text style={styles.title}>Tus mesas</Text>
          <Text style={styles.subtitle}>Historias en las que estás jugando</Text>
          <Pressable onPress={onCreate} style={({ pressed }) => [styles.bigBtn, styles.primary, pressed && styles.pressed]} accessibilityRole="button">
            <Icon d={ICON.plus} size={18} color="#ffffff" />
            <Text style={styles.bigBtnText}>Crear mesa</Text>
          </Pressable>
          <Pressable onPress={() => setJoining((v) => !v)} style={({ pressed }) => [styles.bigBtn, styles.outline, pressed && styles.pressed]} accessibilityRole="button">
            <Icon d={ICON.link} size={18} color={theme.colors.ink} />
            <Text style={styles.bigBtnText}>Unirme con enlace</Text>
          </Pressable>
        </ImageBackground>

        <View style={styles.body}>
          {joining ? <JoinByLink client={client} onOpen={onOpen} onRefresh={onRefresh} startOpen onClose={() => setJoining(false)} /> : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {TABLE_FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: filter === f }}>
                <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{filterLabel(f, counts[f])}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {tables === null && loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.accentBright} />
              <Text style={styles.hint}>Buscando tus mesas...</Text>
            </View>
          ) : null}
          {tables !== null && shown.length === 0 ? <Text style={styles.hint}>{filter === 'todas' ? 'No estás en ninguna mesa todavía. Crea una o pide al anfitrión que te invite.' : 'No hay mesas aquí.'}</Text> : null}

          {shown.map((table) => {
            const me = memberOf(table, user.id)
            const world = worldOf(table, packs)
            const cover = packArtUrl(table.packId, world?.catalog?.cover)
            const state = tableState(table)
            const members = table.members.slice(0, 2)
            const extra = table.members.length - members.length
            const tags = worldTags(world?.catalog)
            return (
              <View key={table.id} style={[styles.card, state === 'finalizadas' && styles.cardQuiet]}>
                <Pressable onPress={() => onOpen(table)} style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]} accessibilityRole="button">
                  <View style={styles.coverBox}>
                    {cover ? <Image source={{ uri: `${client.baseUrl}${cover}` }} style={styles.cover} resizeMode="cover" /> : <Text style={styles.coverLetter}>{(world?.name ?? table.name).charAt(0)}</Text>}
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View style={[styles.state, state === 'pausa' && styles.statePausa, state === 'finalizadas' && styles.stateFin]}>
                        <View style={[styles.dot, state === 'pausa' && styles.dotPausa, state === 'finalizadas' && styles.dotFin]} />
                        <Text style={[styles.stateText, state === 'pausa' && styles.statePausaText, state === 'finalizadas' && styles.stateFinText]}>{stateLabel(state)}</Text>
                      </View>
                      <Text style={styles.when}>{relativeTime(table.lastActivityAt)}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {table.name}
                    </Text>
                    <Text style={styles.role} numberOfLines={2}>
                      {seatLabel(me, nameOf)}
                    </Text>
                    <Text style={styles.tags} numberOfLines={1}>
                      {tags.length ? tags.join('  ·  ') : (world?.name ?? table.packId)}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.cardFoot}>
                  <View style={styles.avatars}>
                    {members.map((m) => {
                      const p = portraitOf(table.packId, m.characterId)
                      return (
                        <View key={m.id} style={styles.avatarRing}>
                          <Portrait path={p.path} uri={p.uri} name={m.characterId ? nameOf(m.characterId) : (m.userName ?? '?')} size={30} round />
                        </View>
                      )
                    })}
                    {extra > 0 ? (
                      <View style={[styles.avatarRing, styles.more]}>
                        <Text style={styles.moreText}>+{extra}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => onOpen(table)} style={({ pressed }) => [styles.continue, pressed && styles.pressed]} accessibilityRole="button">
                    <Icon d={ICON.play} size={14} color="#ffffff" />
                    <Text style={styles.continueText}>Continuar</Text>
                  </Pressable>
                  <Pressable onPress={() => setOptions((v) => (v === table.id ? null : table.id))} style={({ pressed }) => [styles.dots, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Opciones de la mesa">
                    <Icon d={ICON.dots} size={20} color={theme.colors.ink} strokeWidth={3} />
                  </Pressable>
                </View>
                {options === table.id ? (
                  <View style={styles.optionsBox}>
                    <RetireTable client={client} table={table} host={me?.role === 'host'} onChanged={onRefresh} />
                  </View>
                ) : null}
                {!table.campaignId ? <Text style={styles.warn}>Esta mesa no tiene campaña todavía.</Text> : null}
              </View>
            )
          })}

          <View style={styles.friends}>
            <FriendsPanel client={client} meId={user.id} onUnauthorized={onUnauthorized} />
          </View>
        </View>
      </ScrollView>

      <BottomNav active="mesas" onSelect={onTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent },
  avatarText: { fontFamily: theme.fonts.display, fontSize: 16, color: '#ffffff' },
  scroll: { paddingBottom: 24 },
  hero: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 18, gap: 10, overflow: 'hidden' },
  heroImage: { resizeMode: 'cover' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 20, 0.35)' },
  title: { fontFamily: theme.fonts.display, fontSize: 36, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 18, color: theme.colors.ink, marginTop: -4, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, borderRadius: 12 },
  primary: { backgroundColor: theme.colors.accent },
  outline: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: 'rgba(11, 15, 20, 0.72)' },
  bigBtnText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 16, color: '#ffffff' },
  pressed: { opacity: 0.8 },
  body: { paddingHorizontal: 16, gap: 12 },
  filters: { gap: 8, paddingVertical: 4, paddingRight: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  chipOn: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.25)' },
  chipText: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  chipTextOn: { color: '#ffffff' },
  center: { alignItems: 'center', padding: 24, gap: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim, textAlign: 'center' },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger, textAlign: 'center' },
  card: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  cardQuiet: { opacity: 0.75 },
  cardMain: { flexDirection: 'row' },
  coverBox: { width: 104, backgroundColor: theme.colors.panel2, alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: '100%' },
  coverLetter: { fontFamily: theme.fonts.display, fontSize: 36, color: theme.colors.inkFaint },
  cardBody: { flex: 1, padding: 12, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.5)', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  statePausa: { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  stateFin: { borderColor: theme.colors.border, backgroundColor: 'transparent' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  dotPausa: { backgroundColor: '#fcd34d' },
  dotFin: { backgroundColor: theme.colors.inkDim },
  stateText: { fontFamily: theme.fonts.uiMedium, fontSize: 11, color: '#86efac' },
  statePausaText: { color: '#fcd34d' },
  stateFinText: { color: theme.colors.inkDim },
  when: { fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.inkFaint },
  cardTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: '#ffffff', marginTop: 2 },
  role: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  tags: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
  avatars: { flexDirection: 'row', width: 90 },
  avatarRing: { marginRight: -8, borderWidth: 2, borderColor: theme.colors.panel, borderRadius: 17 },
  more: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.panel3 },
  moreText: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.ink },
  continue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, borderRadius: 10, backgroundColor: theme.colors.accent },
  continueText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: '#ffffff' },
  dots: { width: 44, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  optionsBox: { paddingHorizontal: 12, paddingBottom: 12 },
  warn: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger, paddingHorizontal: 12, paddingBottom: 10 },
  friends: { marginTop: 14 },
})
