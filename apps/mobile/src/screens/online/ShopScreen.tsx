import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type CreditPack } from '@rpg-ngn/api-client'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { Button } from '../../components/Button'
import { Panel } from '../../components/Panel'
import { BlessingOffer, openWebShop, PackCards, SeasonPassCard } from '../../components/shop/ShopOffers'
import { TopBar } from '../../components/TopBar'
import { usePlay } from '../../online/play'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  user: { name: string }
  onProfile: () => void
  onTab: (tab: BottomTab) => void
  onUnauthorized: () => void
}

/**
 * La tienda en el telefono (Gabino, 30-09), con lo mismo que `/tienda` de la
 * web: la Bendicion del bardo, el pase de temporada, los paquetes de turnos y
 * los mundos en venta. El pago se hace en la web con la misma cuenta.
 */
export function ShopScreen({ client, user, onProfile, onTab, onUnauthorized }: Props) {
  const [packs, setPacks] = useState<CreditPack[]>([])
  // Cambia al tirar para refrescar: vuelve a montar las ofertas.
  const [round, setRound] = useState(0)

  const load = useCallback(() => {
    client.listCredits().then(
      ({ packs: list }) => setPacks(list),
      (caught: unknown) => {
        if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      },
    )
  }, [client, onUnauthorized])

  const play = usePlay()
  useEffect(load, [load, play.deliveries])

  return (
    <View style={styles.screen}>
      <TopBar client={client} user={user} onProfile={onProfile} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              setRound((r) => r + 1)
              load()
            }}
            tintColor={theme.colors.accentBright}
          />
        }
      >
        <Backdrop />
        <View style={styles.list} key={round}>
          <Text style={styles.pageTitle}>{t('shop.title')}</Text>
          <Text style={styles.subtitle}>{t('shop.sub')}</Text>

          <BlessingOffer client={client} />
          <SeasonPassCard client={client} />

          {packs.length > 0 ? (
            <Panel title={t('shop.packsTitle')}>
              {play.available ? null : <Text style={styles.note}>{t('shop.webNote')}</Text>}
              <PackCards packs={packs} onBuy={() => openWebShop(client)} />
            </Panel>
          ) : null}

          <Panel title={t('shop.worldsTitle')}>
            <Text style={styles.text}>{t('shop.worldsText')}</Text>
            <View style={styles.actions}>
              <Button label={t('shop.worldsLink')} onPress={() => onTab('mundos')} />
            </View>
          </Panel>
        </View>
      </ScrollView>
      <BottomNav active="tienda" onSelect={onTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 32 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 14 },
  pageTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  note: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  text: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  actions: { alignItems: 'flex-start' },
})
