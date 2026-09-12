import { memberOf, type TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Portrait } from '../../components/Portrait'
import type { StoredUser } from '../../online/storage'
import { seatLabel } from '../../online/tableSetup'
import { theme } from '../../theme'

interface Props {
  user: StoredUser
  tables: TableSummary[] | null
  loading: boolean
  error: string | null
  pack: LoadedPack | null
  onOpen: (table: TableSummary) => void
  onCreate: () => void
  onRefresh: () => void
  onLogout: () => void
}

/** Las mesas donde el usuario es miembro; la API ya las acota. El asiento `dm` se muestra como anfitrion. */
export function TablesScreen({ user, tables, loading, error, pack, onOpen, onCreate, onRefresh, onLogout }: Props) {
  const nameOf = (id: string) => pack?.characters.get(id)?.name ?? id
  const sorted = tables ? [...tables].sort((a, b) => Number(b.id) - Number(a.id)) : null

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onLogout} hitSlop={10}>
          <Text style={styles.link}>Salir</Text>
        </Pressable>
        <Text style={styles.title}>Tus mesas</Text>
        <Text style={styles.who} numberOfLines={1}>
          {user.name}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading && tables !== null} onRefresh={onRefresh} tintColor={theme.colors.gold} colors={[theme.colors.gold]} progressBackgroundColor={theme.colors.panel} />}>
        <View style={styles.actions}>
          <Button label="Crear mesa" primary onPress={onCreate} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {tables === null && loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.gold} />
            <Text style={styles.hint}>Buscando tus mesas...</Text>
          </View>
        ) : null}
        {tables?.length === 0 ? <Text style={styles.hint}>No estás en ninguna mesa todavía. Crea una o pide al anfitrión que te invite.</Text> : null}
        {sorted?.map((table) => {
          const me = memberOf(table, user.id)
          const others = table.members.filter((m) => m.id !== me?.id)
          return (
            <Pressable key={table.id} onPress={() => onOpen(table)} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{table.name}</Text>
                <Text style={styles.badge}>{table.status === 'active' ? 'activa' : table.status}</Text>
              </View>
              <Text style={styles.role}>{seatLabel(me, nameOf)}</Text>
              <Text style={styles.meta}>{`${table.packId}@${table.packVersion} · ${table.ruleset}${table.premise ? ' · con premisa' : ''}`}</Text>
              {others.length > 0 ? (
                <View style={styles.party}>
                  {others.map((m) => (
                    <View key={m.id} style={styles.member}>
                      <Portrait path={m.characterId ? (pack?.characters.get(m.characterId)?.portrait ?? null) : null} name={m.userName ?? '?'} size={24} />
                      <Text style={styles.memberText}>{`${m.userName ?? '?'}${m.role === 'dm' ? ' (anfitrión)' : ''}${m.characterId ? `: ${nameOf(m.characterId)}` : ''}`}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {!table.campaignId ? <Text style={styles.warn}>Esta mesa no tiene campaña todavía.</Text> : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright, minWidth: 64 },
  title: { flex: 1, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center', letterSpacing: 1 },
  who: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, minWidth: 64, textAlign: 'right' },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
  center: { alignItems: 'center', padding: 24, gap: 10 },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 14, color: theme.colors.inkDim, textAlign: 'center' },
  error: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.danger, textAlign: 'center' },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.goldDim, borderRadius: theme.radius, padding: 14, gap: 4 },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold },
  badge: { fontFamily: theme.fonts.serif, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  role: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  meta: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  party: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberText: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  warn: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
})
