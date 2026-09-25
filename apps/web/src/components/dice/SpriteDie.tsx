'use client'

import { diceFaces, faceRange, runDieRoll, sidesOf } from '@rpg-ngn/ui-logic'
import { useEffect, useRef, useState } from 'react'
import type { DiceRollerProps, RollOutcome } from './DiceRoller'

/**
 * El dado con las caras de la lamina de Gabino (d20, d8 y d6; el resto con
 * el numero grande sobre un dado generico). Se mantiene presionado y al
 * soltar frena sobre el numero que trae `resolve`. Lo unico que sabe es
 * pintar caras: la maquina de estados vive en ui-logic (`runDieRoll`).
 */
export function SpriteDie({ die, label, disabled = false, resolve, onLanded, onFailed, large = false }: DiceRollerProps) {
  const [face, setFace] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)
  const [phase, setPhase] = useState<'idle' | 'holding' | 'settling' | 'landed'>('idle')
  const pressedAt = useRef(0)
  const spin = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null)
  const range = faceRange(die)
  const sides = sidesOf(die)

  useEffect(
    () => () => {
      if (spin.current) clearInterval(spin.current)
      if (rest.current) clearTimeout(rest.current)
      cancel.current?.()
    },
    [],
  )

  const start = () => {
    if (disabled || phase === 'holding' || phase === 'settling') return
    pressedAt.current = Date.now()
    setPhase('holding')
    setOutcome(null)
    setFace(range.min + Math.floor(Math.random() * (range.max - range.min + 1)))
    spin.current = setInterval(() => setFace(range.min + Math.floor(Math.random() * (range.max - range.min + 1))), 60)
  }

  const release = () => {
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
  // Al aterrizar se pintan todos los dados (2d6 son dos cubos); mientras gira, uno.
  const faces = outcome ? diceFaces(die, outcome.result, outcome.rolls ?? null) : face !== null ? diceFaces(die, face) : []
  const shown = face !== null ? face : sides
  const idleAsset = diceFaces(`1d${sides}`, sides)[0]?.asset ?? null

  return (
    <button
      type="button"
      className={`sprite-die${rolling ? ' rolling' : ''}${phase === 'landed' ? ' landed' : ''}${large ? ' large' : ''}`}
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
      <span className="faces" aria-hidden>
        {faces.length > 0 ? (
          faces.map((f, index) => <img key={`${f.asset}-${index}`} src={`/dice/${f.asset}.png`} alt="" className="sprite" />)
        ) : phase === 'idle' && idleAsset ? (
          <img src={`/dice/${idleAsset}.png`} alt="" className="sprite" />
        ) : (
          <span className="generic">
            <b>{shown}</b>
          </span>
        )}
      </span>
      {outcome && outcome.rolls && outcome.rolls.length > 1 ? <b className="total">{outcome.result}</b> : null}
      <span className="label">{label ?? die}</span>
    </button>
  )
}
