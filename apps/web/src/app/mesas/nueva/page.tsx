'use client'

import { language, t, type Language } from '@rpg-ngn/i18n'
import { ApiError, withProvider, type ApiClient, type GmPreset, type PackCharacter, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import { newTableLanguage, worldLanguageNote, worldLanguages, packCharacters, packSummaryText, premisePlaceholder, presetOptionParts, providerForNewTable, selectablePresets, tableNamePlaceholder } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CharacterPicker } from '../../../components/CharacterPicker'
import { InvitePanel } from '../../../components/InvitePanel'
import { Panel } from '../../../components/Panel'
import { RemoteCharacterPicker } from '../../../components/RemoteCharacterPicker'
import { RequireSession } from '../../../components/RequireSession'
import { AppShell } from '../../../components/shell/AppShell'
import { WorldOption } from '../../../components/WorldOption'
import { PACK_ID, RULESET_ID } from '../../../lib/pack'
import { usePack } from '../../../lib/usePack'
import type { StoredUser } from '../../../lib/storage'

export default function NewTablePage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <NewTable client={client} user={user} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

/**
 * Crear mesa en dos pasos: nombre, pack, personaje del anfitrion y premisa;
 * despues, invitar amigos (la mesa ya existe y se puede entrar sin invitar).
 */
