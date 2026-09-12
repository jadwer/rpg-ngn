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

  useEffect(() => {
    void load()
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
    <View style={styles.card}>
      <Text style={styles.label}>Amigos</Text>
      <Text style={styles.hint}>Para sentarte en una mesa, el anfitrión y tú tienen que ser amigos. Busca su correo y mándale la solicitud, o acepta la que te mandó.</Text>

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

      {friends.length > 0 ? <Text style={styles.friends}>{`Tus amigos: ${friends.map((u) => u.name).join(', ')}`}</Text> : friendships !== null && pending.length === 0 ? <Text style={styles.hint}>Todavía no tienes amigos aquí.</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 14, gap: 8 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  input: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  found: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, gap: 6 },
  foundName: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold },
  foundEmail: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  state: { fontFamily: theme.fonts.serifItalic, fontSize: 14, color: theme.colors.ink },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#cfe3b8', borderColor: '#5d803e', backgroundColor: 'rgba(93, 128, 62, 0.22)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
  friends: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
})
