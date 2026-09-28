import { ApiError, type ApiClient, type AuthUser, type Friendship } from '@rpg-ngn/api-client'
import { acceptedFriends, friendshipWith, pendingReceived } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  client: ApiClient
  meId: string
  onUnauthorized: () => void
}

/**
 * Amigos fuera de la mesa, como al pie de "Tus mesas" en la web: las
 * solicitudes recibidas (una jugadora nueva no tiene mesa donde aceptarlas),
 * pedir amistad por correo y la lista de amigos. La API exige amistad
 * aceptada para invitar (docs/09).
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

  // Las solicitudes llegan solas, sin tirar para refrescar.
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 10_000)
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
      if (!user) setNotice({ ok: false, text: `No hay ninguna cuenta con el correo ${value}. Pídele que se registre desde la app o la web.` })
      else if (user.id === meId) setNotice({ ok: false, text: 'Ese correo es el tuyo.' })
      else setFound(user)
    })

  const request = (userId: string) =>
    act(async () => {
      await client.requestFriendship(userId)
      setNotice({ ok: true, text: 'Solicitud enviada; cuando la acepte podrán invitarse a sus mesas.' })
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
    <View style={styles.wrap}>
      <Text style={styles.hint}>Con tus amigos, invitarlos a una mesa es elegirlos de la lista. Para sentar a alguien sin ser amigos, basta el enlace de invitación de la mesa.</Text>

      {pending.map((f) => (
        <View key={f.id} style={styles.row}>
          <Text style={styles.rowText}>{`${f.user.name} (${f.user.email}) quiere ser tu amigo`}</Text>
          <Button label="Aceptar" small primary busy={busy} onPress={() => void accept(f.id)} />
        </View>
      ))}

      <View style={styles.row}>
        <TextInput value={email} onChangeText={setEmail} placeholder="correo del anfitrión o del jugador" placeholderTextColor={theme.colors.inkFaint} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} onSubmitEditing={() => void search()} returnKeyType="search" style={styles.input} />
        <Button label="Buscar" small busy={busy} disabled={!email.trim()} onPress={() => void search()} />
      </View>

      {found && state ? (
        <View style={styles.found}>
          <Text style={styles.foundName}>{found.name}</Text>
          <Text style={styles.foundEmail}>{found.email}</Text>
          {state.kind === 'none' ? <Button label="Enviar solicitud" primary busy={busy} onPress={() => void request(found.id)} /> : null}
          {state.kind === 'requested' ? <Text style={styles.state}>Solicitud enviada; falta que acepte.</Text> : null}
          {state.kind === 'received' ? <Button label="Aceptar su solicitud" primary busy={busy} onPress={() => void accept(state.friendship.id)} /> : null}
          {state.kind === 'accepted' ? <Text style={styles.state}>Ya son amigos.</Text> : null}
        </View>
      ) : null}

      {notice ? <Text style={[styles.notice, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}

      {friends.length > 0 ? (
        <View style={styles.list}>
          {friends.map((u) => (
            <View key={u.id} style={styles.friend}>
              <View style={styles.initial}>
                <Text style={styles.initialText}>{(u.name.trim()[0] ?? '?').toUpperCase()}</Text>
              </View>
              <Text style={styles.friendName} numberOfLines={1}>
                {u.name}
              </Text>
            </View>
          ))}
        </View>
      ) : friendships !== null && pending.length === 0 ? (
        <Text style={styles.hint}>Todavía no tienes amigos aquí.</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1, fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink },
  input: { flex: 1, fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  found: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, padding: 12, gap: 6 },
  foundName: { fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: theme.colors.ink },
  foundEmail: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  state: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
  list: { gap: 2, marginTop: 4 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  initial: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: theme.colors.gold, backgroundColor: theme.colors.panel3, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.ink },
  friendName: { flex: 1, fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink },
})
