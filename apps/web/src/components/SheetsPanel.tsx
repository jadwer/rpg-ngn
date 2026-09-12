'use client'

import { characterSheet } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { abilityModifier } from '../lib/pack'
import type { SheetEntry } from '../lib/sheets'
import { Portrait } from './Portrait'
import { Sheet } from './Sheet'

interface Props {
  entries: SheetEntry[]
  /** Pie: de donde sale el estado (seq de la API) o que aun no hay. */
  footer: string
  onClose: () => void
}

/**
 * Fichas de toda la party en un panel lateral (o a pantalla completa en el
 * telefono) sobre la narracion (docs/09, "Fichas"). Recibe las entradas ya
 * decididas (`lib/sheets.ts`): que se ve de cada personaje, quien lo juega
 * y su estado vivo.
 */
export function SheetsPanel({ entries, footer, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? entries.find((e) => e.character.id === selectedId) : undefined
  const sheet = selected ? characterSheet(selected.character, { visibility: selected.visibility, state: selected.state, modifier: abilityModifier }) : null

  return (
    <aside className="aside" aria-label="Fichas de la party">
      <div className="head">
        {selected ? (
          <button type="button" className="btn ghost small" onClick={() => setSelectedId(null)}>
            Fichas
          </button>
        ) : (
          <span style={{ width: 64 }} />
        )}
        <h2>{selected ? selected.character.name : 'La party'}</h2>
        <button type="button" className="btn ghost small" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="content">
        {sheet ? (
          <Sheet sheet={sheet} />
        ) : (
          <>
            <div className="party-grid">
              {entries.map(({ character, slot, visibility, state, muted, mine }) => (
                <button type="button" key={character.id} className={`pc${slot.kind === 'free' ? ' free' : ''}${mine ? ' mine' : ''}`} onClick={() => setSelectedId(character.id)}>
                  <Portrait path={character.portrait} name={character.name} muted={muted} />
                  <div className="n">{character.name}</div>
                  <div className="r">
                    {character.race}
                    <br />
                    {character.class}
                  </div>
                  {state ? (
                    <div className="hp">
                      Vida {state.hp.current}/{state.hp.max}
                    </div>
                  ) : null}
                  {slot.kind === 'taken' ? <span className={`tag${mine ? ' mine' : ''}`}>{mine ? 'tu personaje' : slot.player}</span> : null}
                  {slot.kind === 'free' ? <span className="tag free">{visibility.veiled ? 'disponible, sin memoria' : 'disponible'}</span> : null}
                </button>
              ))}
            </div>
            <div className="foot">{footer}</div>
          </>
        )}
      </div>
    </aside>
  )
}
