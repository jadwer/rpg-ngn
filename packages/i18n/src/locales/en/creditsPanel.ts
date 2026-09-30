import type { Messages } from '../../types.js'
import type { creditsPanel as es } from '../es/creditsPanel.js'

export const creditsPanel: Messages<typeof es> = {
  tusCreditos: 'Your credits',
  cargando: 'Loading…',
  masAdelante: 'Later on',
  resumenCompra: '{{name}}: {{price}} for {{turns}} turns.',
  pagoQuedoPendiente: 'The payment is pending. If it completes, the turns will be added automatically.',
}
