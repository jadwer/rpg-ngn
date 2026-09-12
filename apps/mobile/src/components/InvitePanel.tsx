import { ApiError, type ApiClient, type AuthUser, type Friendship, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { acceptedFriends, freeCharacters, friendshipWith, knownUsers, memberLine, pendingReceived, takenCharacters } from '../online/tableSetup'
import { theme } from '../theme'
import { Button } from './Button'
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
 * Invitar amigos por correo, como en la web. La API exige amistad aceptada
 * antes de invitar (docs/09, "Auth: la mesa es un contrato"), asi que aqui
 * se ve en que punto esta cada amistad, se aceptan las pendientes propias y
 * se invita con personaje cuando ya son amigos.
 */
export function InvitePanel({ client, table, meId, pack, onChanged, onUnauthorized }: Props) {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<AuthUser | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchDenied, setSearchDenied] = useState(false)

  const nameOf = useCallback((id: string) => pack?.characters.get(id)?.name ?? id, [pack])

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
      // Primero entre los ya conocidos (no necesita permiso de busqueda).
      const known = knownUsers(friendships, meId).find((u) => u.email.toLowerCase() === value)
      if (known) {
        setFound(known)
        return
      }
      try {
        const user = await client.findUserByEmail(value)
        if (!user) setNotice(`No hay ninguna cuenta con el correo ${value}.`)
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
  const taken = useMemo(() => takenCharacters(table.members), [table.members])
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
    <View style={styles.wrap}>
      <Text style={styles.label}>En la mesa</Text>
      {table.members.map((member) => (
        <View key={member.id} style={styles.member}>
          <Portrait path={member.characterId ? (pack?.characters.get(member.characterId)?.portrait ?? null) : null} name={member.characterId ? nameOf(member.characterId) : (member.userName ?? '?')} size={32} />
          <Text style={styles.memberText}>{memberLine(member, nameOf)}</Text>
        </View>
      ))}

      {pending.length > 0 ? (
        <>
          <Text style={styles.label}>Solicitudes de amistad pendientes</Text>
          {pending.map((f) => (
            <View key={f.id} style={styles.row}>
              <Text style={styles.rowText}>{`${f.user.name} (${f.user.email})`}</Text>
              <Button label="Aceptar" small busy={busy} onPress={() => void accept(f.id)} />
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.label}>Invitar por correo</Text>
      <View style={styles.row}>
        <TextInput value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" placeholderTextColor={theme.colors.inkFaint} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} onSubmitEditing={() => void search()} returnKeyType="search" style={styles.input} />
        <Button label="Buscar" small busy={busy} disabled={!email.trim()} onPress={() => void search()} />
      </View>
      {friends.length > 0 ? (
        <View style={styles.chips}>
          <Text style={styles.hint}>Amigos:</Text>
          {friends.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => {
                setEmail(u.email)
                setFound(u)
                setNotice(null)
              }}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{u.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {searchDenied && friends.length === 0 && pending.length === 0 ? <Text style={styles.hint}>Cuando alguien te mande una solicitud de amistad aparece aquí para aceptarla.</Text> : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {found && state ? (
        <View style={styles.found}>
          <Text style={styles.foundName}>{found.name}</Text>
          <Text style={styles.foundEmail}>{found.email}</Text>
          {alreadyMember ? <Text style={styles.state}>Ya está en la mesa.</Text> : null}
          {!alreadyMember && state.kind === 'none' ? <Button label="Enviar solicitud de amistad" primary busy={busy} onPress={() => void request(found.id)} /> : null}
          {!alreadyMember && state.kind === 'requested' ? <Text style={styles.state}>Solicitud enviada; falta que acepte.</Text> : null}
          {!alreadyMember && state.kind === 'received' ? <Button label="Aceptar su solicitud" primary busy={busy} onPress={() => void accept(state.friendship.id)} /> : null}
          {!alreadyMember && state.kind === 'accepted' ? <Text style={styles.state}>Son amigos: elige su personaje.</Text> : null}
        </View>
      ) : null}

      {found && state?.kind === 'accepted' && !alreadyMember ? (
        <>
          <Text style={styles.label}>{`Personaje para ${found.name}`}</Text>
          {pack ? <CharacterPicker characters={free} taken={taken} value={characterId} onChange={setCharacterId} allowNone /> : <Text style={styles.hint}>Sin pack empaquetado para esta mesa.</Text>}
          <Text style={styles.hint}>{characterId ? `Jugará a ${nameOf(characterId)}.` : 'Sin personaje: podrá mirar pero no responder.'}</Text>
          <Button label="Invitar a la mesa" primary busy={busy} onPress={() => void invite()} />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, marginTop: 10 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  input: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.gold },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
  found: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 12, gap: 6 },
  foundName: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold },
  foundEmail: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  state: { fontFamily: theme.fonts.serifItalic, fontSize: 14, color: theme.colors.ink },
})
