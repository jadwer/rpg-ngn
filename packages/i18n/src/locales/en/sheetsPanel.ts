import type { Messages } from '../../types.js'
import type { sheetsPanel as es } from '../es/sheetsPanel.js'

export const sheetsPanel: Messages<typeof es> = {
  fichas: 'Sheets',
  cerrar: 'Close',
  cargandoLasFichasDel: 'Loading the world’s sheets...',
  fichasDeLaParty: 'Party sheets',
  vida: 'HP {{current}}/{{max}}',
  tuPersonaje: 'your character',
  disponibleSinMemoria: 'available, no memory',
  disponible: 'available',
}
