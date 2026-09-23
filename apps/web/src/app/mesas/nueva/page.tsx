'use client'

import { ApiError, withProvider, type ApiClient, type DmPreset, type PackCharacter, type PackOption, type TableSummary } from '@rpg-ngn/api-client'
import { packCharacters, packOptionLabel, packOriginText, packSummaryText, premisePlaceholder, presetOptionLabel, providerForNewTable, selectablePresets, tableNamePlaceholder } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CharacterPicker } from '../../../components/CharacterPicker'
import { InvitePanel } from '../../../components/InvitePanel'
import { RemoteCharacterPicker } from '../../../components/RemoteCharacterPicker'
import { RequireSession } from '../../../components/RequireSession'
import { UserBar } from '../../../components/UserBar'
import { PACK_ID, RULESET_ID } from '../../../lib/pack'
import { usePack } from '../../../lib/usePack'
import type { StoredUser } from '../../../lib/storage'

export default function NewTablePage() {
  return <RequireSession>{({ client, user, unauthorized }) => <NewTable client={client} user={user} unauthorized={unauthorized} />}</RequireSession>
}

/**
 * Crear mesa en dos pasos: nombre, pack, personaje del anfitrion y premisa;
 * despues, invitar amigos (la mesa ya existe y se puede entrar sin invitar).
 */
function NewTable({ client, user, unauthorized }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void }) {
  const { pack, error: packError } = usePack()
  const [packs, setPacks] = useState<PackOption[]>([])
  const [packId, setPackId] = useState('')
  const [remoteCharacters, setRemoteCharacters] = useState<PackCharacter[]>([])
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [premise, setPremise] = useState('')
  const [presets, setPresets] = useState<DmPreset[]>([])
  const [defaultPreset, setDefaultPreset] = useState('')
  const [preset, setPreset] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<TableSummary | null>(null)

  const characters = useMemo(() => (pack ? packCharacters(pack) : []), [pack])
  const option = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId])
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
        setPackId((actual) => actual || result.find((p) => p.id === PACK_ID)?.id || result[0]?.id || '')
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
    void client.listPackCharacters(option.id, option.version).then(
      (result) => {
        if (alive) setRemoteCharacters(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, option])

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!option) throw new Error('Elige un pack para la mesa.')
      const provider = providerForNewTable(preset, defaultPreset)
      // El ruleset lo declara el pack (`system`), no esta web. Antes se mandaba
      // siempre el del piloto y una mesa de intriga nacia con reglas de combate
      // (VAM del 19-09, motor A1). Sin version: el motor resuelve la unica que
      // tiene; el 422 que lo vigile en la API esta pendiente (R2).
      const table = await client.createTable({ name: name.trim(), packId: option.id, packVersion: option.version, ruleset: option.system || RULESET_ID, premise, ...(provider ? { settings: withProvider({}, provider) } : {}) })
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
      <main className="page">
        <UserBar title={created.name} user={user} />
        <div className="card stack">
          <p className="hint">La mesa ya existe. Invita a tus amigos ahora o después desde el mando del anfitrión; cuando quieras, entra y abre la sesión.</p>
          <InvitePanel client={client} table={created} meId={user.id} pack={created.packId === pack?.manifest.id ? pack : null} onChanged={reloadCreated} onUnauthorized={unauthorized} />
          <div className="row" style={{ marginTop: 8 }}>
            <Link href={`/mesas/${created.id}`} className="btn primary">
              Ir a la mesa
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <UserBar title="Nueva mesa" user={user} />

      <form className="card stack" onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span>Nombre de la mesa</span>
          <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder={tableNamePlaceholder(option)} maxLength={120} required autoFocus />
        </label>

        <label className="field">
          <span>Qué van a jugar</span>
          <select className="select" name="pack" value={packId} onChange={(e) => setPackId(e.target.value)} disabled={packs.length < 2}>
            {packs.length === 0 ? <option value="">Cargando…</option> : null}
            {packs.map((p) => (
              <option key={`${p.id}@${p.version}`} value={p.id}>
                {packOptionLabel(p)}
                {packOriginText(p) ? `, ${packOriginText(p)}` : ''}
              </option>
            ))}
          </select>
          {packSummaryText(option) ? <span className="hint">{packSummaryText(option)}</span> : null}
        </label>

        <div className="field">
          <span>Tu personaje</span>
          {packError ? <div className="error">{packError}</div> : null}
          {!bundled && option ? (
            remoteCharacters.length > 0 ? (
              <RemoteCharacterPicker packId={option.id} characters={remoteCharacters} value={characterId} onChange={setCharacterId} allowNone />
            ) : (
              <p className="hint">Cargando los personajes del pack...</p>
            )
          ) : pack ? (
            <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} allowNone />
          ) : (
            <p className="hint">Cargando el pack...</p>
          )}
        </div>

        {presets.length > 0 ? (
          <label className="field">
            <span>Director de juego</span>
            <select className="select" name="dm" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>
                  {presetOptionLabel(p)}
                </option>
              ))}
            </select>
            <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
              Se puede cambiar y probar después desde el mando del anfitrión, pestaña DM.
            </span>
          </label>
        ) : null}

        <label className="field">
          <span>Premisa de la mesa (opcional)</span>
          <textarea className="textarea" name="premisa" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder={premisePlaceholder(option)} rows={4} maxLength={2000} />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <div className="row">
          <button type="submit" className="btn primary" disabled={busy || !name.trim() || !option}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            Crear mesa
          </button>
          <span className="hint">Después podrás invitar a tus amigos.</span>
        </div>
      </form>
    </main>
  )
}
