import type { Messages } from '../../types.js'
import type { taxonomy as es } from '../es/taxonomy.js'

/** Catalog vocabulary (docs/26, H8). */
export const taxonomy: Messages<typeof es> = {
  genre: {
    misterio: 'Mystery',
    policiaca: 'Crime',
    terror: 'Horror',
    romance: 'Romance',
    drama: 'Drama',
    comedia: 'Comedy',
    fantasia: 'Fantasy',
    'ciencia-ficcion': 'Science fiction',
    intriga: 'Intrigue',
    aventura: 'Adventure',
    venganza: 'Revenge',
    historico: 'Historical',
  },
  style: {
    historia: 'A story told to you',
    mision: 'With a mission',
    libre: 'Open',
  },
  format: {
    'one-shot': 'One-shot',
    aventura: 'Adventure',
    campaña: 'Campaign',
  },
  mode: {
    solo: 'For you',
    grupo: 'For your group',
  },
  session: {
    corta: '30 to 40 min per session',
    media: '1 h per session',
    larga: '2 h per session',
  },
  onePlayer: '1 player',
  allModes: 'For you or your group',
  allGenres: 'All genres',
}
