'use client'

import { ApiError, type ApiClient, type TableSummary } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { CharacterPicker } from '../../../components/CharacterPicker'
import { InvitePanel } from '../../../components/InvitePanel'
import { RequireSession } from '../../../components/RequireSession'
import { PACK_OPTIONS } from '../../../lib/pack'
import { packCharacters } from '../../../lib/sheets'
import { usePack } from '../../../lib/usePack'
import type { StoredUser } from '../../../lib/storage'

export default function NewTablePage() {
  return <RequireSession>{({ client, user, unauthorized }) => <NewTable client={client} user={user} unauthorized={unauthorized} />}</RequireSession>
}

const PREMISE_PLACEHOLDER = 'Campaña, escena o tono; el DM la usa como punto de partida. Por ejemplo: "Valdoria, la posada al caer la noche. Esta noche esperan a Calder, que bajó a la mina y no ha vuelto."'

/**
 * Crear mesa en dos pasos: nombre, pack, personaje del anfitrion y premisa;
 * despues, invitar amigos (la mesa ya existe y se puede entrar sin invitar).
 */
function NewTable({ client, user, unauthorized }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void }) {
  const { pack, error: packError } = usePack()
  const option = PACK_OPTIONS[0]
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [premise, setPremise] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<TableSummary | null>(null)

  const characters = useMemo(() => (pack ? packCharacters(pack) : []), [pack])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const table = await client.createTable({ name: name.trim(), packId: option.id, packVersion: option.version, ruleset: option.ruleset, premise })
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
        <div className="topbar">
          <Link href="/mesas" className="btn ghost small">
            Mesas
          </Link>
          <h1>{created.name}</h1>
          <span className="who">mesa creada</span>
        </div>
        <div className="card stack">
          <p className="hint">La mesa ya existe. Invita a tus amigos ahora o después desde el mando del anfitrión; cuando quieras, entra y abre la sesión.</p>
          <InvitePanel client={client} table={created} meId={user.id} pack={pack} onChanged={reloadCreated} onUnauthorized={unauthorized} />
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
      <div className="topbar">
        <Link href="/mesas" className="btn ghost small">
          Mesas
        </Link>
        <h1>Nueva mesa</h1>
        <span className="who">{user.name}</span>
      </div>

      <form className="card stack" onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span>Nombre de la mesa</span>
          <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Los Nueve Viajeros, sábado" maxLength={120} required autoFocus />
        </label>

        <label className="field">
          <span>Pack y sistema</span>
          <select className="select" name="pack" value={option.id} onChange={() => undefined}>
            {PACK_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {pack?.manifest.name ?? p.id} ({p.label}, {p.ruleset})
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Tu personaje</span>
          {packError ? <div className="error">{packError}</div> : null}
          {pack ? <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} allowNone /> : <p className="hint">Cargando el pack...</p>}
        </div>

        <label className="field">
          <span>Premisa de la mesa (opcional)</span>
          <textarea className="textarea" name="premisa" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder={PREMISE_PLACEHOLDER} rows={4} maxLength={2000} />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <div className="row">
          <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            Crear mesa
          </button>
          <span className="hint">Después podrás invitar a tus amigos.</span>
        </div>
      </form>
    </main>
  )
}
