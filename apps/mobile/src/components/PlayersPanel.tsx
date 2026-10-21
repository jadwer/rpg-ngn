import { t } from '@rpg-ngn/i18n'
import { SEAT_LABELS, type Seat } from '@rpg-ngn/ui-logic'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Icon, ICON } from './Icon'
import { Panel } from './Panel'
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
  /** El anfitrion saca a alguien de la mesa. */
  onRemove: (memberId: string) => void
  /** Bloquear a la persona de un asiento (cualquiera, sobre los demas). */
  onBlock: (seat: Seat) => void
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
export function PlayersPanel({ seats, portraitOf, ownPresent, isHost, busy, onTogglePresence, onPresence, onRemove, onBlock, invite }: Props) {
  // Sacar y bloquear no se deshacen con un toque: se confirman en la misma fila.
  const [confirming, setConfirming] = useState<{ memberId: string; action: 'remove' | 'block' } | null>(null)
  const withCharacter = seats.filter((s) => s.characterId)
  const ready = withCharacter.filter((s) => s.state === 'ready').length
  return (
    <>
      <Panel title={t('playersPanel.enLaMesa')}>
        {withCharacter.length > 0 ? (
          <View style={styles.summary}>
            <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.summaryText}>{t('mobile.playersPanel.readyOfTotal', { ready, total: withCharacter.length })}</Text>
          </View>
        ) : null}
        {seats.map((seat, i) => {
          const away = seat.state === 'away'
          return (
            <View key={seat.memberId} style={[styles.seat, i > 0 && styles.divider]}>
              <Portrait path={null} uri={seat.characterId ? portraitOf(seat.characterId) : null} name={seat.name} size={52} muted={away} round ring={!away} />
              <View style={styles.who}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {seat.name}
                  </Text>
                  {seat.mine ? <Text style={styles.pill}>{t('support.tu')}</Text> : null}
                  {seat.role === 'host' ? <Text style={styles.pill}>{t('hostPanel.anfitrion')}</Text> : null}
                </View>
                <View style={styles.stateRow}>
                  <View style={[styles.dot, { backgroundColor: DOT[seat.state] }]} />
                  <Text style={[styles.state, seat.state === 'writing' && styles.writing, seat.state === 'ready' && styles.ready, away && styles.away]}>{SEAT_LABELS[seat.state]}</Text>
                </View>
                {seat.mine && ownPresent !== null ? (
                  <Pressable onPress={onTogglePresence} disabled={busy} hitSlop={6}>
                    <Text style={styles.action}>{ownPresent ? t('play.leave') : t('play.back')}</Text>
                  </Pressable>
                ) : null}
                {!seat.mine && isHost && seat.characterId ? (
                  <Pressable onPress={() => onPresence(seat.memberId, away)} disabled={busy} hitSlop={6}>
                    <Text style={styles.action}>{away ? t('play.markPresent') : t('play.markAway')}</Text>
                  </Pressable>
                ) : null}
                {!seat.mine ? (
                  <View style={styles.actions}>
                    {isHost && seat.role !== 'host' ? (
                      <Pressable onPress={() => setConfirming({ memberId: seat.memberId, action: 'remove' })} disabled={busy} hitSlop={6} accessibilityRole="button">
                        <Text style={styles.action}>{t('playersPanel.sacar')}</Text>
                      </Pressable>
                    ) : null}
                    {seat.userId ? (
                      <Pressable onPress={() => setConfirming({ memberId: seat.memberId, action: 'block' })} disabled={busy} hitSlop={6} accessibilityRole="button">
                        <Text style={[styles.action, styles.danger]}>{t('playersPanel.bloquear')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {confirming?.memberId === seat.memberId ? (
                  <View style={styles.confirm}>
                    <Text style={styles.confirmText}>
                      {confirming.action === 'remove'
                        ? t('playersPanel.confirmSacar', { name: seat.name })
                        : seat.role === 'host'
                          ? t('playersPanel.confirmBloquearAnfitrion', { name: seat.name })
                          : t('playersPanel.confirmBloquear', { name: seat.name })}
                    </Text>
                    <View style={styles.actions}>
                      <Button
                        small
                        danger
                        disabled={busy}
                        label={confirming.action === 'remove' ? t('playersPanel.siSacar') : t('playersPanel.siBloquear')}
                        onPress={() => {
                          setConfirming(null)
                          if (confirming.action === 'remove') onRemove(seat.memberId)
                          else onBlock(seat)
                        }}
                      />
                      <Button small label={t('playersPanel.cancelar')} onPress={() => setConfirming(null)} />
                    </View>
                  </View>
                ) : null}
              </View>
              {seat.state === 'ready' ? <Icon d={ICON.check} size={24} color={theme.colors.success} strokeWidth={2.2} /> : null}
            </View>
          )
        })}
      </Panel>
      {invite}
    </>
  )
}

const styles = StyleSheet.create({
  seat: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', top: 16, right: 16 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  danger: { color: theme.colors.danger },
  confirm: { marginTop: 8, gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: 'rgba(0,0,0,0.25)' },
  confirmText: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink },
})
