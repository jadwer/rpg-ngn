import type { Messages } from '../../types.js'
import type { newTable as es } from '../es/newTable.js'

export const newTable: Messages<typeof es> = {
  irALaMesa: 'Go to the table',
  nuevaMesa: 'New table',
  nombre: 'Name',
  cargando: 'Loading…',
  cargandoLosPersonajesDel: 'Loading the pack’s characters...',
  cargandoElPack: 'Loading the pack...',
  sePuedeCambiarY: 'It can be changed and tested later from the host controls.',
  opcionalElDirectorDe: 'Optional: the game master uses it as a starting point.',
  despuesPodrasInvitarA: 'Later you can invite your friends.',
  laMesa: 'The table',
  queVanAJugar: 'What you will play',
  tuPersonaje: 'Your character',
  directorDeJuego: 'Game master',
  premisa: 'Premise',
  premisaDeLaMesa: 'Table premise',
  laMesaYaExiste: 'The table already exists. Invite your friends now or later from the host controls; whenever you want, come in and open the session.',
  invitar: 'Invite',
}
