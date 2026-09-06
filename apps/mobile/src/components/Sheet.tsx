import { abilityUsage, humanizeId, type SheetView } from '@rpg-ngn/ui-logic'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme, VEIL_NOTE } from '../theme'
import { Portrait } from './Portrait'

/** Ficha completa a partir del modelo de vista de ui-logic, ya velado. */
export function Sheet({ sheet }: { sheet: SheetView }) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.hero}>
        <Portrait path={sheet.portrait} name={sheet.name} size={92} />
        <View style={styles.who}>
          <Text style={styles.name}>{sheet.name}</Text>
          <Text style={styles.sub}>{`${sheet.race} · ${sheet.class} · ${sheet.age}`}</Text>
        </View>
      </View>

      {sheet.quote ? <Text style={styles.quote}>{`"${sheet.quote}"`}</Text> : null}
      {sheet.veiled ? <Text style={styles.veil}>{VEIL_NOTE}</Text> : null}

      <View style={styles.vitals}>
        <Vital value={`${sheet.hp.current}/${sheet.hp.max}`} label="Vida" />
        <Vital value={String(sheet.ac)} label="Armadura" />
        <Vital value={sheet.fortune ? String(sheet.fortune.result) : '?'} label={sheet.fortune ? sheet.fortune.tier : 'Fortuna'} />
      </View>

      <View style={styles.stats}>
        {sheet.stats.map((stat) => (
          <View key={stat.key} style={styles.stat}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statMod}>{stat.modifier}</Text>
          </View>
        ))}
      </View>

      {sheet.conditions.length > 0 ? (
        <>
          <Label>Estado</Label>
          <Chips items={sheet.conditions} accent />
        </>
      ) : null}

      <Label>Con qué peleas</Label>
      <View style={styles.kit}>
        {sheet.attacks.map((attack) => (
          <View key={attack.id} style={styles.item}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName}>{attack.name}</Text>
              <Text style={styles.damage}>{attack.damage}</Text>
              <Text style={styles.meta}>{[attack.damageType, attack.range].join(' · ')}</Text>
            </View>
          </View>
        ))}
      </View>

      {sheet.abilities ? (
        <>
          <Label>Qué sabes hacer</Label>
          <View style={styles.kit}>
            {sheet.abilities.map((ability) => (
              <View key={ability.id} style={styles.item}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemName}>{ability.name}</Text>
                  {ability.damage ? <Text style={styles.damage}>{ability.damage}</Text> : null}
                  <Text style={styles.meta}>{[ability.type, ability.damageType, ability.range, abilityUsage(ability)].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text style={styles.effect}>{ability.effect}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Label>Eres bueno en</Label>
      <Chips items={sheet.skills} />

      <Label>Rol en el grupo</Label>
      <Text style={styles.roles}>{sheet.roles.join(' / ')}</Text>

      {sheet.inventory.length > 0 || sheet.memoriesRecovered > 0 ? (
        <>
          <Label>Lo que llevas</Label>
          {sheet.inventory.map((item) => (
            <Text key={item.id} style={styles.inventory}>
              {humanizeId(item.id)}
              {item.note ? <Text style={styles.meta}>{`  (${item.note})`}</Text> : null}
            </Text>
          ))}
          {sheet.memoriesRecovered > 0 ? <Text style={styles.inventory}>{`Recuerdos recuperados: ${sheet.memoriesRecovered}`}</Text> : null}
        </>
      ) : null}

      {sheet.bio ? (
        <>
          <Label>Quién eres</Label>
          <Text style={styles.body}>{sheet.bio}</Text>
        </>
      ) : null}
      {sheet.goal ? (
        <>
          <Label>Tu objetivo</Label>
          <Text style={styles.body}>{sheet.goal}</Text>
        </>
      ) : null}
    </ScrollView>
  )
}

function Vital({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.vital}>
      <Text style={styles.vitalValue}>{value}</Text>
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  )
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>
}

function Chips({ items, accent = false }: { items: string[]; accent?: boolean }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <Text key={item} style={[styles.chip, accent && styles.chipAccent]}>
          {item}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, gap: 4 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  who: { flex: 1 },
  name: { fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.gold, letterSpacing: 1 },
  sub: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.inkDim, marginTop: 2 },
  quote: { fontFamily: theme.fonts.serif, fontSize: 16, fontStyle: 'italic', color: theme.colors.ink, borderLeftWidth: 3, borderLeftColor: theme.colors.accent, paddingLeft: 10, marginVertical: 10 },
  veil: { fontFamily: theme.fonts.serif, fontSize: 14, fontStyle: 'italic', color: theme.colors.inkDim, backgroundColor: theme.colors.panel2, borderRadius: 8, padding: 10, marginVertical: 8 },
  vitals: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  vital: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingVertical: 8 },
  vitalValue: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.ink },
  vitalLabel: { fontFamily: theme.fonts.serif, fontSize: 11, color: theme.colors.inkDim, textTransform: 'uppercase', letterSpacing: 1 },
  stats: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingVertical: 6 },
  statLabel: { fontFamily: theme.fonts.serif, fontSize: 10, color: theme.colors.inkDim, letterSpacing: 0.5 },
  statValue: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.ink, fontWeight: '600' },
  statMod: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.gold },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, marginTop: 14, marginBottom: 4 },
  kit: { gap: 6 },
  item: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 9, gap: 4 },
  itemTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  itemName: { fontFamily: theme.fonts.serif, fontSize: 16, fontWeight: '600', color: theme.colors.ink },
  damage: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.accent, borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 4, paddingHorizontal: 5 },
  meta: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim },
  effect: { fontFamily: theme.fonts.serif, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink, backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3 },
  chipAccent: { borderColor: theme.colors.accent, color: theme.colors.accent },
  roles: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.inkDim },
  inventory: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, marginBottom: 2 },
  body: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 23, color: theme.colors.ink },
})
