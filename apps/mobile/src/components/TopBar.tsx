import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTopInset } from '../hooks/useTopInset'
import { theme } from '../theme'
import { LogoHorizontal } from './Brand'
import { LanguageButton } from './LanguageButton'

interface Props {
  client: ApiClient
  /** Con cuenta, el avatar que abre Perfil. */
  user?: { name: string } | undefined
  onProfile?: (() => void) | undefined
  /** Una accion mas antes del idioma (por ejemplo "Mis mundos"). */
  extra?: ReactNode
}

/**
 * La cabecera de las pestañas (Mesas, Mundos, Tienda, Comunidad): logo a la
 * izquierda; a la derecha el idioma, como en la web, y el avatar. Antes cada
 * pantalla tenia su copia (30-09).
 */
export function TopBar({ client, user, onProfile, extra }: Props) {
  const topInset = useTopInset()
  return (
    <View style={[styles.header, { paddingTop: topInset + 8 }]}>
      <LogoHorizontal height={28} color={theme.colors.ink} />
      <View style={styles.right}>
        {extra}
        <LanguageButton client={client} />
        {user && onProfile ? (
          <Pressable onPress={onProfile} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('mobile.tablesScreen.tuCuenta')} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name.trim()[0] ?? '?').toUpperCase()}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent },
  avatarText: { fontFamily: theme.fonts.display, fontSize: 16, color: '#ffffff' },
})
