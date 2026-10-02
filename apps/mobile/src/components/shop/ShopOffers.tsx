import { language, t } from '@rpg-ngn/i18n'
import type { ApiClient, BlessingState, CreditPack, SeasonPassOffer } from '@rpg-ngn/api-client'
import { buyablePacks, comingSoonPacks, packDescription, packName, packPrice, packValue, passView } from '@rpg-ngn/ui-logic'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { PLAY_BLESSING, playIdOfPack, usePlay } from '../../online/play'
import { webOriginOf } from '../../online/server-url'
import { theme } from '../../theme'
import { Button } from '../Button'
import { Panel } from '../Panel'

/**
 * Las piezas de la tienda en la app, las mismas que la web (`components/shop`).
 * Con Google Play (02-10) los turnos y la Bendicion se compran aqui, al precio
 * de Google; el pase y los mundos no se venden en la app. Sin Google Play
 * (Expo Go, desarrollo) la compra abre `/tienda` de la web.
 */
export function openWebShop(client: ApiClient): void {
  void Linking.openURL(`${webOriginOf(client.baseUrl)}/tienda`)
}

/** La Bendicion del bardo: que da, si esta activa y hasta cuando. */
export function BlessingOffer({ client }: { client: ApiClient }) {
  const [state, setState] = useState<BlessingState | null>(null)
  const play = usePlay()

  const load = useCallback(async () => {
    try {
      setState(await client.blessing())
    } catch {
      setState(null)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load, play.deliveries])

  if (!state) return null
  const playPrice = play.available ? play.prices[PLAY_BLESSING] : undefined
  const price = playPrice ?? packPrice(state.price)
  const until = state.active && state.endsAt ? new Date(state.endsAt).toLocaleDateString(language() === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'long' }) : null

  return (
    <View style={styles.feature}>
      <LinearGradient colors={['rgba(212, 175, 55, 0.18)', 'rgba(124, 58, 237, 0.10)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Text style={styles.kicker}>{t('blessing.kicker')}</Text>
      <Text style={styles.featureTitle}>{t('blessing.title')}</Text>
      {state.theme ? <Text style={styles.theme}>{t('blessing.theme', { name: state.theme.name })}</Text> : null}
      <Text style={styles.text}>{t('blessing.cardText', { first: 10, daily: state.turnsPerDay })}</Text>
      {until ? <Text style={styles.ok}>{t('blessing.activeUntil', { date: until })}</Text> : null}
      {state.canBuy ? (
        <View style={styles.actions}>
          <Button
            label={state.active ? t('blessing.extend', { price }) : t('blessing.buy', { price })}
            primary
            busy={play.buying === PLAY_BLESSING}
            onPress={() => (playPrice ? void play.buy(PLAY_BLESSING) : openWebShop(client))}
          />
        </View>
      ) : (
        <Text style={styles.hint}>{t('blessing.capReached')}</Text>
      )}
      <Text style={styles.hint}>{t('blessing.refundNote')}</Text>
    </View>
  )
}

/** El pase de temporada: lo que da y su precio; sin temporada abierta no se muestra. */
export function SeasonPassCard({ client }: { client: ApiClient }) {
  const [offer, setOffer] = useState<SeasonPassOffer | null>(null)
  const [season, setSeason] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    client.catalogWorlds({}).then(
      (result) => {
        if (!alive) return
        setOffer(result.pass)
        setSeason(result.season?.name ?? null)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client])

  const view = passView(offer)
  // El pase se vende solo en la web (Gabino, 02-10): la app no lo vende ni manda a pagarlo, solo dice si ya es tuyo.
  if (!view || !season || !view.owned) return null

  return (
    <Panel title={t('shop.passTitle', { season })}>
      <Text style={styles.text}>{t('shop.passPitch')}</Text>
      {view.perks.map((perk) => (
        <Text key={perk} style={styles.perk}>{`✦  ${perk}`}</Text>
      ))}
      <Text style={styles.ok}>{view.priceLine}</Text>
    </Panel>
  )
}

/**
 * Los paquetes de turnos en tarjetas, como la web: nombre, turnos, para que
 * alcanzan y precio. Con Google Play, el precio y la compra son los de Google.
 */
export function PackCards({ packs, onBuy }: { packs: readonly CreditPack[]; onBuy: () => void }) {
  const play = usePlay()
  const forSale = buyablePacks(packs)
  const soon = comingSoonPacks(packs)
  if (forSale.length === 0 && soon.length === 0) return null

  return (
    <View style={styles.packs}>
      {forSale.map((pack) => {
        const playId = playIdOfPack(pack.id)
        const playPrice = play.available ? play.prices[playId] : undefined
        const price = playPrice ?? packPrice(pack)
        return (
        <Pressable key={pack.id} onPress={() => (playPrice ? void play.buy(playId) : onBuy())} disabled={play.buying !== null} style={({ pressed }) => [styles.pack, pressed && styles.pressed, play.buying === playId && styles.packBuying]} accessibilityRole="button" accessibilityLabel={`${packName(pack)}, ${price}`}>
          <View style={styles.packHead}>
            <Text style={styles.packName}>{packName(pack)}</Text>
            <Text style={styles.packValue}>{packValue(pack)}</Text>
          </View>
          {packDescription(pack) ? <Text style={styles.hint}>{packDescription(pack)}</Text> : null}
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{price}</Text>
          </View>
        </Pressable>
        )
      })}
      {play.error ? <Text style={styles.error}>{play.error}</Text> : null}
      {soon.length > 0 ? <Text style={styles.soonTitle}>{t('creditsPanel.masAdelante')}</Text> : null}
      {soon.map((pack) => (
        <View key={pack.id} style={[styles.pack, styles.packSoon]}>
          <View style={styles.packBody}>
            <Text style={styles.packName}>{packName(pack)}</Text>
            {packDescription(pack) ? <Text style={styles.hint}>{packDescription(pack)}</Text> : null}
          </View>
          <Text style={styles.hint}>{packPrice(pack)}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  feature: { gap: 10, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.gold, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  kicker: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.goldBright },
  featureTitle: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.ink },
  theme: { fontFamily: theme.fonts.serifItalic, fontSize: 17, color: theme.colors.goldBright },
  text: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  ok: { fontFamily: theme.fonts.uiMedium, fontSize: 14, color: theme.colors.success },
  price: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.goldBright },
  perk: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 20, color: theme.colors.ink },
  actions: { alignItems: 'flex-start' },
  packs: { gap: 10 },
  // Precio abajo a la derecha: en una fila junto al texto lo aplastaba a 390 (30-09).
  pack: { gap: 6, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  packHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 10 },
  packBuying: { opacity: 0.6 },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  packSoon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: 0.55 },
  pressed: { opacity: 0.8 },
  packBody: { flex: 1, gap: 3 },
  packName: { fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: theme.colors.ink },
  packValue: { fontFamily: theme.fonts.uiMedium, fontSize: 14, color: theme.colors.accentBright },
  pricePill: { alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.colors.accent },
  pricePillText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.onAccent },
  soonTitle: { fontFamily: theme.fonts.display, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, marginTop: 6 },
})
