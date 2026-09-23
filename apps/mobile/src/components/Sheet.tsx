import { abilityUsage, humanizeId, type SheetView } from '@rpg-ngn/ui-logic'
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme, VEIL_NOTE } from '../theme'
import { Icon } from './Icon'
import { Portrait } from './Portrait'

type Tab = 'inventory' | 'skills' | 'traits'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'inventory', label: 'Inventario' },
  { id: 'skills', label: 'Habilidades' },
  { id: 'traits', label: 'Rasgos' },
]

/** Bolsa, para los objetos: el pack no trae icono por objeto. */
const ITEM_ICON = 'M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2'

/**
 * La ficha como en el concepto (img/ideas_movil.png, "Ficha del personaje"):
 * retrato y nombre con la barra de vida, las caracteristicas en rejilla y el
 * resto en tres pestañas (Inventario, Habilidades, Rasgos). Sale del modelo
 * de vista de ui-logic, ya velado. Sin puntos de energia: el sistema no los
 * tiene, asi que en su lugar van armadura y fortuna.
 */
export function Sheet({ sheet, portraitUri, footer }: { sheet: SheetView; portraitUri?: string | null | undefined; footer?: ReactNode }) {
  const [tab, setTab] = useState<Tab>(sheet.inventory.length > 0 ? 'inventory' : 'skills')
  const hpShare = sheet.hp.max > 0 ? Math.max(0, Math.min(1, sheet.hp.current / sheet.hp.max)) : 0

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.hero}>
        <Portrait path={sheet.portrait} uri={portraitUri} name={sheet.name} size={104} />
        <View style={styles.who}>
          <Text style={styles.name}>{sheet.name}</Text>
          <Text style={styles.sub}>{`${sheet.race} · ${sheet.class}`}</Text>
          <View style={styles.barHead}>
            <Text style={styles.barLabel}>Vida</Text>
            <Text style={styles.barValue}>
              <Text style={styles.barStrong}>{sheet.hp.current}</Text>
              {` / ${sheet.hp.max}`}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(hpShare * 100)}%` }]} />
          </View>
          <View style={styles.minor}>
            <Text style={styles.minorText}>{`Armadura ${sheet.ac === null ? '?' : sheet.ac}`}</Text>
            <Text style={styles.minorText}>{sheet.fortune ? `${sheet.fortune.tier} ${sheet.fortune.result}` : 'Fortuna ?'}</Text>
          </View>
        </View>
      </View>

      {sheet.quote ? <Text style={styles.quote}>{`"${sheet.quote}"`}</Text> : null}
      {sheet.veiled ? <Text style={styles.veil}>{VEIL_NOTE}</Text> : null}
      {sheet.conditions.length > 0 ? (
        <View style={styles.chips}>
          {sheet.conditions.map((c) => (
            <Text key={c} style={[styles.chip, styles.chipDanger]}>
              {c}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.grid}>
        {sheet.stats.map((stat, i) => (
          <View key={stat.key} style={[styles.cell, i % 3 !== 0 && styles.cellLeft, i >= 3 && styles.cellTop]}>
            <Text style={styles.cellLabel}>{stat.label}</Text>
            <Text style={styles.cellValue}>{stat.value}</Text>
            <Text style={styles.cellMod}>{stat.modifier}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'inventory' ? (
        <View style={styles.list}>
          {sheet.inventory.length === 0 && sheet.memoriesRecovered === 0 ? <Text style={styles.empty}>No llevas nada todavía.</Text> : null}
          {sheet.inventory.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon d={ITEM_ICON} size={20} color={theme.colors.gold} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{humanizeId(item.id)}</Text>
                {item.note ? <Text style={styles.rowMeta}>{item.note}</Text> : null}
              </View>
            </View>
          ))}
          {sheet.memoriesRecovered > 0 ? <Text style={styles.rowMeta}>{`Recuerdos recuperados: ${sheet.memoriesRecovered}`}</Text> : null}
        </View>
      ) : null}

      {tab === 'skills' ? (
        <View style={styles.list}>
          {sheet.attacks.map((attack) => (
            <View key={attack.id} style={styles.row}>
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{attack.name}</Text>
                  <Text style={styles.damage}>{attack.damage}</Text>
                </View>
                <Text style={styles.rowMeta}>{[attack.damageType, attack.range].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
          ))}
          {sheet.abilities?.map((ability) => (
            <View key={ability.id} style={styles.row}>
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{ability.name}</Text>
                  {ability.damage ? <Text style={styles.damage}>{ability.damage}</Text> : null}
                </View>
                <Text style={styles.rowMeta}>{[ability.type, ability.damageType, ability.range, abilityUsage(ability)].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.effect}>{ability.effect}</Text>
              </View>
            </View>
          ))}
          {sheet.skills.length > 0 ? (
            <>
              <Text style={styles.section}>Eres bueno en</Text>
              <View style={styles.chips}>
                {sheet.skills.map((s) => (
                  <Text key={s} style={styles.chip}>
                    {s}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {tab === 'traits' ? (
        <View style={styles.list}>
          {sheet.roles.length > 0 ? (
            <>
              <Text style={styles.section}>Rol en el grupo</Text>
              <Text style={styles.body}>{sheet.roles.join(' / ')}</Text>
            </>
          ) : null}
          {sheet.bio ? (
            <>
              <Text style={styles.section}>Quién eres</Text>
              <Text style={styles.body}>{sheet.bio}</Text>
            </>
          ) : null}
          {sheet.goal ? (
            <>
              <Text style={styles.section}>Tu objetivo</Text>
              <Text style={styles.body}>{sheet.goal}</Text>
            </>
          ) : null}
          {sheet.age ? <Text style={styles.rowMeta}>{`Edad: ${sheet.age}`}</Text> : null}
          {!sheet.roles.length && !sheet.bio && !sheet.goal ? <Text style={styles.empty}>Lo que no recuerdas, lo descubres jugando.</Text> : null}
        </View>
      ) : null}
      {footer}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  who: { flex: 1, gap: 4 },
  name: { fontFamily: theme.fonts.serifSemiBold, fontSize: 24, color: theme.colors.ink },
  sub: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  barLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.inkDim },
  barValue: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  barStrong: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink },
  track: { height: 7, borderRadius: 4, backgroundColor: theme.colors.panel3, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: theme.colors.danger },
  minor: { flexDirection: 'row', gap: 12, marginTop: 4 },
  minorText: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.nebula },
  quote: { fontFamily: theme.fonts.serifItalic, fontSize: 16, lineHeight: 22, color: theme.colors.ink, borderLeftWidth: 3, borderLeftColor: theme.colors.accentBright, paddingLeft: 10 },
  veil: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim, backgroundColor: theme.colors.panel2, borderRadius: 12, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  cell: { width: '33.333%', alignItems: 'center', paddingVertical: 10 },
  cellLeft: { borderLeftWidth: 1, borderLeftColor: theme.colors.borderSoft },
  cellTop: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  cellLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.inkDim },
  cellValue: { fontFamily: theme.fonts.uiSemiBold, fontSize: 20, color: theme.colors.ink },
  cellMod: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.nebula },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  tabOn: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.22)' },
  tabText: { fontFamily: theme.fonts.uiMedium, fontSize: 14, color: theme.colors.inkDim },
  tabTextOn: { color: '#ffffff' },
  list: { gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft },
  rowIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.panel3 },
  rowText: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowName: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink },
  rowMeta: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  damage: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, color: theme.colors.gold, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', borderRadius: 6, paddingHorizontal: 6, overflow: 'hidden' },
  effect: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim },
  section: { fontFamily: theme.fonts.uiSemiBold, fontSize: 14, color: theme.colors.ink, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.ink, backgroundColor: theme.colors.panel2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  chipDanger: { color: '#fecaca', backgroundColor: 'rgba(239, 68, 68, 0.16)' },
  body: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 22, color: theme.colors.ink },
  empty: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkFaint },
})
