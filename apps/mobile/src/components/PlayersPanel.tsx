import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Icon, ICON } from './Icon'
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
  const withCharacter = seats.filter((s) => s.characterId)
  const ready = withCharacter.filter((s) => s.state === 'ready').length
  return (
    <View style={styles.wrap}>
      {withCharacter.length > 0 ? (
        <View style={styles.summary}>
          <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
          <Text style={styles.summaryText}>{`${ready}/${withCharacter.length} listos`}</Text>
        </View>
      ) : null}
      {seats.map((seat, i) => {
        const away = seat.state === 'away'
        return (
          <View key={seat.memberId} style={[styles.seat, i > 0 && styles.divider]}>
            <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={52} muted={away} round />
            <View style={styles.who}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {seat.name}
                </Text>
                {seat.mine ? <Text style={styles.pill}>Tú</Text> : null}
                {seat.role === 'host' ? <Text style={styles.pill}>Anfitrión</Text> : null}
              </View>
              <View style={styles.stateRow}>
                <View style={[styles.dot, { backgroundColor: DOT[seat.state] }]} />
                <Text style={[styles.state, seat.state === 'writing' && styles.writing, seat.state === 'ready' && styles.ready, away && styles.away]}>{SEAT_LABELS[seat.state]}</Text>
              </View>
              {seat.mine && ownPresent !== null ? (
                <Pressable onPress={onTogglePresence} disabled={busy} hitSlop={6}>
                  <Text style={styles.action}>{ownPresent ? 'Me tengo que ir' : 'He vuelto'}</Text>
                </Pressable>
              ) : null}
              {!seat.mine && isHost && seat.characterId ? (
                <Pressable onPress={() => onPresence(seat.memberId, away)} disabled={busy} hitSlop={6}>
                  <Text style={styles.action}>{away ? 'Marcar presente' : 'Marcar ausente'}</Text>
                </Pressable>
              ) : null}
            </View>
            {seat.state === 'ready' ? <Icon d={ICON.check} size={24} color={theme.colors.success} strokeWidth={2.2} /> : null}
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
  wrap: { gap: 2 },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end' },
  summaryText: { fontFamily: theme.fonts.uiMedium, fontSize: 14, color: theme.colors.success },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.inkDim, backgroundColor: theme.colors.panel3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  action: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.nebula, marginTop: 4 },
  who: { flex: 1 },
  name: { fontFamily: theme.fonts.uiSemiBold, fontSize: 17, color: theme.colors.ink, flexShrink: 1 },
  state: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  writing: { color: theme.colors.cyan },
  ready: { color: theme.colors.success },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  away: { color: theme.colors.inkFaint },
  label: { marginTop: 10, fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
})
