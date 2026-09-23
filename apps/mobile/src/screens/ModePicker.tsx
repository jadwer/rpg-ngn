import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

interface Props {
  packName: string
  motto: string | null
  onOnline: () => void
  onOffline: () => void
}

/**
 * Primera pantalla: jugar en una mesa con DM (API) o leer el pack sin conexion.
 *
 * La portada es del producto, no del pack. Antes el titulo era el nombre del
 * pack empaquetado ("Los Nueve Viajeros"), y quien instala rpg-ngn para jugar
 * otra mesa leia la portada de una campaña que no es la suya. El pack solo
 * manda en la tarjeta de leer sin conexion, que es lo unico que depende de el.
 */
export function ModePicker({ packName, motto, onOnline, onOffline }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {motto ? <Text style={styles.motto}>{`"${motto}"`}</Text> : null}
      <Text style={styles.title}>Ad Astra Mentis</Text>
      <Text style={styles.tagline}>La mesa de rol con DM de inteligencia artificial</Text>
      <View style={styles.rule} />

      <Choice title="Jugar en mesa" body="Entra a tu mesa, responde al DM desde tu teléfono y sigue la narración con los demás." onPress={onOnline} primary />
      <Choice title="Leer sin conexión" body={`Las sesiones jugadas, las fichas y las reglas de ${packName}, sin servidor ni DM.`} onPress={onOffline} />
    </ScrollView>
  )
}

function Choice({ title, body, onPress, primary = false }: { title: string; body: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, primary && styles.cardPrimary, pressed && styles.pressed]} accessibilityRole="button">
      <Text style={[styles.cardTitle, primary && styles.cardTitlePrimary]}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 36, gap: 12 },
  motto: { fontFamily: theme.fonts.serifItalic, color: theme.colors.inkDim, textAlign: 'center', fontSize: 15 },
  title: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.ink, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
  tagline: { fontFamily: theme.fonts.serifItalic, fontSize: 16, color: theme.colors.ink, textAlign: 'center', marginTop: 2 },
  rule: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10, marginHorizontal: 40 },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 16, gap: 6 },
  cardPrimary: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel2 },
  pressed: { opacity: 0.8 },
  cardTitle: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.ink, letterSpacing: 0.5 },
  cardTitlePrimary: { color: '#ffffff' },
  cardBody: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
})
