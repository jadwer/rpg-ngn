import { diceFaces, faceRange, runDieRoll, sidesOf } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { DICE_FACES } from '../../generated/dice'
import { theme } from '../../theme'
import type { DiceRollerProps, RollOutcome } from './DiceRoller'

type Phase = 'idle' | 'holding' | 'settling' | 'landed'

/**
 * El dado con las caras de la lamina (d20, d8 y d6; el resto con el numero
 * grande sobre un dado generico). Se mantiene presionado y al soltar frena
 * sobre el numero que trae `resolve`. Las caras que giran salen de
 * `Math.random`: en Hermes no hay `crypto`, y no hace falta, porque el
 * numero de verdad lo pone el servidor.
 */
export function SpriteDie({ die, label, disabled = false, resolve, onLanded, onFailed, large = false }: DiceRollerProps) {
  const [face, setFace] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const pressedAt = useRef(0)
  const spin = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null)
  const range = faceRange(die)
  const sides = sidesOf(die)
  const random = () => range.min + Math.floor(Math.random() * (range.max - range.min + 1))

  useEffect(
    () => () => {
      if (spin.current) clearInterval(spin.current)
      if (rest.current) clearTimeout(rest.current)
      cancel.current?.()
    },
    [],
  )

  const pressIn = () => {
    if (disabled || phase === 'holding' || phase === 'settling') return
    pressedAt.current = Date.now()
    setPhase('holding')
    setOutcome(null)
    setFace(random())
    spin.current = setInterval(() => setFace(random()), 60)
  }

  const pressOut = () => {
    if (!spin.current) return
    clearInterval(spin.current)
    spin.current = null
    setPhase('settling')
    let got: RollOutcome | null = null
    cancel.current = runDieRoll({
      die,
      heldMs: Date.now() - pressedAt.current,
      resolve: () => resolve().then((o) => ((got = o), o.result)),
      onFace: setFace,
      onLanded: (result) => {
        const landed = got ?? { result }
        setFace(result)
        setOutcome(landed)
        setPhase('landed')
        onLanded(landed)
        // Se apaga el brillo, pero la cara se queda: el numero sigue a la vista.
        rest.current = setTimeout(() => setPhase('idle'), 1800)
      },
      onFailed: (error) => {
        setPhase('idle')
        setFace(null)
        onFailed?.(error)
      },
    })
  }

  const rolling = phase === 'holding' || phase === 'settling'
  const faces = outcome ? diceFaces(die, outcome.result, outcome.rolls ?? null) : face !== null ? diceFaces(die, face) : []
  const idle = phase === 'idle' ? diceFaces(`1d${sides}`, sides)[0] : undefined
  const shown = face !== null ? face : sides
  const size = large ? styles.spriteLarge : styles.sprite
  const glow = phase === 'landed' ? styles.landed : null

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={({ pressed }) => [styles.die, rolling && styles.rolling, disabled && styles.off, pressed && !rolling && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Tirar ${die}: mantén presionado y suelta`}
    >
      <View style={styles.faces}>
        {faces.length > 0 ? (
          faces.map((f, index) => {
            const source = DICE_FACES[f.asset]
            return source ? <Image key={`${f.asset}-${index}`} source={source} style={[size, glow]} /> : <Generic key={`g-${index}`} value={f.value} large={large} landed={phase === 'landed'} />
          })
        ) : idle && DICE_FACES[idle.asset] ? (
          <Image source={DICE_FACES[idle.asset]} style={size} />
        ) : (
          <Generic value={shown} large={large} landed={phase === 'landed'} />
        )}
      </View>
      {outcome && outcome.rolls && outcome.rolls.length > 1 ? <Text style={styles.total}>{outcome.result}</Text> : null}
      <Text style={styles.label}>{label ?? die}</Text>
    </Pressable>
  )
}

/** Un dado sin lamina: el numero grande sobre una silueta oscura. */
function Generic({ value, large, landed }: { value: number; large: boolean; landed: boolean }) {
  return (
    <View style={[styles.generic, large && styles.genericLarge, landed && styles.landed]}>
      <Text style={[styles.genericText, large && styles.genericTextLarge]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  die: { alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: theme.colors.panel },
  rolling: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.22)' },
  off: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  faces: { flexDirection: 'row', gap: 6 },
  sprite: { width: 56, height: 56, borderRadius: 10 },
  spriteLarge: { width: 96, height: 96, borderRadius: 14 },
  landed: { borderWidth: 2, borderColor: theme.colors.goldBright },
  generic: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.gold, backgroundColor: '#1a1526', alignItems: 'center', justifyContent: 'center' },
  genericLarge: { width: 96, height: 96, borderRadius: 14 },
  genericText: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.goldBright },
  genericTextLarge: { fontSize: 38 },
  total: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldBright },
  label: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.inkDim },
})
