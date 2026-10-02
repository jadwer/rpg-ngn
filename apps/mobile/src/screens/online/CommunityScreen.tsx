import { t } from '@rpg-ngn/i18n'
import type { ApiClient, CommunityCreator, CommunityStory } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { TopBar } from '../../components/TopBar'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Panel } from '../../components/Panel'
import { webOriginOf } from '../../online/server-url'
import type { StoredUser } from '../../online/storage'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  user: StoredUser
  onTab: (tab: BottomTab) => void
  onProfile: () => void
  onUnauthorized: () => void
}

/**
 * Comunidad (v1, 02-10), como `/comunidad` de la web: las historias que su
 * mesa acepto publicar (se leen en la web, donde vive la cronica), quienes
 * crean mundos y tus amigos. Las mesas abiertas vienen despues del
 * lanzamiento.
 */
export function CommunityScreen({ client, user, onTab, onProfile, onUnauthorized }: Props) {
  const [stories, setStories] = useState<CommunityStory[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [creators, setCreators] = useState<CommunityCreator[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStories = async (next: number) => {
    try {
      const result = await client.communityStories(next)
      setStories((current) => (next === 1 || current === null ? result.stories : [...current, ...result.stories]))
      setTotal(result.total)
      setPage(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  useEffect(() => {
    void loadStories(1)
    client.communityCreators().then(setCreators, () => setCreators([]))
    // Una vez por cliente: "Ver mas" pide las siguientes paginas.
  }, [client])

  const open = (token: string) => void Linking.openURL(`${webOriginOf(client.baseUrl)}/cronica/${token}`)

  return (
    <View style={styles.screen}>
      <TopBar client={client} user={user} onProfile={onProfile} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Backdrop />
        <View style={styles.column}>
          <View style={styles.hero}>
            <Text style={styles.title}>{t('communityPage.comunidad')}</Text>
            <Text style={styles.subtitle}>{t('communityPage.laGenteConLa')}</Text>
          </View>
          <Text style={styles.section}>{t('communityPage.historias')}</Text>
          <Text style={styles.sectionSub}>{t('communityPage.historiasSub')}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {stories === null && !error ? <ActivityIndicator color={theme.colors.goldBright} /> : null}
          {stories?.length === 0 ? (
            <Panel>
              <Text style={styles.text}>{t('communityPage.historiasVacio')}</Text>
            </Panel>
          ) : null}
          {stories?.map((story) => (
            <Pressable key={story.token} onPress={() => open(story.token)} style={({ pressed }) => [styles.story, pressed && styles.pressed]} accessibilityRole="link" accessibilityLabel={story.title ?? undefined}>
              {story.cover ? <Image source={{ uri: `${client.baseUrl}${story.cover}` }} style={styles.cover} resizeMode="cover" /> : <View style={[styles.cover, styles.coverEmpty]} />}
              <View style={styles.storyBody}>
                {story.pack.name ? <Text style={styles.world}>{story.pack.name}</Text> : null}
                <Text style={styles.storyTitle}>{story.title}</Text>
                {story.excerpt ? (
                  <Text style={styles.text} numberOfLines={4}>
                    {story.excerpt}
                  </Text>
                ) : null}
                <Text style={styles.hint}>{story.sessions === 1 ? t('communityPage.sesionesTurnos', { sessions: story.sessions, turns: story.turns }) : t('communityPage.sesionesTurnosMany', { sessions: story.sessions, turns: story.turns })}</Text>
                <Text style={styles.hint}>{story.players ? t('communityPage.jugaron', { names: story.players.join(', ') }) : t('communityPage.mesaAnonima')}</Text>
                <Text style={styles.read}>{`${t('communityPage.leerHistoria')} →`}</Text>
              </View>
            </Pressable>
          ))}
          {stories && stories.length < total ? (
            <Pressable onPress={() => void loadStories(page + 1)} style={styles.more} accessibilityRole="button">
              <Text style={styles.read}>{t('communityPage.verMas')}</Text>
            </Pressable>
          ) : null}

          <Panel title={t('communityPage.creadores')}>
            <Text style={styles.hint}>{t('communityPage.creadoresSub')}</Text>
            {creators?.length === 0 ? <Text style={styles.text}>{t('communityPage.creadoresVacio')}</Text> : null}
            {creators?.map((creator) => (
              <View key={creator.name} style={styles.creator}>
                <Text style={styles.creatorName}>{creator.name}</Text>
                <Text style={styles.hint}>{creator.worlds.map((w) => w.name).join(' · ')}</Text>
              </View>
            ))}
          </Panel>
          <Panel title={t('shell.nav.friends')}>
            <FriendsPanel client={client} meId={user.id} onUnauthorized={onUnauthorized} />
          </Panel>
          <Panel title={t('communityPage.pronto')}>
            <Text style={styles.text}>{t('communityPage.mesasAbiertas')}</Text>
          </Panel>
        </View>
      </ScrollView>
      <BottomNav active="comunidad" onSelect={onTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 24 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 14 },
  hero: { paddingTop: 28, paddingBottom: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 36, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 18, color: theme.colors.ink, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  text: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  section: { fontFamily: theme.fonts.display, fontSize: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  sectionSub: { fontFamily: theme.fonts.serifItalic, fontSize: 15, color: theme.colors.ink, marginTop: -8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  story: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: 'rgba(15, 18, 30, 0.92)' },
  pressed: { opacity: 0.85 },
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.colors.panel },
  coverEmpty: { backgroundColor: 'rgba(124, 58, 237, 0.18)' },
  storyBody: { gap: 6, padding: 14 },
  world: { fontFamily: theme.fonts.uiSemiBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.goldBright },
  storyTitle: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.ink },
  read: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.accentBright },
  more: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  creator: { gap: 2, paddingVertical: 4 },
  creatorName: { fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: theme.colors.ink },
})
