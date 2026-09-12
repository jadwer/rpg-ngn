import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Tts } from '../hooks/useTts'
import { PITCH_MAX, PITCH_MIN, PITCH_STEP, RATE_MAX, RATE_MIN, RATE_STEP, voiceLabel, type VoiceInfo } from '../speech/voices'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  visible: boolean
  tts: Tts
  onClose: () => void
}

/**
 * Selector de voz del sistema (docs/09, "Narracion por voz"). El telefono no
 * dice si una voz es masculina o femenina, asi que cada una se prueba de
 * oido con "Oír"; la elegida se recuerda por telefono. Velocidad y tono del
 * narrador van con pasos, sin slider nativo (una dependencia menos).
 */
export function VoicePicker({ visible, tts, onClose }: Props) {
  const { voices, settings } = tts
  const selectedId = tts.voice?.id ?? null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>Voz</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
            <Text style={styles.headerLink}>Cerrar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>Voz del narrador</Text>
          <Text style={styles.hint}>Las voces son las que trae el teléfono. Ninguna dice si es de hombre o de mujer: elige de oído.</Text>

          <VoiceRow label="La voz del sistema para español" sub="Sin elegir; el teléfono decide" selected={selectedId === null} onSelect={() => tts.setVoiceId(null)} onPreview={() => tts.preview(null)} />
          {voices === null ? <Text style={styles.hint}>El teléfono no ha contestado qué voces tiene.</Text> : null}
          {voices?.length === 0 ? <Text style={styles.warn}>No hay voces en español instaladas. En Android: Ajustes, Texto a voz, Instalar datos de voz, Español. En iOS: Accesibilidad, Contenido leído, Voces.</Text> : null}
          {voices?.map((voice) => (
            <VoiceRow key={voice.id} label={voiceLabel(voice)} sub={voice.enhanced ? 'Mejorada: suena más natural' : null} selected={selectedId === voice.id} onSelect={() => tts.setVoiceId(voice.id)} onPreview={() => tts.preview(voice)} />
          ))}

          <Text style={styles.label}>Velocidad</Text>
          <Stepper value={settings.rate} min={RATE_MIN} max={RATE_MAX} step={RATE_STEP} format={(v) => `${v.toFixed(2)}x`} onChange={tts.setRate} />

          <Text style={styles.label}>Tono del narrador</Text>
          <Text style={styles.hint}>Más bajo suena más grave. Los personajes de la party hablan con el tono normal y cada NPC lleva el suyo.</Text>
          <Stepper value={settings.narratorPitch} min={PITCH_MIN} max={PITCH_MAX} step={PITCH_STEP} format={(v) => v.toFixed(2)} onChange={tts.setNarratorPitch} />

          <View style={styles.actions}>
            <Button label="Oír con estos ajustes" onPress={() => tts.preview(tts.voice)} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function VoiceRow({ label, sub, selected, onSelect, onPreview }: { label: string; sub: string | null; selected: boolean; onSelect: () => void; onPreview: () => void }) {
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable onPress={onSelect} style={styles.rowMain} accessibilityRole="radio" accessibilityState={{ selected }}>
        <Text style={[styles.radio, selected && styles.radioOn]}>{selected ? '◉' : '○'}</Text>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, selected && styles.rowLabelOn]} numberOfLines={2}>
            {label}
          </Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
      </Pressable>
      <Button label="Oír" small onPress={onPreview} />
    </View>
  )
}

function Stepper({ value, min, max, step, format, onChange }: { value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Button label="−" small disabled={value <= min + 1e-9} onPress={() => onChange(value - step)} />
      <Text style={styles.stepperValue}>{format(value)}</Text>
      <Button label="+" small disabled={value >= max - 1e-9} onPress={() => onChange(value + step)} />
    </View>
  )
}

export type { VoiceInfo }

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.panel },
  headerSide: { minWidth: 56, alignItems: 'flex-end' },
  headerLink: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright },
  headerTitle: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 1 },
  body: { padding: 16, paddingBottom: 40, gap: 8 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, marginTop: 14 },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 14, lineHeight: 19, color: theme.colors.inkDim },
  warn: { fontFamily: theme.fonts.serif, fontSize: 14, lineHeight: 19, color: theme.colors.goldBright, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  rowSelected: { borderColor: theme.colors.gold, backgroundColor: theme.colors.panel2 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1 },
  radio: { color: theme.colors.inkDim, fontSize: 16 },
  radioOn: { color: theme.colors.gold },
  rowLabel: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  rowLabelOn: { color: theme.colors.goldBright },
  rowSub: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start' },
  stepperValue: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.ink, minWidth: 56, textAlign: 'center' },
  actions: { marginTop: 18, alignItems: 'flex-start' },
})
