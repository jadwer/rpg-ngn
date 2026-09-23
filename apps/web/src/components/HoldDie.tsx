'use client'

import { holdReleaseMs, quickRoll, settleSchedule, type QuickRoll } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'

interface Props {
  die: string
  disabled?: boolean
  onRolled: (roll: QuickRoll) => void
}

function faces(die: string): { min: number; max: number } {
  const m = /^(\d+)d(\d+)/.exec(die)
  const count = m ? Number(m[1]) : 1
  return { min: count, max: count * (m ? Number(m[2]) : 20) }
}

/**
 * El dado de mantener presionado, igual que en la app (Gabino, 23-09):
 * mientras se mantiene, las caras corren; al soltar frena entre 1 y 5
 * segundos segun cuanto se mantuvo. El numero lo tira el generador al final,
 * asi que la duracion no cambia las probabilidades. Con teclado, Enter tira
 * con la inercia minima.
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

  const start = () => {
    if (disabled || rolling) return
    pressedAt.current = Date.now()
    setRolling(true)
    setFace(randomFace())
    spin.current = setInterval(() => setFace(randomFace()), 60)
  }

  const release = () => {
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
    <button
      type="button"
      className={`hold-die${rolling ? ' rolling' : ''}`}
      disabled={disabled}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        start()
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') release()
      }}
      title="Mantén presionado y suelta"
      aria-label={`Tirar ${die}: mantén presionado y suelta`}
    >
      {rolling ? <b className="face">{face ?? ''}</b> : null}
      <span>{die}</span>
    </button>
  )
}
