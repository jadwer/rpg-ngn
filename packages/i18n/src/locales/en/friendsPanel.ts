import type { Messages } from '../../types.js'
import type { friendsPanel as es } from '../es/friendsPanel.js'

export const friendsPanel: Messages<typeof es> = {
  conTusAmigosInvitarlos: 'With your friends, inviting them to a table is picking them from the list. To seat someone who is not a friend, the table’s invitation link is enough.',
  quiereSerTuAmigo: 'wants to be your friend',
  aceptar: 'Accept',
  buscar: 'Search',
  enviarSolicitud: 'Send request',
  solicitudEnviadaFaltaQue: 'request sent, waiting for them to accept',
  aceptarSuSolicitud: 'Accept their request',
  yaSonAmigos: 'already friends',
  tusAmigos: 'Your friends:',
  todaviaNoTienesAmigos: 'You have no friends here yet.',
  amigos: 'Friends',
  correoDelAnfitrionO: 'host’s or player’s email',
}
