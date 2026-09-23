import { holdReleaseMs, quickRoll, settleSchedule, type QuickRoll } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { theme } from '../theme'
import { Icon, ICON } from './Icon'

interface Props {
  die: string
  disabled?: boolean
  onRolled: (roll: QuickRoll) => void
}

/** Rango de caras de una expresion simple ("1d20", "2d6"): lo que se ve girar. */
function faces(die: string): { min: number; max: number } {
  const m = /^(\d+)d(\d+)/.exec(die)
  const count = m ? Number(m[1]) : 1
  const sides = m ? Number(m[2]) : 20
  return { min: count, max: count * sides }
}

/**
 * El dado de mantener presionado (Gabino, 23-09): mientras el dedo esta
 * encima las caras corren; al soltar sigue girando y frena, entre 1 y 5
 * segundos segun cuanto se mantuvo (holdReleaseMs), y se queda en el
 * resultado. El numero lo tira el generador al terminar: la duracion da la
 * sensacion de haberlo tirado uno, no cambia las probabilidades.
 */
export function HoldDie({ die, disabled = false, onRolled }: Props) {
  const [face, setFace] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const pressedAt = useRef(0)
  const spin = useRef<ReturnType<typeof setInterval> | null>(null)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const { min, max } = faces(die)
  const randomFace = () => min + Math.floor(Math.random() * (max - min + 1))

  useEffect(
    () => () => {
      if (spin.current) clearInterval(spin.current)
      timers.current.forEach(clearTimeout)
    },
    [],
  )

  const pressIn = () => {
    if (disabled || rolling) return
    pressedAt.current = Date.now()
    setRolling(true)
    setFace(randomFace())
    spin.current = setInterval(() => setFace(randomFace()), 60)
  }

  const pressOut = () => {
    if (!spin.current) return
    clearInterval(spin.current)
    spin.current = null
    let at = 0
    for (const step of settleSchedule(holdReleaseMs(Date.now() - pressedAt.current))) {
      at += step
      timers.current.push(setTimeout(() => setFace(randomFace()), at))
    }
    timers.current.push(
      setTimeout(() => {
        const roll = quickRoll(die)
        setFace(roll.result)
        onRolled(roll)
        timers.current.push(
          setTimeout(() => {
            setRolling(false)
            setFace(null)
          }, 900),
        )
      }, at),
    )
  }

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={({ pressed }) => [styles.die, rolling && styles.rolling, disabled && styles.off, pressed && !rolling && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Tirar ${die}: mantén presionado y suelta`}
    >
      {rolling ? <Text style={styles.face}>{face ?? ''}</Text> : <Icon d={ICON.dice} size={15} color={theme.colors.inkDim} />}
      <Text style={styles.label}>{die}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  die: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.colors.panel, minWidth: 64 },
  rolling: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.22)' },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  face: { fontFamily: theme.fonts.uiBold, fontSize: 15, color: '#ffffff', minWidth: 18, textAlign: 'center' },
  label: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.ink },
})
