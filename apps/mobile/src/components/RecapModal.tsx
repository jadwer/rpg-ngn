import type { SystemBlock } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Modal, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  recap: SystemBlock | null
  /** Solo al entrar: si llega en vivo durante la apertura, ya se lee en la narracion. */
  enabled: boolean
}

/**
 * "Anteriormente..." (E10c): al entrar a una mesa con la sesion abierta, el
 * resumen de lo que paso antes con un Continuar. Una vez por resumen mientras
 * la app esta abierta.
 */
const seen = new Set<string>()

export function RecapModal({ recap, enabled }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (enabled && recap && !seen.has(recap.id)) setOpen(true)
  }, [enabled, recap])

  if (!recap) return null

  const close = () => {
    seen.add(recap.id)
    setOpen(false)
  }

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <StatusBar hidden />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Anteriormente...</Text>
          <ScrollView style={styles.body}>
            {(recap.text ?? '').split(/\n\s*\n/).map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </ScrollView>
          <Button label="Continuar" primary onPress={close} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(11, 11, 18, 0.85)' },
  card: { maxHeight: '85%', gap: 14, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel },
  title: { fontFamily: theme.fonts.serifSemiBold, fontSize: 24, color: theme.colors.ink, textAlign: 'center' },
  body: { flexGrow: 0 },
  paragraph: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 26, color: theme.colors.ink, marginBottom: 10 },
})
