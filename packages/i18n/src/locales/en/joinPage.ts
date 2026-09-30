import type { Messages } from '../../types.js'
import type { joinPage as es } from '../es/joinPage.js'

export const joinPage: Messages<typeof es> = {
  teInvitaronAUna: 'You were invited to a table',
  buscandoLaMesa: 'Looking for the table...',
  siCreesQueEs: 'If you think it is a mistake, ask the host to send you the link again.',
  irAlInicio: 'Go home',
  terminos: 'Terms',
  avisoDePrivacidad: 'privacy notice',
  aquiElDirectorDe: 'Here the game master is the engine: nobody in the group needs to know how to run a game.',
  teInvita: '{{name}} is inviting you.',
  siNoTienesCuenta: 'If you do not have an account, we will ask you to create one (name, email and password) and you will come back here.',
  y: 'and',
}
