import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

interface Props {
  packName: string
  motto: string | null
  onOnline: () => void
  onOffline: () => void
}

/** Primera pantalla: jugar en una mesa con DM (API) o leer el pack sin conexion. */
export function ModePicker({ packName, motto, onOnline, onOffline }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {motto ? <Text style={styles.motto}>{`"${motto}"`}</Text> : null}
      <Text style={styles.title}>{packName}</Text>
      <View style={styles.rule} />

      <Choice title="Jugar en mesa" body="Entra al servidor de la mesa, responde al DM desde tu teléfono y sigue la narración con los demás." onPress={onOnline} primary />
      <Choice title="Leer sin conexión" body="Las sesiones jugadas, las fichas y las reglas del pack, sin servidor ni DM." onPress={onOffline} />
    </ScrollView>
  )
}

function Choice({ title, body, onPress, primary = false }: { title: string; body: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, primary && styles.cardPrimary, pressed && styles.pressed]} accessibilityRole="button">
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 36, gap: 12 },
  motto: { fontFamily: theme.fonts.serifItalic, color: theme.colors.inkDim, textAlign: 'center', fontSize: 15 },
  title: { fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.gold, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  rule: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10, marginHorizontal: 40 },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 16, gap: 6 },
  cardPrimary: { borderColor: theme.colors.gold },
  pressed: { opacity: 0.8 },
  cardTitle: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.gold, letterSpacing: 0.5 },
  cardBody: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
})
