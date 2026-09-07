import { groupBlocks, sessionBlocks, type ViewMode } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlockGroups } from '../components/BlockGroups'
import { NarratorBanner } from '../components/NarratorBanner'
import { TtsBar } from '../components/TtsBar'
import { useTts } from '../hooks/useTts'
import type { OfflineCampaign } from '../pack/offline'
import { offlineSheetEntries } from '../sheets/entries'
import { hasSpanishVoice } from '../speech/expoSpeechEngine'
import { theme } from '../theme'
import { SheetsModal } from './SheetsModal'

interface Props {
  campaign: OfflineCampaign
  sessionId: string
  onBack: () => void
}

export function SessionScreen({ campaign, sessionId, onBack }: Props) {
  const session = campaign.pack.sessions.get(sessionId)
  if (!session) throw new Error(`no hay sesion ${sessionId} en el pack`)

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [spanishVoice, setSpanishVoice] = useState<boolean | null>(null)

  const blocks = useMemo(() => sessionBlocks({ pack: campaign.pack, session, state: campaign.state, events: campaign.events }), [campaign, session])
  const groups = useMemo(() => groupBlocks(blocks, mode), [blocks, mode])
  const entries = useMemo(() => offlineSheetEntries(campaign, session), [campaign, session])
  const tts = useTts(blocks)

  useEffect(() => {
    let alive = true
    void hasSpanishVoice().then((value) => {
      if (alive) setSpanishVoice(value)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Sesiones</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {session.title}
        </Text>
        <Pressable onPress={() => setSheetsOpen(true)} hitSlop={10} style={styles.sheetsButton}>
          <Text style={styles.sheetsText}>Fichas</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.segmented}>
          <Segment label="Narrativa" active={mode === 'narrative'} onPress={() => setMode('narrative')} />
          <Segment label="Diálogo" active={mode === 'dialogue'} onPress={() => setMode('dialogue')} />
        </View>
        <TtsBar tts={tts} />
        <NarratorBanner localSpeaking={tts.state.status === 'speaking'} spanishVoice={spanishVoice} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <BlockGroups groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} />
      </ScrollView>

      <SheetsModal visible={sheetsOpen} onClose={() => setSheetsOpen(false)} entries={entries} footer={`Estado tras ${campaign.events.length} eventos del log, sin conexión`} />
    </View>
  )
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.accent },
  title: { flex: 1, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center' },
  sheetsButton: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sheetsText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold },
  toolbar: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  segment: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: theme.colors.panel },
  segmentActive: { backgroundColor: theme.colors.gold },
  segmentText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold },
  segmentTextActive: { color: theme.colors.panel },
  content: { padding: 16, paddingBottom: 48 },
})
