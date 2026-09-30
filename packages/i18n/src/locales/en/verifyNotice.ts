import type { Messages } from '../../types.js'
import type { verifyNotice as es } from '../es/verifyNotice.js'

export const verifyNotice: Messages<typeof es> = {
  confirmaTuCorreo: 'Confirm your email',
  paraCrearMesasY: 'Creating tables and being a host needs a confirmed email. Joining someone else’s table does not.',
}
