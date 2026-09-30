import type { Messages } from '../../types.js'
import type { packs as es } from '../es/packs.js'

export const packs: Messages<typeof es> = {
  'turnos-12': { name: 'A Handful', description: 'To finish the scene you left halfway.' },
  'turnos-60': { name: 'Pouch', description: 'A night of play with your table.' },
  'turnos-190': { name: 'Chest', description: 'Several sessions in a row, without topping up each time.' },
  'turnos-390': { name: 'Coffer', description: 'For tables that play every week.' },
  'turnos-660': { name: 'Treasure', description: 'A long campaign, with a bonus.' },
  'turnos-1400': { name: 'Dragon\'s Hoard', description: 'So you do not have to think about turns for a long time.' },
  'plata': { name: 'Silver', description: 'Soon: turns with no cap under fair use, no countdown, redo your last action and the Bard\'s Call.' },
  'oro': { name: 'Gold', description: 'Soon: everything in Silver, illustrations with a better model and neural voice.' },
  'diamante': { name: 'Diamond', description: 'Soon: everything in Gold, tools for streamers and the Liberation of Knowledge.' },
}
