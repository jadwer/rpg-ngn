import { ApiError, providerChoice, withProvider, type ApiClient, type DmPreset, type DmProbeResult, type DmProviderChoice, type TableSummary } from '@rpg-ngn/api-client'
import { describePreset, savedProviderText } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { RadioRow } from './RadioRow'

interface Props {
  client: ApiClient
  table: TableSummary
  busy?: boolean | undefined
  /** La mesa cambio (proveedor guardado): que el padre la recargue. */
  onChanged: () => void
  onUnauthorized: () => void
}

/**
 * Proveedor del DM de la mesa, como la pestaña DM del mando en la web
 * (docs/09: configurable, obligatorio antes de jugar). Se elige entre los
 * presets del servidor, sin credenciales; el modelo es opcional; "Probar"
 * llama al engine con el preset antes de guardarlo. Solo el anfitrion lo ve
 * (la API tambien lo exige).
 */
export function DmSettingsPanel({ client, table, busy = false, onChanged, onUnauthorized }: Props) {
  const [presets, setPresets] = useState<DmPreset[] | null>(null)
  const [defaultPreset, setDefaultPreset] = useState<string>('')
  const saved = useMemo(() => providerChoice(table.settings), [table.settings])
  const [preset, setPreset] = useState<string>(saved?.preset ?? '')
  const [model, setModel] = useState<string>(saved?.model ?? '')
  const [working, setWorking] = useState(false)
  const [probe, setProbe] = useState<DmProbeResult | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setPreset(saved?.preset ?? '')
    setModel(saved?.model ?? '')
  }, [saved])

  useEffect(() => {
    let alive = true
    void client.listDmPresets().then(
      (result) => {
        if (!alive) return
        setPresets(result.presets)
        setDefaultPreset(result.defaultPreset)
      },
      (caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
        else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
      },
    )
    return () => {
      alive = false
    }
  }, [client, onUnauthorized])

  const chosen: DmProviderChoice | null = preset ? { preset, model: model.trim() || null } : null
  const current = presets?.find((p) => p.name === (preset || defaultPreset)) ?? null
  const dirty = (chosen?.preset ?? '') !== (saved?.preset ?? '') || (chosen?.model ?? '') !== (saved?.model ?? '')

  const run = async (action: () => Promise<void>) => {
    setWorking(true)
    setNotice(null)
    try {
      await action()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        onUnauthorized()
        return
      }
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setWorking(false)
    }
  }

  const test = () =>
    run(async () => {
      setProbe(null)
      setProbe(await client.probeDm(table.id, chosen ?? { preset: defaultPreset, model: null }))
    })

  const save = () =>
    run(async () => {
      await client.updateTableSettings(table.id, withProvider(table.settings, chosen))
      setNotice({ ok: true, text: savedProviderText(chosen) })
      onChanged()
    })

  const disabled = busy || working

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>El director de juego de esta mesa. Las claves viven en el servidor; aquí solo eliges cuál usar. Traer tu propia clave llegará más adelante.</Text>

      <Text style={styles.label}>Proveedor</Text>
      {presets === null ? <Text style={styles.hint}>Consultando los presets del servidor...</Text> : null}
      <RadioRow label={defaultPreset ? `El del servidor (${describePreset(defaultPreset)})` : 'El del servidor'} selected={preset === ''} disabled={disabled || presets === null} onSelect={() => setPreset('')} />
      {(presets ?? []).map((p) => (
        <RadioRow key={p.name} label={describePreset(p.name)} sub={p.configured ? (p.model ?? null) : 'sin configurar en el servidor'} selected={preset === p.name} disabled={disabled || !p.configured} onSelect={() => setPreset(p.name)} />
      ))}

      {current && current.kind !== 'scripted' ? (
        <>
          <Text style={styles.label}>Modelo (opcional)</Text>
          <TextInput value={model} onChangeText={setModel} placeholder={current.model ?? ''} placeholderTextColor={theme.colors.inkFaint} autoCapitalize="none" autoCorrect={false} maxLength={120} editable={!disabled} style={styles.input} />
          <Text style={styles.hint}>{`Vacío: ${current.model ?? 'el del preset'}. Solo si sabes qué modelo quieres.`}</Text>
        </>
      ) : null}

      {probe ? <Text style={[styles.result, probe.ok ? styles.ok : styles.error]}>{`${probe.ok ? 'Listo: ' : 'No responde: '}${probe.message}${probe.model ? ` (${probe.model})` : ''}`}</Text> : null}
      {notice ? <Text style={[styles.result, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}

      <View style={styles.row}>
        <Button label="Probar" busy={working} disabled={disabled || presets === null} onPress={() => void test()} />
        <Button label="Guardar" primary busy={working} disabled={disabled || !dirty} onPress={() => void save()} />
      </View>
      <Text style={styles.hint}>Probar no gasta un turno; solo comprueba clave y modelo.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, marginTop: 10 },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  input: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  result: { fontFamily: theme.fonts.serif, fontSize: 14, lineHeight: 19, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#cfe3b8', borderColor: '#5d803e', backgroundColor: 'rgba(93, 128, 62, 0.22)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
