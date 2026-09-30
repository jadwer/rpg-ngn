import type { Messages } from '../../types.js'
import type { collectionPage as es } from '../es/collectionPage.js'

export const collectionPage: Messages<typeof es> = {
  tuColeccion: 'Your collection',
  loQueHasGanado: 'What you have earned by playing',
  cargando: 'Loading…',
  aunNoTienesNada: 'You have nothing yet. Every turn you play is a chapter, and chapters open the pass rewards.',
  verElPase: 'See the pass',
  valeHasta: 'valid until',
  vencioEl: 'expired on',
}
