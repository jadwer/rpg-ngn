'use client'

import { packPortraitUrl, type PackCharacter } from '@rpg-ngn/api-client'

interface Props {
  packId: string
  characters: readonly PackCharacter[]
  value: string | null
  onChange: (characterId: string | null) => void
  /** Permite dejarlo sin personaje (anfitrion que solo mira). */
  allowNone?: boolean | undefined
}

/**
 * Selector de personaje para un pack que vive en el servidor.
 *
 * El hermano `CharacterPicker` pinta fichas completas del pack empaquetado
 * en la web (el piloto). De un pack instalado en el servidor solo llega lo
 * justo para elegir, y el retrato lo sirve la API.
 */
export function RemoteCharacterPicker({ packId, characters, value, onChange, allowNone = false }: Props) {
  return (
    <div className="picker" role="radiogroup">
      {allowNone ? (
        <button type="button" role="radio" aria-checked={value === null} className={`option${value === null ? ' selected' : ''}`} onClick={() => onChange(null)}>
          <span className="portrait placeholder" style={{ width: '100%', height: 'auto', aspectRatio: '1', display: 'flex', fontSize: '2rem', marginBottom: 8 }}>
            ?
          </span>
          <div className="name">Sin personaje</div>
          <div className="hint">Solo miras y diriges la mesa</div>
        </button>
      ) : null}

      {characters.map((character) => {
        const src = packPortraitUrl(packId, character.portrait)
        return (
          <button
            key={character.id}
            type="button"
            role="radio"
            aria-checked={value === character.id}
            className={`option${value === character.id ? ' selected' : ''}`}
            onClick={() => onChange(character.id)}
          >
            {src ? (
              <img src={src} alt={`Retrato de ${character.name}`} className="portrait" style={{ width: '100%', height: 'auto', aspectRatio: '1', objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <span className="portrait placeholder" style={{ width: '100%', height: 'auto', aspectRatio: '1', display: 'flex', fontSize: '2rem', marginBottom: 8 }}>
                {character.name.slice(0, 1)}
              </span>
            )}
            <div className="name">{character.name}</div>
            <div className="hint">{character.characterClass}</div>
            {character.roles.length > 0 ? <div className="hint">{character.roles.join(' / ')}</div> : null}
          </button>
        )
      })}
    </div>
  )
}
