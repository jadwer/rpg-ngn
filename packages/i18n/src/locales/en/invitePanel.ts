import type { Messages } from '../../types.js'
import type { invitePanel as es } from '../es/invitePanel.js'

export const invitePanel: Messages<typeof es> = {
  solicitudesDeAmistadPendientes: 'Pending friend requests',
  aceptar: 'Accept',
  invitarPorCorreo: 'Invite by email',
  buscar: 'Search',
  amigos: 'Friends:',
  cuandoAlguienTeMande: 'When someone sends you a friend request it shows up here to accept.',
  yaEstaEnLa: 'is already at the table',
  enviarSolicitudDeAmistad: 'Send friend request',
  solicitudEnviadaFaltaQue: 'request sent, waiting for them to accept',
  aceptarSuSolicitud: 'Accept their request',
  amigos2: 'friends',
  cargandoLosPersonajesDel: 'Loading the pack’s characters...',
  correoEjemploCom: 'email@example.com',
}
