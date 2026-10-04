import { t } from '@rpg-ngn/i18n'
import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleStatus } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

/** Cada cuanto se pregunta si alguien pidio compartir la historia. */
const EVERY_MS = 20_000

/** Solicitudes calladas con "Ahora no" mientras la app esta abierta. */
const later = new Set<string>()

/**
 * La solicitud de compartir la historia en ventana, como la web (03-10):
 * antes vivia solo en Lectura y nadie la encontraba. Sale cuando hay una
 * solicitud que espera a quien mira.
 */
export function ShareConsentModal({ client, tableId }: { client: ApiClient; tableId: string }) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      client.chronicleShare(tableId).then(
        (s) => alive && setShare(s),
        () => undefined,
      )
    void load()
    const id = setInterval(load, EVERY_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [client, tableId])

  const open = !!share && chronicleStatus(share).canConsent && !later.has(share.token)
  if (!share) return null

  const asked = share.members.filter((m) => m.consented).map((m) => m.name ?? t('table.chronicle.someone'))
  const dismiss = () => {
    later.add(share.token)
    setTick((n) => n + 1)
  }
  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      setShare(await client.consentChronicle(tableId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('shareConsent.title')}</Text>
          <Text style={styles.text}>{t('shareConsent.asked', { names: asked.join(', ') })}</Text>
          <Text style={styles.text}>{share.listed ? t('shareConsent.listed') : t('shareConsent.link')}</Text>
          {share.anonymize ? <Text style={styles.hint}>{t('shareConsent.anonymous')}</Text> : null}
          <Text style={styles.hint}>{t('shareConsent.everyone')}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('shareConsent.accept')} primary busy={busy} onPress={() => void accept()} />
          <Button label={t('shareConsent.later')} onPress={dismiss} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(11, 11, 18, 0.85)' },
  card: { gap: 12, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel },
  title: { fontFamily: theme.fonts.serifSemiBold, fontSize: 22, color: theme.colors.ink, textAlign: 'center' },
  text: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
})
