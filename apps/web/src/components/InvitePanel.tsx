'use client'

import { ApiError, type ApiClient, type AuthUser, type Friendship, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { characterName } from '../lib/pack'
import { acceptedFriends, freeCharacters, friendshipWith, memberLine, pendingReceived } from '../lib/tableSetup'
import { CharacterPicker } from './CharacterPicker'
import { Portrait } from './Portrait'

interface Props {
  client: ApiClient
  table: TableSummary
  meId: string
  pack: LoadedPack | null
  /** La mesa cambio (invitacion nueva): que el padre la recargue. */
  onChanged: () => void
  onUnauthorized: () => void
}

/**
 * Invitar amigos por correo. La API exige amistad aceptada antes de invitar
 * (docs/09, "Auth: la mesa es un contrato"), asi que aqui se ve en que punto
 * esta cada amistad, se aceptan las pendientes propias y se invita con
 * personaje cuando ya son amigos.
 */
export function InvitePanel({ client, table, meId, pack, onChanged, onUnauthorized }: Props) {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<AuthUser | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchDenied, setSearchDenied] = useState(false)

  const nameOf = useCallback((id: string) => characterName(pack, id) ?? id, [pack])

  const loadFriendships = useCallback(async () => {
    try {
      setFriendships(await client.listFriendships())
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setNotice(caught instanceof Error ? caught.message : String(caught))
    }
  }, [client, onUnauthorized])

  useEffect(() => {
    void loadFriendships()
  }, [loadFriendships])

  const act = async (action: () => Promise<void>) => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        onUnauthorized()
        return
      }
      setNotice(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const search = () =>
    act(async () => {
      setFound(null)
      const value = email.trim().toLowerCase()
      if (!value) return
      // Primero entre los amigos ya conocidos (no necesita permiso de busqueda).
      const known = friendships.map((f) => (f.user.id === meId ? f.friend : f.user)).find((u) => u.email.toLowerCase() === value)
      if (known) {
        setFound(known)
        return
      }
      try {
        // Lookup por correo exacto, abierto a cualquier cuenta (entrega 5b).
        const user = await client.lookupUser(value)
        if (!user) setNotice(`No hay ninguna cuenta con el correo ${value}. Pídele que se registre en esta misma web.`)
        else if (user.id === meId) setNotice('Ese correo es el tuyo.')
        else setFound(user)
      } catch (caught) {
        if (caught instanceof ApiError && caught.isForbidden) {
          setSearchDenied(true)
          setNotice('Tu cuenta no puede buscar usuarios por correo. Pídele al otro que te mande la solicitud de amistad y acéptala aquí.')
          return
        }
        throw caught
      }
    })

  const state = found ? friendshipWith(friendships, meId, found.id) : null
  const alreadyMember = found ? table.members.some((m) => m.userId === found.id) : false
  const free = useMemo(() => (pack ? freeCharacters(pack, table.members) : []), [pack, table.members])
  const taken = useMemo(() => new Map(table.members.filter((m) => m.characterId).map((m) => [m.characterId as string, m.userName ?? 'alguien'])), [table.members])
  const pending = pendingReceived(friendships, meId)
  const friends = acceptedFriends(friendships, meId).filter((u) => !table.members.some((m) => m.userId === u.id))

  const request = (userId: string) => act(async () => (await client.requestFriendship(userId), loadFriendships()))
  const accept = (friendshipId: string) => act(async () => (await client.acceptFriendship(friendshipId), loadFriendships()))
  const invite = () =>
    act(async () => {
      if (!found) return
      await client.invite(table.id, found.id, characterId)
      setFound(null)
      setEmail('')
      setCharacterId(null)
      onChanged()
    })

  return (
    <div className="invite stack">
      <div>
        <div className="label" style={{ marginTop: 0 }}>
          En la mesa
        </div>
        <div className="members">
          {table.members.map((member) => (
            <div key={member.id} className="member">
              <Portrait path={member.characterId ? (pack?.characters.get(member.characterId)?.portrait ?? null) : null} name={member.characterId ? nameOf(member.characterId) : (member.userName ?? '?')} />
              <span>{memberLine(member, nameOf)}</span>
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 ? (
        <div>
          <div className="label">Solicitudes de amistad pendientes</div>
          <div className="stack">
            {pending.map((f) => (
              <div key={f.id} className="row">
                <span>
                  {f.user.name} <span className="muted">({f.user.email})</span>
                </span>
                <button type="button" className="btn small" onClick={() => void accept(f.id)} disabled={busy}>
                  Aceptar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="label">Invitar por correo</div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void search()
          }}
        >
          <input className="input" type="email" name="correo" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={{ flex: 1, minWidth: 200 }} disabled={busy} />
          <button type="submit" className="btn" disabled={busy || !email.trim()}>
            Buscar
          </button>
        </form>
        {friends.length > 0 ? (
          <div className="row" style={{ marginTop: 8 }}>
            <span className="hint">Amigos:</span>
            {friends.map((u) => (
              <button
                key={u.id}
                type="button"
                className="btn ghost small"
                onClick={() => {
                  setEmail(u.email)
                  setFound(u)
                  setNotice(null)
                }}
              >
                {u.name}
              </button>
            ))}
          </div>
        ) : null}
        {searchDenied && friends.length === 0 && pending.length === 0 ? <p className="hint">Cuando alguien te mande una solicitud de amistad aparece aquí para aceptarla.</p> : null}
      </div>

      {notice ? <div className="error">{notice}</div> : null}

      {found && state ? (
        <div className="found">
          <div className="who">
            {found.name}
            <small>{found.email}</small>
          </div>
          {alreadyMember ? <span className="chip done">ya está en la mesa</span> : null}
          {!alreadyMember && state.kind === 'none' ? (
            <button type="button" className="btn primary" onClick={() => void request(found.id)} disabled={busy}>
              Enviar solicitud de amistad
            </button>
          ) : null}
          {!alreadyMember && state.kind === 'requested' ? <span className="chip">solicitud enviada, falta que acepte</span> : null}
          {!alreadyMember && state.kind === 'received' ? (
            <button type="button" className="btn primary" onClick={() => void accept(state.friendship.id)} disabled={busy}>
              Aceptar su solicitud
            </button>
          ) : null}
          {!alreadyMember && state.kind === 'accepted' ? <span className="chip done">amigos</span> : null}
        </div>
      ) : null}

      {found && state?.kind === 'accepted' && !alreadyMember ? (
        <div className="stack">
          <div className="label">Personaje para {found.name}</div>
          {pack ? <CharacterPicker characters={free} taken={taken} value={characterId} onChange={setCharacterId} allowNone /> : <p className="hint">Cargando el pack...</p>}
          <div className="row">
            <button type="button" className="btn primary" onClick={() => void invite()} disabled={busy}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Invitar a la mesa
            </button>
            <span className="hint">{characterId ? `Jugará a ${nameOf(characterId)}.` : 'Sin personaje: podrá mirar pero no responder.'}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
