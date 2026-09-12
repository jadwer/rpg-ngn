'use client'

import type { Character } from '@rpg-ngn/content'
import { Portrait } from './Portrait'

interface Props {
  characters: readonly Character[]
  /** Personajes que ya juega alguien (no se pueden elegir), con el nombre de quien. */
  taken?: ReadonlyMap<string, string> | undefined
  value: string | null
  onChange: (characterId: string | null) => void
  /** Permite dejarlo sin personaje (anfitrion que solo mira). */
  allowNone?: boolean | undefined
}

/** Selector de personaje con retrato, como la cuadricula de apps/sheets. */
export function CharacterPicker({ characters, taken, value, onChange, allowNone = false }: Props) {
  return (
    <div className="picker" role="radiogroup">
      {allowNone ? (
        <button type="button" role="radio" aria-checked={value === null} className={`option${value === null ? ' selected' : ''}`} onClick={() => onChange(null)}>
          <span className="portrait placeholder" style={{ width: '100%', height: 'auto', aspectRatio: '1', display: 'flex', fontSize: '2rem', marginBottom: 8 }}>
            ?
          </span>
          <div className="n">Sin personaje</div>
          <div className="r">Solo miras y diriges la mesa</div>
        </button>
      ) : null}
      {characters.map((character) => {
        const owner = taken?.get(character.id) ?? null
        const selected = value === character.id
        return (
          <button type="button" key={character.id} role="radio" aria-checked={selected} disabled={!!owner} className={`option${selected ? ' selected' : ''}${owner ? ' taken' : ''}`} onClick={() => onChange(character.id)}>
            <Portrait path={character.portrait} name={character.name} muted={!!owner} />
            <div className="n">{character.name}</div>
            <div className="r">
              {character.race}, {character.class}
            </div>
            {owner ? <span className="tag">lo juega {owner}</span> : <span className="tag">{character.roles.join(' / ')}</span>}
          </button>
        )
      })}
    </div>
  )
}
