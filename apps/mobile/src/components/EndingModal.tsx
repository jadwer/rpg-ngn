import { t } from '@rpg-ngn/i18n'
import { endingTitle, latestEnding, type TurnBlock } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import type { ApiClient } from '@rpg-ngn/api-client'
import { theme } from '../theme'
import { Button } from './Button'
import { RatingForm } from './RatingForm'

interface Props {
  client: ApiClient
  tableId: string
  blocks: readonly TurnBlock[]
  isHost: boolean
  /** El anfitrion abre la sesion siguiente desde su panel. */
  onKeepPlaying: () => void
}

/** Fines ya vistos mientras la app esta abierta. */
const seen = new Set<string>()

/**
 * La pantalla de fin (docs/26, H1), como la web: cuando la sesion termina,
 * toda la mesa ve el fin a pantalla completa con lo que lograron.
 */
export function EndingModal({ client, tableId, blocks, isHost, onKeepPlaying }: Props) {
  const ending = latestEnding(blocks)
  const [open, setOpen] = useState(false)
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (ending && !seen.has(ending.id)) setOpen(true)
  }, [ending])

  useEffect(() => {
    if (!open) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start()
  }, [open, fade])

  if (!ending) return null

  const close = () => {
    seen.add(ending.id)
    setOpen(false)
  }
  const continues = ending.scope !== 'story'

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <StatusBar hidden />
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.title}>{endingTitle(ending)}</Text>
            {ending.text ? <Text style={styles.text}>{ending.text}</Text> : null}
            {ending.achievements.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('ending.achievements')}</Text>
                {ending.achievements.map((title, index) => (
                  <Text key={index} style={styles.text}>{`✦  ${title}`}</Text>
                ))}
              </View>
            ) : null}
            {ending.cliffhanger ? <Text style={styles.next}>{`${t('ending.toBeContinued')} ${ending.cliffhanger}`}</Text> : null}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('ending.rateTitle')}</Text>
              <Text style={styles.text}>{t('ending.rateText')}</Text>
              <RatingForm client={client} tableId={tableId} />
            </View>
            {continues && isHost ? (
              <Button
                label={t('ending.keepPlaying')}
                primary
                onPress={() => {
                  close()
                  onKeepPlaying()
                }}
              />
            ) : null}
            {continues && !isHost ? <Text style={styles.hint}>{t('ending.waitingHost')}</Text> : null}
            <Button label={t('ending.close')} primary={!continues || !isHost} onPress={close} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(11, 11, 18, 0.9)' },
  card: { maxHeight: '90%', borderRadius: 18, borderWidth: 1, borderColor: theme.colors.gold, backgroundColor: theme.colors.panel },
  body: { gap: 14, padding: 22 },
  title: { fontFamily: theme.fonts.display, fontSize: 28, letterSpacing: 2, color: theme.colors.goldBright, textAlign: 'center' },
  section: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  sectionTitle: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.colors.gold, textAlign: 'center' },
  text: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink, textAlign: 'center' },
  next: { fontFamily: theme.fonts.serifItalic, fontSize: 17, lineHeight: 24, color: theme.colors.ink, textAlign: 'center' },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center' },
})