function NewTable({ client, user, unauthorized }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void }) {
  const [packs, setPacks] = useState<PackOption[]>([])
  const [packId, setPackId] = useState('')
  const [remoteCharacters, setRemoteCharacters] = useState<PackCharacter[]>([])
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [premise, setPremise] = useState('')
  const [presets, setPresets] = useState<GmPreset[]>([])
  const [ownKeys, setOwnKeys] = useState<string[]>([])
  const [defaultPreset, setDefaultPreset] = useState('')
  const [preset, setPreset] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<TableSummary | null>(null)

  const option = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId])
  // Idioma de la mesa (i18n): el de la interfaz si el mundo lo trae; si no, el
  // del mundo. Con mas de uno, lo elige quien crea la mesa.
  const [chosenLang, setChosenLang] = useState<Language | null>(null)
  const optionLangs = worldLanguages(option)
  const tableLang = chosenLang && optionLangs.includes(chosenLang) ? chosenLang : newTableLanguage(option, language())
  const { pack, error: packError } = usePack(tableLang)
  const characters = useMemo(() => (pack ? packCharacters(pack) : []), [pack])
  // La web lleva el pack piloto dentro para pintar retratos y fichas sin pedir
  // nada. Si el servidor ofrece otro, se puede crear la mesa igual, pero esta
  // pantalla no tiene sus personajes.
  const bundled = option?.id === PACK_ID

  // Los packs que el servidor puede jugar (antes era una lista escrita a mano).
  useEffect(() => {
    let alive = true
    void client.listPacks().then(
      (result) => {
        if (!alive) return
        setPacks(result)
        // "Jugar" desde Explorar mundos llega con ?mundo=<id>: ese va elegido.
        const pedido = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mundo') : null
        setPackId((actual) => actual || result.find((p) => p.id === pedido)?.id || result.find((p) => p.id === PACK_ID)?.id || result[0]?.id || '')
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client])

  // De un pack que la web no lleva dentro, los personajes los da el servidor.
  useEffect(() => {
    if (!option || option.id === PACK_ID) {
      setRemoteCharacters([])
      return
    }
    let alive = true
    void client.listPackCharacters(option.id, option.version, tableLang).then(
      (result) => {
        if (alive) setRemoteCharacters(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, option, tableLang])

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!option) throw new Error(t('play.pickPack'))
      const provider = providerForNewTable(preset, defaultPreset)
      // El ruleset lo declara el pack (`system`), no esta web. Antes se mandaba
      // siempre el del piloto y una mesa de intriga nacia con reglas de combate
      // (VAM del 19-09, motor A1). Sin version: el motor resuelve la unica que
      // tiene; la API rechaza con 422 un ruleset distinto al del pack (R2).
      const table = await client.createTable({ name: name.trim(), packId: option.id, packVersion: option.version, ruleset: option.system || RULESET_ID, premise, settings: { ...(provider ? withProvider({}, provider) : {}), language: tableLang } })
      if (characterId) await client.setOwnerCharacter(table.id, user.id, characterId)
      setCreated(await client.table(table.id))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const reloadCreated = () => {
    if (created) void client.table(created.id).then(setCreated, () => undefined)
  }

  if (created) {
    return (
      <div className="page en-shell">
        <h1 className="pagina-titulo">{created.name}</h1>
        <div className="hojas">
          <p className="hint">{t('newTable.laMesaYaExiste')}</p>
          <Panel labelledBy={t('newTable.invitar')}>
            <InvitePanel client={client} table={created} meId={user.id} pack={created.packId === pack?.manifest.id ? pack : null} onChanged={reloadCreated} onUnauthorized={unauthorized} />
          </Panel>
          <div className="row" style={{ marginTop: 8 }}>
            <Link href={`/mesas/${created.id}`} className="btn primary">
              {t('newTable.irALaMesa')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page en-shell">
      <h1 className="pagina-titulo">{t('newTable.nuevaMesa')}</h1>

      <form className="hojas nueva-mesa" onSubmit={(e) => void submit(e)}>
        <Panel title={t('newTable.laMesa')}>
          <label className="field">
            <span>{t('newTable.nombre')}</span>
            <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder={tableNamePlaceholder(option)} maxLength={120} required autoFocus />
          </label>
        </Panel>

        <Panel title={t('newTable.queVanAJugar')}>
          <div className="mundos-opciones" role="radiogroup" aria-label={t('newTable.queVanAJugar')}>
            {packs.length === 0 ? <p className="hint">{t('newTable.cargando')}</p> : null}
            {packs.map((p) => (
              <WorldOption key={`${p.id}@${p.version}`} world={p} selected={packId === p.id} onSelect={() => setPackId(p.id)} />
            ))}
          </div>
          {option?.tagline ? <p className="premise">{option.tagline}</p> : packSummaryText(option) ? <span className="hint">{packSummaryText(option)}</span> : null}
          {optionLangs.length > 1 ? (
            <div className="field">
              <span>{t('tableRules.idioma')}</span>
              <div className="segmented" role="group" aria-label={t('tableRules.idioma')}>
                {optionLangs.map((l) => (
                  <button key={l} type="button" lang={l} aria-pressed={tableLang === l} onClick={() => setChosenLang(l)}>
                    {t(`common.languages.${l}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : worldLanguageNote(option, language()) ? (
            <span className="hint">{worldLanguageNote(option, language())}</span>
          ) : null}
        </Panel>

        <Panel title={t('newTable.tuPersonaje')}>
          {packError ? <div className="error">{packError}</div> : null}
          {!bundled && option ? (
            remoteCharacters.length > 0 ? (
              <RemoteCharacterPicker packId={option.id} characters={remoteCharacters} value={characterId} onChange={setCharacterId} allowNone />
            ) : (
              <p className="hint">{t('newTable.cargandoLosPersonajesDel')}</p>
            )
          ) : pack ? (
            <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} allowNone />
          ) : (
            <p className="hint">{t('newTable.cargandoElPack')}</p>
          )}
        </Panel>

        {presets.length > 0 ? (
          <Panel title={t('newTable.directorDeJuego')}>
            <div className="mundos-opciones" role="radiogroup" aria-label={t('newTable.directorDeJuego')}>
              {presets.map((p) => {
                const parts = presetOptionParts(p, ownKeys.includes(p.name))
                return (
                  <button key={p.name} type="button" role="radio" aria-checked={preset === p.name} className="mundo-opcion opcion-fila" onClick={() => setPreset(p.name)}>
                    <span className="texto">
                      <span className="titulo">{parts.title}</span>
                      {parts.detail ? <span className="sub">{parts.detail}</span> : null}
                    </span>
                    <span className="punto" aria-hidden />
                  </button>
                )
              })}
            </div>
            <span className="hint">{t('newTable.sePuedeCambiarY')}</span>
          </Panel>
        ) : null}

        <Panel title={t('newTable.premisa')}>
          <textarea className="textarea" name="premisa" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder={premisePlaceholder(option)} rows={4} maxLength={2000} aria-label={t('newTable.premisaDeLaMesa')} />
          <span className="hint">{t('newTable.opcionalElDirectorDe')}</span>
        </Panel>

        {error ? <div className="error">{error}</div> : null}

        <div className="row">
          <button type="submit" className="btn primary" disabled={busy || !name.trim() || !option}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            {t('tablesPage.crearMesa')}
          </button>
          <span className="hint">{t('newTable.despuesPodrasInvitarA')}</span>
        </div>
      </form>
    </div>
  )
}
