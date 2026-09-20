'use client'

import { cleanPersona, PERSONA_MAX, PERSONA_TEMPLATE } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'

interface Props {
  characterName: string
  /** Lo guardado en el servidor; null si no ha escrito nada. */
  saved: string | null
  busy: boolean
  /** Guarda; resuelve true si el servidor lo acepto. */
  onSave: (persona: string | null) => Promise<boolean>
}

/**
 * La personalidad del personaje, escrita por su jugador: el arquetipo viene
 * del pack, quien es lo decide quien lo juega. Solo la ve el jugador y el DM
 * (lleva su secreto). Plegado cuando ya hay algo escrito; abierto cuando no,
 * porque es lo primero que conviene hacer al sentarse.
 */
export function PersonaPanel({ characterName, saved, busy, onSave }: Props) {
  const [expanded, setExpanded] = useState(saved === null)
  const [text, setText] = useState(saved ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Si el servidor trae otra version (otro dispositivo), se adopta mientras no se este editando.
  useEffect(() => {
    setText((current) => (current.trim() === '' || current === saved ? (saved ?? '') : current))
  }, [saved])

  const dirty = (cleanPersona(text).persona ?? null) !== saved

  return (
    <section className="persona" aria-label="Tu personaje">
      <button type="button" className="head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className="t">Tu personaje: {characterName}</span>
        <span className="s">{saved ? 'Personalidad escrita' : 'Escribe cómo es'}</span>
        <span className="muted">{expanded ? 'ocultar' : 'mostrar'}</span>
      </button>
      {expanded ? (
        <div className="body stack">
          <p className="hint">El pack pone el arquetipo; quién es lo decides tú. Solo lo ven tú y el DM, que lo usa para jugarte el mundo. Responde a lo que quieras de esto:</p>
          <textarea
            className="textarea"
            name="personalidad"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
              setDone(false)
            }}
            placeholder={PERSONA_TEMPLATE}
            rows={7}
            maxLength={PERSONA_MAX + 50}
          />
          <div className="row">
            <button
              type="button"
              className="btn primary small"
              disabled={busy || !dirty}
              onClick={() => {
                const cleaned = cleanPersona(text)
                if (cleaned.error) {
                  setError(cleaned.error)
                  return
                }
                void onSave(cleaned.persona).then((ok) => setDone(ok))
              }}
            >
              Guardar
            </button>
            <span className="hint">
              {error ?? (done ? 'Guardado: el DM lo lee desde el próximo turno.' : `${text.trim().length}/${PERSONA_MAX}`)}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
