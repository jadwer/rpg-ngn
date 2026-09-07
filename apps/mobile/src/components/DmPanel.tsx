import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  session: { code: string; status: string } | null
  /** Codigo sugerido: la siguiente sesion planeada del pack. */
  suggestedCode: string
  busy: boolean
  onOpenSession: (code: string, worldTime: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
}

/** Mando del DM: abrir la sesion con su codigo de tres digitos y cerrarla con un cliffhanger opcional. */
export function DmPanel({ session, suggestedCode, busy, onOpenSession, onCloseSession }: Props) {
  const [expanded, setExpanded] = useState(!session)
  const [code, setCode] = useState(suggestedCode)
  const [worldTime, setWorldTime] = useState('')
  const [cliffhanger, setCliffhanger] = useState('')
  const validCode = /^[0-9]{3}$/.test(code)

  return (
    <View style={styles.panel}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.headerRow} accessibilityRole="button">
        <Text style={styles.title}>Mando del DM</Text>
        <Text style={styles.state}>{session ? `Sesión ${session.code} abierta` : 'Sin sesión abierta'}</Text>
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>
      {expanded && !session ? (
        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={3} placeholder="003" placeholderTextColor={theme.colors.inkDim} style={[styles.input, styles.code]} />
            <TextInput value={worldTime} onChangeText={setWorldTime} placeholder="Momento del mundo (opcional)" placeholderTextColor={theme.colors.inkDim} style={[styles.input, styles.grow]} />
          </View>
          <Button label="Abrir sesión" primary busy={busy} disabled={!validCode} onPress={() => onOpenSession(code, worldTime.trim() || null)} />
        </View>
      ) : null}
      {expanded && session ? (
        <View style={styles.form}>
          <TextInput value={cliffhanger} onChangeText={setCliffhanger} placeholder="Cliffhanger para la próxima (opcional)" placeholderTextColor={theme.colors.inkDim} style={styles.input} />
          <Button label="Cerrar sesión y congelar snapshot" busy={busy} onPress={() => onCloseSession(cliffhanger.trim() || null)} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel2, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  state: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  chevron: { color: theme.colors.gold, fontSize: 14 },
  form: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  code: { width: 72, textAlign: 'center', fontFamily: theme.fonts.display, letterSpacing: 2 },
  grow: { flex: 1 },
})
