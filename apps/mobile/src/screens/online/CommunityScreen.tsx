import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { LogoHorizontal } from '../../components/Brand'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Panel } from '../../components/Panel'
import { useTopInset } from '../../hooks/useTopInset'
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
  const topInset = useTopInset()
  return (
    <View style={styles.screen}>
      {/* La misma cabecera que Mesas. */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <LogoHorizontal height={28} color={theme.colors.ink} />
        <Pressable onPress={onProfile} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('mobile.tablesScreen.tuCuenta')} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name.trim()[0] ?? '?').toUpperCase()}</Text>
        </Pressable>
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent },
  avatarText: { fontFamily: theme.fonts.display, fontSize: 16, color: '#ffffff' },
  scroll: { paddingBottom: 24 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 14 },
  hero: { paddingTop: 28, paddingBottom: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 36, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 18, color: theme.colors.ink, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  text: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
})
