'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type AuthUser, type Friendship } from '@rpg-ngn/api-client'
import { acceptedFriends, friendshipWith, pendingReceived } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  client: ApiClient
  meId: string
  onUnauthorized: (notice?: string) => void
}

/**
 * Amigos fuera de la mesa: las solicitudes recibidas (una jugadora nueva
 * no tiene mesa donde aceptarlas), pedir amistad por correo y la lista de
 * amigos. La API exige amistad aceptada para invitar (docs/09).
 */
export function FriendsPanel({ client, meId, onUnauthorized }: Props) {
  const [friendships, setFriendships] = useState<Friendship[] | null>(null)
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<AuthUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setFriendships(await client.listFriendships())
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    }
  }, [client, onUnauthorized])

  // Las solicitudes llegan solas, sin pulsar "Actualizar".
  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 10_000)
    return () => clearInterval(timer)
  }, [load])

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
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setBusy(false)
    }
  }

  const search = () =>
    act(async () => {
      setFound(null)
      const value = email.trim().toLowerCase()
      if (!value) return
      const user = await client.lookupUser(value)
      if (!user) setNotice({ ok: false, text: t('play.noAccount', { email: value }) })
      else if (user.id === meId) setNotice({ ok: false, text: t('play.ownEmail') })
      else setFound(user)
    })

  const request = (userId: string) =>
    act(async () => {
      await client.requestFriendship(userId)
      setNotice({ ok: true, text: t('play.friendRequestSent') })
      setFound(null)
      setEmail('')
      await load()
    })

  const accept = (friendshipId: string) =>
    act(async () => {
      await client.acceptFriendship(friendshipId)
      await load()
    })

  const list = friendships ?? []
  const pending = pendingReceived(list, meId)
  const friends = acceptedFriends(list, meId)
  const state = found ? friendshipWith(list, meId, found.id) : null

  return (
    <section className="stack friends" aria-label={t('friendsPanel.amigos')}>
      <p className="hint" style={{ margin: 0 }}>
        {t('friendsPanel.conTusAmigosInvitarlos')}
      </p>

      {pending.length > 0 ? (
        <div className="stack">
          {pending.map((f) => (
            <div key={f.id} className="row">
              <span>
                <b>{f.user.name}</b> <span className="muted">({f.user.email})</span> {t('friendsPanel.quiereSerTuAmigo')}
              </span>
              <button type="button" className="btn small primary" onClick={() => void accept(f.id)} disabled={busy}>
                {t('friendsPanel.aceptar')}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input className="input" type="email" name="correo-amigo" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('friendsPanel.correoDelAnfitrionO')} style={{ flex: 1, minWidth: 200 }} disabled={busy} />
        <button type="submit" className="btn small" disabled={busy || !email.trim()}>
          {t('friendsPanel.buscar')}
        </button>
      </form>

      {found && state ? (
        <div className="row">
          <span>
            <b>{found.name}</b> <span className="muted">({found.email})</span>
          </span>
          {state.kind === 'none' ? (
            <button type="button" className="btn small primary" onClick={() => void request(found.id)} disabled={busy}>
              {t('friendsPanel.enviarSolicitud')}
            </button>
          ) : null}
          {state.kind === 'requested' ? <span className="chip">{t('friendsPanel.solicitudEnviadaFaltaQue')}</span> : null}
          {state.kind === 'received' ? (
            <button type="button" className="btn small primary" onClick={() => void accept(state.friendship.id)} disabled={busy}>
              {t('friendsPanel.aceptarSuSolicitud')}
            </button>
          ) : null}
          {state.kind === 'accepted' ? <span className="chip done">{t('friendsPanel.yaSonAmigos')}</span> : null}
        </div>
      ) : null}

      {notice ? <div className={notice.ok ? 'ok' : 'error'}>{notice.text}</div> : null}

      {friends.length > 0 ? (
        <div className="row">
          <span className="hint">{t('friendsPanel.tusAmigos')}</span>
          {friends.map((u) => (
            <span key={u.id} className="chip done">
              {u.name}
            </span>
          ))}
        </div>
      ) : friendships !== null && pending.length === 0 ? (
        <p className="hint" style={{ margin: 0 }}>
          {t('friendsPanel.todaviaNoTienesAmigos')}
        </p>
      ) : null}
    </section>
  )
}
