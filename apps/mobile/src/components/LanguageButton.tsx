import { t, type Language } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTopInset } from '../hooks/useTopInset'
import { useLanguage } from '../state/language'
import { theme } from '../theme'
import { Icon, ICON } from './Icon'

/**
 * El idioma arriba a la derecha, como en la web (Gabino, 30-09): el globo con
 * el codigo actual abre la lista. Con sesion la eleccion tambien se guarda en
 * la cuenta, para que los correos lleguen en ese idioma.
 */
export function LanguageButton({ client }: { client?: ApiClient | null | undefined }) {
  const { lang, choose, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const topInset = useTopInset()

  const pick = (l: Language) => {
    setOpen(false)
    if (l === lang) return
    // Si falla, el telefono ya la recuerda.
    client?.updateProfile({ locale: l }).catch(() => undefined)
    choose(l)
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={({ pressed }) => [styles.button, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('common.language')}>
        <Icon d={ICON.globe} size={20} color={theme.colors.inkDim} />
        <Text style={styles.code}>{lang.toUpperCase()}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('support.cerrar')}>
          <View style={[styles.menu, { marginTop: topInset + 56 }]} accessibilityRole="menu">
            <Text style={styles.title}>{t('common.language')}</Text>
            {languages.map((l) => (
              <Pressable key={l} onPress={() => pick(l)} style={({ pressed }) => [styles.item, lang === l && styles.itemOn, pressed && styles.pressed]} accessibilityRole="menuitem" accessibilityState={{ selected: lang === l }}>
                <Text style={[styles.itemText, lang === l && styles.itemTextOn]}>{t(`common.languages.${l}`)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.borderSoft },
  pressed: { opacity: 0.7 },
  code: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.inkDim },
  backdrop: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 16, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  menu: { minWidth: 200, gap: 4, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  title: { fontFamily: theme.fonts.display, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold, paddingHorizontal: 8, paddingVertical: 4 },
  item: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 },
  itemOn: { backgroundColor: 'rgba(124, 58, 237, 0.18)' },
  itemText: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.ink },
  itemTextOn: { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.accentBright },
})
