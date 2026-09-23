import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

export type GamePanel = 'sheets' | 'map' | 'players' | 'host' | 'reading'

const LABELS: Record<GamePanel, string> = {
  sheets: 'Fichas',
  map: 'Mapa',
  players: 'Jugadores',
  host: 'Anfitrión',
  reading: 'Lectura',
}

interface Props {
  panels: readonly GamePanel[]
  /** Aviso en un boton (por ejemplo, alguien escribe o falta abrir sesion). */
  badges?: Partial<Record<GamePanel, boolean>>
  onOpen: (panel: GamePanel) => void
}

/**
 * La barra del juego al pie (docs/18, D-UX-6): lo que se consulta de la
 * partida, cada cosa en su hoja. El menu del sitio (mesas, cuenta) queda
 * arriba, aparte.
 */
export function GameBar({ panels, badges = {}, onOpen }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {panels.map((panel) => (
        <Pressable key={panel} onPress={() => onOpen(panel)} style={({ pressed }) => [styles.item, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={LABELS[panel]}>
          <Text style={styles.label} numberOfLines={1}>
            {LABELS[panel]}
          </Text>
          {badges[panel] ? <View style={styles.badge} /> : null}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, backgroundColor: theme.colors.panel },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  pressed: { backgroundColor: theme.colors.highlight },
  label: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 0.5, color: theme.colors.inkDim },
  badge: { position: 'absolute', top: 8, right: '28%', width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accentBright },
})
