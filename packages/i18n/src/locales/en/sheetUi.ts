import type { Messages } from '../../types.js'
import type { sheetUi as es } from '../es/sheetUi.js'

export const sheetUi: Messages<typeof es> = {
  estado: 'Status',
  conQuePeleas: 'What you fight with',
  queSabesHacer: 'What you can do',
  eresBuenoEn: 'You are good at',
  rolEnElGrupo: 'Role in the group',
  loQueLlevas: 'What you carry',
  quienEres: 'Who you are',
  tuObjetivo: 'Your goal',
  veilNote: 'Your character does not remember who they are. Choose by what you see: race, class and what they can do. The rest you discover by playing.',
}
