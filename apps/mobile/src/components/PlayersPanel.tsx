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
              <Text style={[styles.state, seat.state === 'writing' && styles.writing, away && styles.away]}>{SEAT_LABELS[seat.state]}</Text>
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
  seat: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.borderSoft, backgroundColor: theme.colors.panel },
  mine: { borderColor: theme.colors.accentBright },
  who: { flex: 1 },
  name: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.ink },
  state: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  writing: { color: theme.colors.cyan },
  away: { color: theme.colors.inkFaint },
  label: { marginTop: 10, fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.inkDim },
})
