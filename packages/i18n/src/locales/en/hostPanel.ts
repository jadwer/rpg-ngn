import type { Messages } from '../../types.js'
import type { hostPanel as es } from '../es/hostPanel.js'

export const hostPanel: Messages<typeof es> = {
  anfitrion: 'Host',
  sesion: 'Session',
  ajustesDeLaMesa: 'Table settings',
  queSesionJuegan: 'Which session you play',
  codigo: 'Code',
  notaDeLaSesion: 'Session note',
  abrirSesion: 'Open session',
  cliffhangerParaLaProxima: 'Cliffhanger for next time',
  cerrarSesion: 'Close session',
  siCerrarYCongelar: 'Yes, close and freeze the state',
  noSeguirJugando: 'No, keep playing',
  mandoDelAnfitrion: 'Host controls',
  opcionalConQueSe: 'Optional: what the table is left with',
  premisa: 'Premise',
  reglasDeLaMesa: 'Table rules',
  directorDeJuego: 'Game master',
  yaJugada: ' (already played)',
  momentoDelMundo: 'Moment in the world or what is happening today; the GM receives it',
}
