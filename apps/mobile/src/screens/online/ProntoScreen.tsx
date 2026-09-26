import { StyleSheet, Text, View } from 'react-native'
import { BottomNav, type BottomTab } from '../../components/BottomNav'
import { Button } from '../../components/Button'
import { theme } from '../../theme'

/** Lo que el tablero ya enseña y todavia no existe (26-09): dice que sera, sin fecha. */
export function ProntoScreen({ onTab, onTables }: { onTab: (tab: BottomTab) => void; onTables: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.sello}>PRONTO</Text>
          <Text style={styles.title}>Comunidad</Text>
          <Text style={styles.text}>Historias compartidas, creadores de mundos y mesas abiertas para unirse. Por ahora, invita con un enlace desde tu mesa y comparte la crónica desde Lectura.</Text>
          <Button label="Ir a tus mesas" primary onPress={onTables} />
        </View>
      </View>
      <BottomNav active="comunidad" onSelect={onTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  body: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { gap: 12, padding: 24, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.panel, alignItems: 'center' },
  sello: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 4, color: theme.colors.goldBright },
  title: { fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.ink },
  text: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink, textAlign: 'center' },
})
