import { t, language, type Language } from '@rpg-ngn/i18n'
import { ApiError, packPortraitUrl, withProvider, type ApiClient, type GmPreset, type PackCharacter, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { defaultSessionLength, SESSION_LENGTHS, sessionLengthLabel, withSessionLength, type SessionLength, newTableLanguage, worldLanguageNote, worldLanguages, cleanTableName, packCharacters, packOptionLabel, packSummaryText, premisePlaceholder, presetOptionParts, providerForNewTable, selectablePresets, tableNamePlaceholder } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Backdrop } from '../../components/Backdrop'
import { Button } from '../../components/Button'
import { CharacterPicker } from '../../components/CharacterPicker'
import { GmSettingsPanel } from '../../components/GmSettingsPanel'
import { Field } from '../../components/Field'
import { InvitePanel } from '../../components/InvitePanel'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { RadioRow } from '../../components/RadioRow'
import { WorldOption } from '../../components/WorldOption'
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
  /** "Jugar" desde Explorar mundos: ese mundo va elegido. */
  initialPackId?: string | undefined
}

/**
 * Crear mesa en dos pasos, como en la web: nombre, personaje del anfitrion,
 * director de juego (entre los presets del servidor) y premisa; despues,
 * probar el GM e invitar amigos (la mesa ya existe y se puede entrar sin
 * invitar). El pack es el empaquetado en la app.
 */
