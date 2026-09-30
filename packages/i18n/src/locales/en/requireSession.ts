import type { Messages } from '../../types.js'
import type { requireSession as es } from '../es/requireSession.js'

export const requireSession: Messages<typeof es> = {
  buscandoLaMesa: 'Looking for the table...',
}
