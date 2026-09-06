import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { loadOfflineCampaign, type OfflineCampaign } from './pack/offline'
import { SessionPicker } from './screens/SessionPicker'
import { SessionScreen } from './screens/SessionScreen'
import { NarratorProvider } from './state/narrator'
import { theme } from './theme'

type Screen = { name: 'picker' } | { name: 'session'; sessionId: string }

/**
 * Raiz de la app offline. Dos pantallas y un modal; sin libreria de
 * navegacion a proposito: cada dependencia nativa es un punto fragil del
 * spike pnpm + Expo (docs/10, IA2) y aqui no hace falta.
 */
export function Root() {
  const [campaign, setCampaign] = useState<OfflineCampaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'picker' })

  useEffect(() => {
    loadOfflineCampaign().then(setCampaign, (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <SafeAreaProvider>
      <NarratorProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" />
          {error ? (
            <View style={styles.center}>
              <Text style={styles.error}>{`No se pudo cargar la campaña.\n${error}`}</Text>
            </View>
          ) : !campaign ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.gold} />
              <Text style={styles.loading}>Consultando los archivos del gremio...</Text>
            </View>
          ) : screen.name === 'picker' ? (
            <SessionPicker campaign={campaign} onSelect={(sessionId) => setScreen({ name: 'session', sessionId })} />
          ) : (
            <SessionScreen campaign={campaign} sessionId={screen.sessionId} onBack={() => setScreen({ name: 'picker' })} />
          )}
        </SafeAreaView>
      </NarratorProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loading: { fontFamily: theme.fonts.serif, color: theme.colors.inkDim, fontStyle: 'italic' },
  error: { fontFamily: theme.fonts.serif, color: theme.colors.accent, textAlign: 'center' },
})
