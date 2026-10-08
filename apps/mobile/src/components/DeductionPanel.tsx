import type { DeductionView } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { deductionAlerts, deductionBallot, deductionHeader, deductionRole, deductionTasks } from '@rpg-ngn/ui-logic'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

/**
 * La partida de roles ocultos en la mesa del telefono (Turno de noche en la
 * Persefone, 08-10), a la par de la web: la fase, tu rol, tus tareas y, en
 * una reunion, la papeleta. La logica es la de ui-logic; el diseño fino es de Gabino.
 */
export function DeductionPanel({ view, self, nameOf, roomName, busy, onVote }: { view: DeductionView; self: string | null; nameOf: (id: string) => string; roomName: (id: string) => string; busy: boolean; onVote: (target: string | null) => void }) {
  const role = deductionRole(view)
  const tasks = deductionTasks(view, roomName)
  const alerts = deductionAlerts(view, nameOf, roomName)
  const ballot = deductionBallot(view, nameOf, self)
  return (
    <View style={[styles.panel, role?.tone === 'ghost' ? styles.ghost : null]} accessibilityLabel={deductionHeader(view)}>
      <Text style={styles.phase}>{deductionHeader(view)}</Text>
      {role ? (
        <Text style={styles.text}>
          <Text style={[styles.label, role.tone === 'host' ? styles.host : null]}>{role.title}. </Text>
          {role.hint}
        </Text>
      ) : null}
      {alerts.map((alert) => (
        <Text key={alert} style={styles.text}>
          {alert}
        </Text>
      ))}
      {tasks.length ? (
        <View style={styles.section}>
          <Text style={styles.label}>{t('deduction.myTasks')}</Text>
          {tasks.map((task) => (
            <Text key={task.id} style={[styles.text, task.done ? styles.done : null]}>
              {`· ${task.label}${task.done ? ` (${t('deduction.taskDone')})` : ''}`}
            </Text>
          ))}
        </View>
      ) : null}
      {ballot ? (
        <View style={styles.section}>
          <Text style={styles.label}>{t('deduction.vote')}</Text>
          {ballot.canVote ? (
            <View style={styles.options}>
              {ballot.options.map((option) => (
                <Button key={option.id} small primary={option.chosen} disabled={busy} label={option.label} onPress={() => onVote(option.id)} />
              ))}
              <Button small primary={ballot.skipChosen} disabled={busy} label={t('deduction.skip')} onPress={() => onVote(null)} />
            </View>
          ) : (
            <Text style={styles.text}>{t('deduction.ghostNoVote')}</Text>
          )}
          {ballot.current ? <Text style={styles.text}>{ballot.current}</Text> : null}
          <Text style={styles.dim}>{ballot.waiting}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  ghost: { opacity: 0.8 },
  phase: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.ink },
  label: { fontFamily: theme.fonts.uiSemiBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: theme.colors.goldBright },
  host: { color: theme.colors.danger },
  text: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
  dim: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.inkDim },
  done: { textDecorationLine: 'line-through', color: theme.colors.inkDim },
  section: { gap: 4, marginTop: 4 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
