import type { Messages } from '../../types.js'
import type { checkout as es } from '../es/checkout.js'

export const checkout: Messages<typeof es> = {
  continuarLaAventura: 'Continue the adventure',
  cancelar: 'Cancel',
  preparandoElPago: 'Preparing the payment…',
  cerrar: 'Close',
  pagoQuedoPendiente: 'The payment is pending. If it completes, you will see it in your account automatically.',
}
