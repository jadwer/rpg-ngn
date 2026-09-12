import type { LoadedPack } from '@rpg-ngn/content'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { OnlineRoot } from './online/OnlineRoot'
import { loadBundledPack, loadOfflineCampaign, type OfflineCampaign } from './pack/offline'
import { ModePicker } from './screens/ModePicker'
import { SessionPicker } from './screens/SessionPicker'
import { SessionScreen } from './screens/SessionScreen'
import { NarratorProvider } from './state/narrator'
import { FONT_ASSETS, SYSTEM_SERIF, theme } from './theme'

type Screen = { name: 'mode' } | { name: 'online' } | { name: 'picker' } | { name: 'session'; sessionId: string }

/**
 * Raiz de la app. Las fuentes del tema (Cinzel, Crimson Pro) y el pack
 * empaquetado se cargan una vez; mientras tanto la pantalla de espera usa
 * la serif del sistema. Si las fuentes fallan (no deberia: viajan en el
 * bundle) la app arranca igual y el sistema pone su fuente. La campaña
 * offline se reduce solo si se entra a leer sin conexion. Sin libreria de
 * navegacion a proposito: cada dependencia nativa es un punto fragil del
 * spike pnpm + Expo (docs/10, IA2) y unas pocas pantallas no la necesitan.
 */
export function Root() {
  const [fontsLoaded, fontsError] = useFonts(FONT_ASSETS)
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [campaign, setCampaign] = useState<OfflineCampaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'mode' })

  useEffect(() => {
    loadBundledPack().then(({ pack }) => setPack(pack), (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const goOffline = () => {
    setScreen({ name: 'picker' })
    if (!campaign) loadOfflineCampaign().then(setCampaign, (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }

  const fontsReady = fontsLoaded || fontsError !== null

  let body
  if (error) {
    body = (
      <View style={styles.center}>
        <Text style={styles.error}>{`No se pudo cargar la campaña.\n${error}`}</Text>
      </View>
    )
  } else if (!fontsReady || !pack || (screen.name !== 'mode' && screen.name !== 'online' && !campaign)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.gold} />
        <Text style={styles.loading}>Consultando los archivos del gremio...</Text>
      </View>
    )
  } else if (screen.name === 'mode') {
    body = <ModePicker packName={pack.manifest.name} motto={pack.manifest.motto ?? null} onOnline={() => setScreen({ name: 'online' })} onOffline={goOffline} />
  } else if (screen.name === 'online') {
    body = <OnlineRoot pack={pack} onExit={() => setScreen({ name: 'mode' })} />
  } else if (screen.name === 'picker') {
    body = <SessionPicker campaign={campaign!} onSelect={(sessionId) => setScreen({ name: 'session', sessionId })} onBack={() => setScreen({ name: 'mode' })} />
  } else {
    body = <SessionScreen campaign={campaign!} sessionId={screen.sessionId} onBack={() => setScreen({ name: 'picker' })} />
  }

  return (
    <SafeAreaProvider>
      <NarratorProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          {body}
        </SafeAreaView>
      </NarratorProvider>
    </SafeAreaProvider>
  )
}

/** La espera y el error se pintan con la serif del sistema: pueden salir antes de que carguen las fuentes. */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: theme.colors.bg },
  loading: { fontFamily: SYSTEM_SERIF, fontStyle: 'italic', fontSize: 15, color: theme.colors.inkDim },
  error: { fontFamily: SYSTEM_SERIF, fontSize: 15, color: theme.colors.danger, textAlign: 'center' },
})
