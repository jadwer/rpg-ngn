'use client'

import { characterSheet } from '@rpg-ngn/ui-logic'
import { useState, type ReactNode } from 'react'
import { abilityModifier } from '../lib/pack'
import type { SheetEntry } from '../lib/sheets'
import { Portrait } from './Portrait'
import { Sheet } from './Sheet'

interface Props {
  entries: SheetEntry[]
  /** Pie: de donde sale el estado (seq de la API) o que aun no hay. */
  footer: string
  /** La personalidad escrita por el jugador, debajo de su propia ficha (packs que la piden). */
  persona?: ReactNode
  onClose: () => void
}

/**
 * Fichas de toda la party en un panel lateral (o a pantalla completa en el
 * telefono) sobre la narracion (docs/09, "Fichas"). Recibe las entradas ya
 * decididas (`lib/sheets.ts`): que se ve de cada personaje, quien lo juega
 * y su estado vivo. Quien es tu personaje (la personalidad que escribes) va
 * dentro de tu ficha, que es donde uno la busca (docs/18, D-UX-7).
 */
export function SheetsPanel({ entries, footer, persona, onClose }: Props) {
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
          <>
            <Sheet sheet={sheet} />
            {selected?.mine && persona ? <div className="persona-en-ficha">{persona}</div> : null}
          </>
        ) : entries.length === 0 ? (
          <>
            {/* Un pack que la web no lleva dentro: las fichas completas por API son la E3 del VAM del 19-09. */}
            <p className="hint">Las fichas de este mundo todavía no se muestran aquí; en la app sí.</p>
            {persona ? <div className="persona-en-ficha">{persona}</div> : null}
          </>
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
