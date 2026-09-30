import { type ApiClient, ApiError, type GmPreset, type GmProbeResult, type GmProviderChoice, type OwnKey, providerChoice, type TableSummary, withProvider } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { describePreset, presetAvailability, savedProviderText, type TableGmInfo, tableGmText } from '@rpg-ngn/ui-logic'
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
 * Proveedor del GM de la mesa, como la pestaña GM del mando en la web
 * (docs/09: configurable, obligatorio antes de jugar). Se elige entre los
 * presets del servidor, sin credenciales; el modelo es opcional; "Probar"
 * llama al engine con el preset antes de guardarlo. Solo el anfitrion lo ve
 * (la API tambien lo exige).
 */
export function GmSettingsPanel({ client, table, busy = false, onChanged, onUnauthorized }: Props) {
  // Con que narra de verdad la mesa y quien lo paga (23-09: elegir Anthropic no decia si era la clave propia).
  const [gmInfo, setGmInfo] = useState<TableGmInfo | null>(null)
  useEffect(() => {
    let alive = true
    void client.tableGm(table.id).then(
      (info) => {
        if (alive) setGmInfo(info)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, table.id, table.settings])
  const [presets, setPresets] = useState<GmPreset[] | null>(null)
  // Tus claves propias: con una, el proveedor se elige aunque el servidor no tenga la suya.
  const [ownKeys, setOwnKeys] = useState<OwnKey[]>([])
  const [defaultPreset, setDefaultPreset] = useState<string>('')
  const saved = useMemo(() => providerChoice(table.settings), [table.settings])
  const [preset, setPreset] = useState<string>(saved?.preset ?? '')
  const [model, setModel] = useState<string>(saved?.model ?? '')
  // Los dados van aparte, en DiceModePanel, que guarda al elegir: aqui
  // estaban repetidos y el modal los enseñaba dos veces.
  const [working, setWorking] = useState(false)
  const [probe, setProbe] = useState<GmProbeResult | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setPreset(saved?.preset ?? '')
    setModel(saved?.model ?? '')
  }, [saved])

  useEffect(() => {
    let alive = true
    void client.listGmPresets().then(
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

  const chosen: GmProviderChoice | null = preset ? { preset, model: model.trim() || null } : null
  useEffect(() => {
    let alive = true
    void client.listOwnKeys().then(
      (keys) => alive && setOwnKeys(keys),
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client])

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
      setProbe(await client.probeGm(table.id, chosen ?? { preset: defaultPreset, model: null }))
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
      {gmInfo ? <Text style={styles.now}>{tableGmText(gmInfo)}</Text> : null}
      <Text style={styles.hint}>{t('mobile.gmSettingsPanel.tuPropiaClaveSeGuarda')}</Text>

      <Text style={styles.label}>{t('gmSettings.proveedor')}</Text>
      {presets === null ? <Text style={styles.hint}>{t('mobile.gmSettingsPanel.consultandoLosPresetsDel')}</Text> : null}
      <RadioRow label={defaultPreset ? t('play.serverPreset', { preset: describePreset(defaultPreset) }) : t('play.serverPresetShort')} selected={preset === ''} disabled={disabled || presets === null} onSelect={() => setPreset('')} />
      {(presets ?? []).map((p) => (
        <RadioRow
          key={p.name}
          label={describePreset(p.name)}
          sub={presetAvailability(p, ownKeys).note ?? p.model ?? null}
          selected={preset === p.name}
          disabled={disabled || !presetAvailability(p, ownKeys).selectable}
          onSelect={() => setPreset(p.name)}
        />
      ))}

      {current && current.kind !== 'scripted' ? (
        <>
          <Text style={styles.label}>{t('gmSettings.modeloOpcional')}</Text>
          <TextInput value={model} onChangeText={setModel} placeholder={current.model ?? ''} placeholderTextColor={theme.colors.inkFaint} autoCapitalize="none" autoCorrect={false} maxLength={120} editable={!disabled} style={styles.input} />
          <Text style={styles.hint}>{t('gmSettings.vacioElDelPreset', { model: current.model ?? t('gmSettings.elDelPreset') })}</Text>
        </>
      ) : null}

      {probe ? <Text style={[styles.result, probe.ok ? styles.ok : styles.error]}>{`${probe.ok ? t('play.probeOk') : t('play.probeFail')}${probe.message}${probe.model ? ` (${probe.model})` : ''}`}</Text> : null}
      {notice ? <Text style={[styles.result, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}

      <View style={styles.row}>
        <Button label={t('gmSettings.probar')} busy={working} disabled={disabled || presets === null} onPress={() => void test()} />
        <Button label={t('gmSettings.guardar')} primary busy={working} disabled={disabled || !dirty} onPress={() => void save()} />
      </View>
      <Text style={styles.hint}>{t('gmSettings.probarNoGasta')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  now: { fontFamily: theme.fonts.uiMedium, fontSize: 14, lineHeight: 20, color: theme.colors.ink, backgroundColor: 'rgba(124, 58, 237, 0.14)', borderRadius: 10, padding: 10, overflow: 'hidden' },
  wrap: { gap: 8 },
  label: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim, marginTop: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  input: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  result: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 19, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
