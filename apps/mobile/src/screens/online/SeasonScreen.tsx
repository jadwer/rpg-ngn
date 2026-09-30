import { language, t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type Collection, type DiscovererPass } from '@rpg-ngn/api-client'
import { COLLECTION_GALLERIES, achievementProgress, chaptersLabel, galleryLabel, nextRewardText, pathProgress, rewardStatus, seasonDaysLeft, streakText } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  back: string
  onBack: () => void
  onUnauthorized: () => void
}

/**
 * El pase de descubridor y la coleccion en el telefono, lo mismo que
 * `/temporada` y `/coleccion` de la web en una sola pantalla: capitulos,
 * racha, los bloques del camino, los logros y lo ganado por galeria.
 */
export function SeasonScreen({ client, back, onBack, onUnauthorized }: Props) {
  const [pass, setPass] = useState<DiscovererPass | null | undefined>(undefined)
  const [items, setItems] = useState<Collection | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [loadedPass, loadedItems] = await Promise.all([client.discovererPass(), client.collection()])
      setPass(loadedPass)
      setItems(loadedItems)
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [client, onUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={styles.screen}>
      <PageHeader back={back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={theme.colors.accentBright} />}>
        <Backdrop />
        <View style={styles.list}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {pass === undefined && !error ? <ActivityIndicator color={theme.colors.goldBright} /> : null}
          {pass === null ? (
            <>
              <Text style={styles.pageTitle}>{t('seasonPage.temporada')}</Text>
              <Text style={styles.subtitle}>{t('seasonPage.entreTemporadasLaSiguiente')}</Text>
            </>
          ) : null}
          {pass ? <Pass pass={pass} /> : null}
          {items ? <Gallery items={items} /> : null}
        </View>
      </ScrollView>
    </View>
  )
}

function Pass({ pass }: { pass: DiscovererPass }) {
  const progress = Math.round(pathProgress(pass) * 100)
  const days = seasonDaysLeft(pass.season.endsAt)

  return (
    <>
      <Text style={styles.pageTitle}>{pass.season.name}</Text>
      <Text style={styles.subtitle}>{`${t('seasonPage.paseDeDescubridor')} · ${days === 1 ? t('seasonPage.queda1Dia') : t('seasonPage.quedanNDias', { days })}`}</Text>

      <Panel title={t('seasonPage.tuAvance')}>
        <View style={styles.summary}>
          <View style={styles.chapters}>
            <Text style={styles.chaptersNumber}>{pass.chapters}</Text>
            <Text style={styles.hint}>{pass.chapters === 1 ? t('common.capituloWord') : t('common.capitulosWord')}</Text>
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.text}>{nextRewardText(pass)}</Text>
            <Text style={pass.streak > 0 && !pass.playedToday ? styles.warn : styles.hint}>{streakText(pass)}</Text>
          </View>
        </View>
        <View style={styles.bar} accessibilityRole="progressbar" accessibilityLabel={t('seasonPage.avanceDelCamino')} accessibilityValue={{ min: 0, max: 100, now: progress }}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.serifHint}>{t('seasonPage.cadaTurnoQueJuegas')}</Text>
      </Panel>

      {pass.blocks.map((block) => (
        <Panel key={block.index} title={t('play.block', { index: block.index })}>
          {block.rewards.map((r) => (
            <View key={r.position} style={[styles.reward, r.earned && styles.rewardEarned, r.kind === 'world' && styles.rewardWorld]}>
              <Text style={styles.threshold}>{r.kind === 'soon' ? '···' : chaptersLabel(r.threshold)}</Text>
              <View style={styles.rewardBody}>
                <Text style={styles.rewardLabel}>{r.label}</Text>
                {r.description ? <Text style={styles.hint}>{r.description}</Text> : null}
                <Text style={[styles.status, r.earned && styles.statusEarned]}>{rewardStatus(r, pass.chapters)}</Text>
              </View>
            </View>
          ))}
        </Panel>
      ))}

      <Panel title={t('seasonPage.logros')}>
        {pass.achievements.map((a) => (
          <View key={a.code} style={[styles.reward, a.done && styles.rewardEarned]}>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardLabel}>{a.label}</Text>
              <Text style={styles.hint}>{a.description}</Text>
              <Text style={[styles.status, a.done && styles.statusEarned]}>{achievementProgress(a)}</Text>
            </View>
            <Text style={styles.points}>{`+${chaptersLabel(a.points)}`}</Text>
          </View>
        ))}
      </Panel>
    </>
  )
}

function Gallery({ items }: { items: Collection }) {
  const galleries = [...COLLECTION_GALLERIES.map((g) => g.code), ...Object.keys(items).filter((k) => !COLLECTION_GALLERIES.some((g) => g.code === k))]
  const filled = galleries.filter((g) => (items[g] ?? []).length > 0)
  const locale = language() === 'en' ? 'en-US' : 'es-MX'

  return (
    <>
      <Text style={styles.sectionTitle}>{t('collectionPage.tuColeccion')}</Text>
      <Text style={styles.subtitle}>{t('collectionPage.loQueHasGanado')}</Text>
      {filled.length === 0 ? (
        <Panel>
          <Text style={styles.serifHint}>{t('collectionPage.aunNoTienesNada')}</Text>
        </Panel>
      ) : null}
      {filled.map((g) => (
        <Panel key={g} title={galleryLabel(g)}>
          {(items[g] ?? []).map((item, i) => (
            <View key={`${item.code}-${i}`} style={[styles.item, !item.active && styles.expired]}>
              <Text style={styles.rewardLabel}>{item.label}</Text>
              <Text style={styles.hint}>
                {item.season ?? ''}
                {item.expiresAt
                  ? ` · ${item.active ? t('collectionPage.valeHasta') : t('collectionPage.vencioEl')} ${new Date(item.expiresAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`
                  : ''}
              </Text>
            </View>
          ))}
        </Panel>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 48 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 12 },
  pageTitle: { fontFamily: theme.fonts.display, fontSize: 30, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 24, color: '#ffffff', marginTop: 12, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  text: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  serifHint: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  warn: { fontFamily: theme.fonts.uiMedium, fontSize: 13, lineHeight: 18, color: theme.colors.goldBright },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chapters: { alignItems: 'center', minWidth: 64 },
  chaptersNumber: { fontFamily: theme.fonts.display, fontSize: 36, color: theme.colors.goldBright },
  summaryText: { flex: 1, gap: 4 },
  bar: { height: 8, borderRadius: 4, backgroundColor: theme.colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.accentBright },
  reward: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderSoft, backgroundColor: theme.colors.panel },
  rewardEarned: { borderColor: theme.colors.gold },
  rewardWorld: { backgroundColor: 'rgba(124, 58, 237, 0.12)' },
  threshold: { minWidth: 56, fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.accentBright },
  rewardBody: { flex: 1, gap: 3 },
  rewardLabel: { fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: theme.colors.ink },
  status: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.inkDim },
  statusEarned: { color: theme.colors.success },
  points: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.goldBright },
  item: { gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  expired: { opacity: 0.55 },
})