export function NewTableScreen({ client, user, pack, onBack, onOpen, onUnauthorized, initialPackId }: Props) {
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [premise, setPremise] = useState('')
  const [presets, setPresets] = useState<GmPreset[]>([])
  const [ownKeys, setOwnKeys] = useState<string[]>([])
  const [defaultPreset, setDefaultPreset] = useState('')
  const [preset, setPreset] = useState('')
  const [packs, setPacks] = useState<PackOption[]>([])
  const [packId, setPackId] = useState<string>(initialPackId ?? PACK_OPTION.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<TableSummary | null>(null)

  const characters = useMemo(() => packCharacters(pack), [pack])
  const cleanName = cleanTableName(name)
  const option = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId])
  // Idioma de la mesa, como la web: el de la interfaz si el mundo lo trae; si
  // no, el del mundo. Con mas de uno, lo elige quien crea la mesa (02-10).
  const [chosenLang, setChosenLang] = useState<Language | null>(null)
  const optionLangs = worldLanguages(option)
  const tableLang = chosenLang && optionLangs.includes(chosenLang) ? chosenLang : newTableLanguage(option, language())
  // Largo de sesion (docs/26, H8): el que recomienda el mundo, o el que elija quien crea la mesa.
  const [chosenLength, setChosenLength] = useState<SessionLength | null>(null)
  const sessionLength = chosenLength ?? defaultSessionLength(option)
  // La app lleva el pack piloto dentro para pintar retratos y fichas sin red.
  // De cualquier otro pack, los personajes y sus retratos los da la API.
  const bundled = packId === PACK_OPTION.id
  const [remoteCharacters, setRemoteCharacters] = useState<PackCharacter[]>([])
  const remotePickables = useMemo(
    () => remoteCharacters.map((c) => ({ id: c.id, name: c.name, race: c.race, class: c.characterClass, roles: c.roles, portraitUri: portraitUri(client.baseUrl, option?.id ?? '', c.portrait) })),
    [remoteCharacters, client.baseUrl, option?.id],
  )

  useEffect(() => {
    if (!option || bundled) {
      setRemoteCharacters([])
      return
    }
    let alive = true
    void client.listPackCharacters(option.id, option.version).then(
      (result) => {
        if (alive) setRemoteCharacters(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, option, bundled])

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

  // Presets del GM que ofrece el servidor (docs/09: el proveedor se elige al crear la mesa).
  useEffect(() => {
    let alive = true
    // Con las claves propias: una clave guardada se ofrece al crear la mesa y
    // se preselecciona, aunque el servidor no tenga ese proveedor.
    void Promise.all([client.listGmPresets(), client.listOwnKeys().catch(() => [])]).then(
      ([result, keys]) => {
        if (!alive) return
        const own = keys.filter((k) => k.configured).map((k) => k.preset)
        setOwnKeys(own)
        setPresets(selectablePresets(result.presets, own))
        setDefaultPreset(result.defaultPreset)
        setPreset(own[0] ?? result.defaultPreset)
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
      // El ruleset lo declara el pack (`system`), no la app. Antes iba siempre
      // el del piloto y una mesa de intriga nacia con reglas de combate (VAM
      // del 19-09, movil A1). Sin version: el motor resuelve la unica que tiene.
      const elegido = option ?? PACK_OPTION
      const ruleset = option ? option.system : PACK_OPTION.ruleset
      const table = await client.createTable({ name: cleanName, packId: elegido.id, packVersion: elegido.version, ruleset, premise, settings: withSessionLength({ ...(provider ? withProvider({}, provider) : {}), language: tableLang }, sessionLength) })
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
      <PageHeader back={t('play.tablesBack')} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* El marco de Mesas: su fondo y un titulo grande (27-09). */}
        <Backdrop />
        <View style={styles.column}>
          <View style={styles.hero}>
            <Text style={styles.title} numberOfLines={2}>
              {created ? created.name : t('newTable.nuevaMesa')}
            </Text>
            <Text style={styles.subtitle}>{created ? t('mobile.newTableScreen.laMesaYaExiste') : t('mobile.newTableScreen.unaHistoriaNuevaPara')}</Text>
          </View>

          {created ? (
            <>
              <Text style={styles.hint}>{t('mobile.newTableScreen.invitaATusAmigos')}</Text>
              <Panel>
                <InvitePanel client={client} table={created} meId={user.id} pack={created.packId === pack.manifest.id ? pack : null} onChanged={reloadCreated} onUnauthorized={onUnauthorized} />
              </Panel>
              <Panel title={t('newTable.directorDeJuego')}>
                <GmSettingsPanel client={client} table={created} onChanged={reloadCreated} onUnauthorized={onUnauthorized} />
              </Panel>
              <View style={styles.actions}>
                <Button label={t('newTable.irALaMesa')} primary onPress={() => onOpen(created)} />
              </View>
            </>
          ) : (
            <>
              <Panel title={t('newTable.laMesa')}>
                <Field label={t('newTable.nombre')} value={name} onChangeText={setName} placeholder={tableNamePlaceholder(option)} maxLength={120} autoFocus />
              </Panel>
              <Panel title={t('newTable.queVanAJugar')}>
                {packs.length > 1 ? (
                  packs.map((p) => <WorldOption key={`${p.id}@${p.version}`} world={p} baseUrl={client.baseUrl} selected={packId === p.id} onSelect={() => setPackId(p.id)} />)
                ) : (
                  <Text style={styles.value}>{option ? packOptionLabel(option) : pack.manifest.name}</Text>
                )}
                {option?.tagline ? <Text style={styles.tagline}>{option.tagline}</Text> : packSummaryText(option) ? <Text style={styles.hint}>{packSummaryText(option)}</Text> : null}
              </Panel>
              {optionLangs.length > 1 ? (
                <Panel title={t('tableRules.idioma')}>
                  {optionLangs.map((l) => (
                    <RadioRow key={l} label={t(`common.languages.${l}`)} selected={tableLang === l} onSelect={() => setChosenLang(l)} />
                  ))}
                </Panel>
              ) : worldLanguageNote(option, language()) ? (
                <Text style={styles.hint}>{worldLanguageNote(option, language())}</Text>
              ) : null}
              <Panel title={t('ending.lengthTitle')}>
                {SESSION_LENGTHS.map((value) => (
                  <RadioRow key={value} label={sessionLengthLabel(value)} selected={sessionLength === value} onSelect={() => setChosenLength(value)} />
                ))}
                <Text style={styles.hint}>{t('ending.lengthHint')}</Text>
              </Panel>
              <Panel title={t('newTable.tuPersonaje')}>
                {bundled ? (
                  <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} allowNone />
                ) : remotePickables.length > 0 ? (
                  <CharacterPicker characters={remotePickables} value={characterId} onChange={setCharacterId} allowNone />
                ) : (
                  <Text style={styles.hint}>{t('newTable.cargandoLosPersonajesDel')}</Text>
                )}
              </Panel>
              {presets.length > 0 ? (
                <Panel title={t('newTable.directorDeJuego')}>
                  {presets.map((p) => {
                    const parts = presetOptionParts(p, ownKeys.includes(p.name))
                    return <RadioRow key={p.name} label={parts.title} sub={parts.detail} selected={preset === p.name} onSelect={() => setPreset(p.name)} />
                  })}
                  <Text style={styles.hint}>{t('newTable.sePuedeCambiarY')}</Text>
                </Panel>
              ) : null}
              <Panel title={t('newTable.premisa')}>
                <TextInput value={premise} onChangeText={setPremise} placeholder={premisePlaceholder(option)} placeholderTextColor={theme.colors.inkFaint} multiline maxLength={2000} style={styles.premise} />
                <Text style={styles.hint}>{t('newTable.opcionalElDirectorDe')}</Text>
              </Panel>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Button label={t('mobile.newTableScreen.crearMesa')} primary busy={busy} disabled={!cleanName} onPress={() => void submit()} />
                <Text style={styles.hint}>{t('mobile.newTableScreen.despuesPodrasProbarEl')}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 48 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 14 },
  hero: { paddingTop: 28, paddingBottom: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 34, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 18, color: theme.colors.ink, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  tagline: { fontFamily: theme.fonts.serifItalic, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
  value: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim },
  premise: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 21, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 110, textAlignVertical: 'top' },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  actions: { gap: 8, alignItems: 'flex-start', marginTop: 4 },
})

/** URL absoluta del retrato que sirve la API; el cliente trae la base (con `/movil`). */
function portraitUri(baseUrl: string, packId: string, portrait: string | null | undefined): string | null {
  const path = packPortraitUrl(packId, portrait)
  return path ? `${baseUrl}${path}` : null
}
