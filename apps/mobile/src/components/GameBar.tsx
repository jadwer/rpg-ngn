import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { theme } from '../theme'

export type GamePanel = 'sheets' | 'map' | 'players' | 'host' | 'reading'

const LABELS: Record<GamePanel, string> = {
  sheets: 'Fichas',
  map: 'Mapa',
  players: 'Jugadores',
  host: 'Anfitrión',
  reading: 'Lectura',
}

// Los mismos trazos que la barra de la web (apps/web/src/components/GameBar.tsx).
const ICONS: Record<GamePanel, string> = {
  sheets: 'M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1v5h5M8 13h8M8 17h8',
  map: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  players: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1',
  host: 'M3 18h18M4 17l1.5-9 4.5 4 2-6 2 6 4.5-4L20 17',
  reading: 'M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z',
}

interface Props {
  panels: readonly GamePanel[]
  /** Aviso en un boton (por ejemplo, alguien escribe o falta abrir sesion). */
  badges?: Partial<Record<GamePanel, boolean>>
  /** La hoja abierta ahora, en violeta. */
  active?: GamePanel | null
  onOpen: (panel: GamePanel) => void
}

/**
 * La barra del juego al pie (docs/18, D-UX-6): lo que se consulta de la
 * partida, cada cosa en su hoja. El menu del sitio (mesas, cuenta) queda
 * arriba, aparte.
 */
export function GameBar({ panels, badges = {}, active = null, onOpen }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {panels.map((panel) => (
        <Pressable key={panel} onPress={() => onOpen(panel)} style={({ pressed }) => [styles.item, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={LABELS[panel]}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d={ICONS[panel]} fill="none" stroke={active === panel ? theme.colors.accentBright : theme.colors.inkDim} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={[styles.label, active === panel && styles.labelOn]} numberOfLines={1}>
            {LABELS[panel]}
          </Text>
          {badges[panel] ? <View style={styles.badge} /> : null}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, backgroundColor: theme.colors.bg },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 9, paddingBottom: 8, gap: 3 },
  pressed: { backgroundColor: theme.colors.highlight },
  label: { fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.inkDim },
  labelOn: { color: theme.colors.accentBright },
  badge: { position: 'absolute', top: 8, right: '28%', width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accentBright },
})
