import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Portrait } from './Portrait'

interface Props {
  seats: readonly Seat[]
  portraitOf: (characterId: string) => string | null
  /** null si quien mira no tiene personaje o no hay sesion. */
  ownPresent: boolean | null
  isHost: boolean
  busy: boolean
  onTogglePresence: () => void
  onPresence: (memberId: string, present: boolean) => void
  /** Invitar (enlace y por correo); solo el anfitrion. */
  invite?: ReactNode
}

/** Colores de estado del board movil v1.1: verde listo, cian escribiendo, ambar pensando. */
const DOT: Record<Seat['state'], string> = {
  ready: theme.colors.success,
  writing: theme.colors.cyan,
  thinking: '#f59e0b',
  away: theme.colors.inkFaint,
  narrating: theme.colors.accentBright,
  watching: theme.colors.inkFaint,
}

/**
 * La mesa como personas (docs/18, D-UX-7): una fila por asiento con su
 * estado. En la tuya, "me tengo que ir"; en las ajenas, el anfitrion marca
 * ausente a quien se fue sin avisar. Abajo, para el anfitrion, invitar.
 */
export function PlayersPanel({ seats, portraitOf, ownPresent, isHost, busy, onTogglePresence, onPresence, invite }: Props) {
  return (
    <View style={styles.wrap}>
      {seats.map((seat) => {
        const away = seat.state === 'away'
        return (
          <View key={seat.memberId} style={[styles.seat, seat.mine && styles.mine]}>
            <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={44} muted={away} />
            <View style={styles.who}>
              <Text style={styles.name} numberOfLines={1}>
                {seat.name}
                {seat.role === 'host' ? '  · anfitrión' : ''}
                {seat.mine ? '  · tú' : ''}
              </Text>
              <View style={styles.stateRow}>
                <View style={[styles.dot, { backgroundColor: DOT[seat.state] }]} />
                <Text style={[styles.state, seat.state === 'writing' && styles.writing, seat.state === 'ready' && styles.ready, away && styles.away]}>{SEAT_LABELS[seat.state]}</Text>
              </View>
            </View>
            {seat.mine && ownPresent !== null ? <Button label={ownPresent ? 'Me tengo que ir' : 'He vuelto'} small busy={busy} onPress={onTogglePresence} /> : null}
            {!seat.mine && isHost && seat.characterId ? <Button label={away ? 'Presente' : 'Ausente'} small busy={busy} onPress={() => onPresence(seat.memberId, away)} /> : null}
          </View>
        )
      })}
      {invite ? (
        <>
          <Text style={styles.label}>Invitar</Text>
          {invite}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius, borderWidth: 1, borderColor: 'transparent', backgroundColor: theme.colors.panel2 },
  mine: { borderColor: theme.colors.accentBright },
  who: { flex: 1 },
  name: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.ink },
  state: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  writing: { color: theme.colors.cyan },
  ready: { color: theme.colors.success },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  away: { color: theme.colors.inkFaint },
  label: { marginTop: 10, fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.inkDim },
})
