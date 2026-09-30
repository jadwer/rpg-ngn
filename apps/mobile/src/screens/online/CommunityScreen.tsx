import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { TopBar } from '../../components/TopBar'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Panel } from '../../components/Panel'
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
 * Comunidad: por ahora, tus amigos (27-09, Gabino: "le das su propio
 * lugar"; antes vivian al pie de Mesas). Lo demas del tablero (historias
 * compartidas, creadores, mesas abiertas) sigue anunciado sin fecha.
 */
export function CommunityScreen({ client, user, onTab, onProfile, onUnauthorized }: Props) {
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
          <Panel title={t('shell.nav.friends')}>
            <FriendsPanel client={client} meId={user.id} onUnauthorized={onUnauthorized} />
          </Panel>
          <Panel title={t('communityPage.pronto')}>
            <Text style={styles.text}>{t('communityPage.historiasCompartidasCreadoresDe')}</Text>
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
})
