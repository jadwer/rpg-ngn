import type { Messages } from '../../types.js'
import type { deleteAccount as es } from '../es/deleteAccount.js'

export const deleteAccount: Messages<typeof es> = {
  borrarMiCuenta: 'Delete my account',
  avisoDePrivacidad: 'privacy notice',
  quieroBorrarMiCuenta: 'I want to delete my account',
  comprobando: 'Checking...',
  antesTienesQueRetirar: 'First you have to retire the tables you host, so they are not left without anyone to open sessions:',
  estoNoSePuede: 'This cannot be undone.',
  desaparecenTuNombreTu: 'Your name, your email and your unused credits disappear. What you wrote in your games stays, without your name.',
  escribeTuContrasenaPara: 'Write your password to confirm',
  cancelar: 'Cancel',
}
