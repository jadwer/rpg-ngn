import { t } from '@rpg-ngn/i18n'
import { isRunningInExpoGo } from 'expo'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { theme } from '../theme'

interface Props extends TextInputProps {
  label: string
  hint?: string | undefined
}

/**
 * Dentro de Expo Go, el autocompletado de Android pinta un velo amarillo (que
 * sobre el fondo oscuro sale verde olivo, con esquinas rectas) encima del
 * campo que rellena; el tema que lo quitaria es el de Expo Go, no el nuestro.
 * Ahi se apaga el autocompletado. En la app instalada se queda, y el velo lo
 * quita plugins/withNoAutofillHighlight.js.
 */
const NO_AUTOFILL = isRunningInExpoGo() ? ({ importantForAutofill: 'no', autoComplete: 'off' } as const) : {}

/**
 * Campo de texto como el concepto (img/ideas_movil.png): etiqueta en Inter,
 * caja rellena y redondeada, borde violeta con el foco. Con `secureTextEntry`
 * lleva el ojo para ver lo escrito: con puntitos, un tester no supo cual de
 * las dos contraseñas estaba mal (20-10).
 */
export function Field({ label, hint, style, onFocus, onBlur, secureTextEntry, ...input }: Props) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const secret = secureTextEntry === true
  const eyeLabel = visible ? t('auth.hidePassword') : t('auth.showPassword')
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={theme.colors.inkFaint}
          style={[styles.input, secret && styles.withEye, focused && styles.focused, style]}
          secureTextEntry={secret && !visible}
          {...(secret ? { autoCapitalize: 'none' as const, autoCorrect: false } : {})}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...input}
          {...NO_AUTOFILL}
        />
        {secret ? (
          <Pressable style={styles.eye} onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={eyeLabel} accessibilityState={{ selected: visible }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={theme.colors.inkDim} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <Circle cx={12} cy={12} r={3} />
              {visible ? null : <Path d="M4 4l16 16" />}
            </Svg>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.inkDim },
  input: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  focused: { borderColor: theme.colors.accentBright },
  withEye: { paddingRight: 48 },
  eye: { position: 'absolute', right: 6, top: 0, bottom: 0, width: 40, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim },
})
