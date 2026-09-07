import type { Session } from '@rpg-ngn/content'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { sessionList, type OfflineCampaign } from '../pack/offline'
import { theme } from '../theme'

interface Props {
  campaign: OfflineCampaign
  onSelect: (sessionId: string) => void
  onBack?: (() => void) | undefined
}

export function SessionPicker({ campaign, onSelect, onBack }: Props) {
  const { manifest } = campaign.pack
  const sessions = sessionList(campaign.pack)

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Inicio</Text>
        </Pressable>
      ) : null}
      {manifest.motto ? <Text style={styles.motto}>{`"${manifest.motto}"`}</Text> : null}
      <Text style={styles.title}>{manifest.name}</Text>
      {manifest.tagline ? <Text style={styles.tagline}>{manifest.tagline}</Text> : null}

      <Text style={styles.hint}>Elige la sesión que se juega hoy</Text>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} campaign={campaign} onPress={() => onSelect(session.id)} />
      ))}

      <Text style={styles.footer}>{`${manifest.id}@${manifest.version} · sin conexión`}</Text>
    </ScrollView>
  )
}

function SessionCard({ session, campaign, onPress }: { session: Session; campaign: OfflineCampaign; onPress: () => void }) {
  const party = session.party.map((p) => `${campaign.pack.characters.get(p.character)?.name ?? p.character} (${p.player})`)
  const choosing = (session.availableCharacters?.length ?? 0) > 0
  const badge = session.status === 'played' ? 'jugada' : session.status === 'planned' ? 'próxima' : 'cancelada'

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, session.status === 'planned' && styles.cardNext, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{session.title}</Text>
        <Text style={[styles.badge, session.status === 'planned' && styles.badgeNext]}>{badge}</Text>
      </View>
      <Text style={styles.date}>{session.date}</Text>
      <Text style={styles.briefing} numberOfLines={3}>
        {session.briefing}
      </Text>
      {party.length > 0 ? <Text style={styles.party}>{`En la mesa: ${party.join(' · ')}`}</Text> : null}
      {choosing ? <Text style={styles.party}>{`${session.availableCharacters?.length} personajes por elegir`}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, gap: 10 },
  back: { alignSelf: 'flex-start' },
  backText: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.accent },
  motto: { fontFamily: theme.fonts.serif, fontStyle: 'italic', color: theme.colors.inkDim, textAlign: 'center', fontSize: 15 },
  title: { fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.gold, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  tagline: { fontFamily: theme.fonts.serif, color: theme.colors.inkDim, textAlign: 'center', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', fontSize: 12 },
  hint: { fontFamily: theme.fonts.serif, color: theme.colors.inkDim, fontSize: 14, marginTop: 6 },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 14, gap: 4 },
  cardNext: { borderColor: theme.colors.gold },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold },
  badge: { fontFamily: theme.fonts.serif, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  badgeNext: { color: theme.colors.gold, borderColor: theme.colors.gold },
  date: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  briefing: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
  party: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, marginTop: 4 },
  footer: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center', marginTop: 16, letterSpacing: 1 },
})
