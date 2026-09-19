import { ApiError, withProvider, type ApiClient, type DmPreset, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { cleanTableName, packCharacters, presetOptionLabel, providerForNewTable, selectablePresets } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button } from '../../components/Button'
import { CharacterPicker } from '../../components/CharacterPicker'
import { DmSettingsPanel } from '../../components/DmSettingsPanel'
import { Field } from '../../components/Field'
import { InvitePanel } from '../../components/InvitePanel'
import { RadioRow } from '../../components/RadioRow'
import type { StoredUser } from '../../online/storage'
import { PACK_OPTION } from '../../pack/offline'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  user: StoredUser
  pack: LoadedPack
  onBack: () => void
  /** Entrar a la mesa recien creada. */
  onOpen: (table: TableSummary) => void
  onUnauthorized: () => void
}

const PREMISE_PLACEHOLDER = 'Campaña, escena o tono; el DM la usa como punto de partida. Por ejemplo: "Valdoria, la posada al caer la noche. Esta noche esperan a Calder, que bajó a la mina y no ha vuelto."'

/**
 * Crear mesa en dos pasos, como en la web: nombre, personaje del anfitrion,
 * director de juego (entre los presets del servidor) y premisa; despues,
 * probar el DM e invitar amigos (la mesa ya existe y se puede entrar sin
 * invitar). El pack es el empaquetado en la app.
 */
export function NewTableScreen({ client, user, pack, onBack, onOpen, onUnauthorized }: Props) {
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [premise, setPremise] = useState('')
  const [presets, setPresets] = useState<DmPreset[]>([])
  const [defaultPreset, setDefaultPreset] = useState('')
  const [preset, setPreset] = useState('')
  const [packs, setPacks] = useState<PackOption[]>([])
  const [packId, setPackId] = useState<string>(PACK_OPTION.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<TableSummary | null>(null)

  const characters = useMemo(() => packCharacters(pack), [pack])
  const cleanName = cleanTableName(name)
  const option = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId])
  // La app lleva el pack piloto dentro para pintar retratos y fichas sin red.
  // Si el servidor ofrece otro, la mesa se crea igual pero los personajes se
  // eligen al invitar.
  const bundled = packId === PACK_OPTION.id

  // Packs que el servidor puede jugar; antes la app solo sabia del suyo.
  useEffect(() => {
    let alive = true
    void client.listPacks().then(
      (result) => {
        if (!alive) return
        setPacks(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client])

  // Presets del DM que ofrece el servidor (docs/09: el proveedor se elige al crear la mesa).
  useEffect(() => {
    let alive = true
    void client.listDmPresets().then(
      (result) => {
        if (!alive) return
        setPresets(selectablePresets(result.presets))
        setDefaultPreset(result.defaultPreset)
        setPreset(result.defaultPreset)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client])

  const submit = async () => {
    if (!cleanName) return
    setBusy(true)
    setError(null)
    try {
      const provider = providerForNewTable(preset, defaultPreset)
      // El ruleset lo pone la app (el manifiesto lo declara sin version).
      const elegido = option ?? PACK_OPTION
      const table = await client.createTable({ name: cleanName, packId: elegido.id, packVersion: elegido.version, ruleset: PACK_OPTION.ruleset, premise, ...(provider ? { settings: withProvider({}, provider) } : {}) })
      if (characterId) await client.setOwnerCharacter(table.id, user.id, characterId)
      setCreated(await client.table(table.id))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const reloadCreated = () => {
    if (created) void client.table(created.id).then(setCreated, () => undefined)
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Mesas</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {created ? created.name : 'Nueva mesa'}
        </Text>
        <Text style={styles.who} numberOfLines={1}>
          {created ? 'creada' : user.name}
        </Text>
      </View>

      {created ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>La mesa ya existe. Invita a tus amigos ahora o después desde el mando del anfitrión; cuando quieras, entra y abre la sesión.</Text>
          <InvitePanel client={client} table={created} meId={user.id} pack={pack} onChanged={reloadCreated} onUnauthorized={onUnauthorized} />
          <Text style={styles.label}>Director de juego</Text>
          <DmSettingsPanel client={client} table={created} onChanged={reloadCreated} onUnauthorized={onUnauthorized} />
          <View style={styles.actions}>
            <Button label="Ir a la mesa" primary onPress={() => onOpen(created)} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Nombre de la mesa" value={name} onChangeText={setName} placeholder="Los Nueve Viajeros, sábado" maxLength={120} autoFocus />
          <View style={styles.block}>
            <Text style={styles.label}>Pack y sistema</Text>
            {packs.length > 1 ? (
              packs.map((p) => (
                <RadioRow key={`${p.id}@${p.version}`} label={`${p.name} (${p.id}@${p.version}, ${p.system})`} selected={packId === p.id} onSelect={() => setPackId(p.id)} />
              ))
            ) : (
              <Text style={styles.value}>{`${option?.name ?? pack.manifest.name} (${option?.id ?? PACK_OPTION.id}@${option?.version ?? PACK_OPTION.version}, ${option?.system ?? PACK_OPTION.ruleset})`}</Text>
            )}
            {option?.tagline ? <Text style={styles.hint}>{option.tagline}</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Tu personaje</Text>
            {bundled ? (
              <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} allowNone />
            ) : (
              <Text style={styles.hint}>Este pack se juega desde el servidor; los personajes se eligen al invitar.</Text>
            )}
          </View>
          {presets.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.label}>Director de juego</Text>
              {presets.map((p) => (
                <RadioRow key={p.name} label={presetOptionLabel(p)} selected={preset === p.name} onSelect={() => setPreset(p.name)} />
              ))}
              <Text style={styles.hint}>Se puede cambiar y probar después desde el mando del anfitrión, botón DM.</Text>
            </View>
          ) : null}
          <View style={styles.block}>
            <Text style={styles.label}>Premisa de la mesa (opcional)</Text>
            <TextInput value={premise} onChangeText={setPremise} placeholder={PREMISE_PLACEHOLDER} placeholderTextColor={theme.colors.inkFaint} multiline maxLength={2000} style={styles.premise} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Crear mesa" primary busy={busy} disabled={!cleanName} onPress={() => void submit()} />
            <Text style={styles.hint}>Después podrás probar el DM e invitar a tus amigos.</Text>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright, minWidth: 64 },
  title: { flex: 1, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center', letterSpacing: 1 },
  who: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, minWidth: 64, textAlign: 'right' },
  form: { padding: 16, paddingBottom: 48, gap: 14 },
  block: { gap: 6 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  value: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.inkDim },
  premise: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 110, textAlignVertical: 'top' },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.danger },
  actions: { gap: 8, alignItems: 'flex-start', marginTop: 4 },
})
