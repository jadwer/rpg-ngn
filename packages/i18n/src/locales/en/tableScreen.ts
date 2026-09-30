import type { Messages } from '../../types.js'
import type { tableScreen as es } from '../es/tableScreen.js'

export const tableScreen: Messages<typeof es> = {
  paraElegirOtroCodigo: 'To pick another code or leave a note for the GM, open Host in the game bar.',
  bajarALoNuevo: 'Jump to what is new',
  narrativa: 'Narrative',
  dialogo: 'Dialogue',
  entendido: 'Got it',
  modoPantalla: 'Screen mode',
  salirDePantalla: 'Leave screen mode',
  eligeTuPersonaje: 'Pick your character',
  losQueYaJuega: 'Characters someone already plays cannot be picked: the first to arrive keeps it. Without a character you can read, but not answer.',
  cargandoLosPersonajesDel: 'Loading the pack’s characters...',
  jugarConEstePersonaje: 'Play this character',
  arrastraParaVerMas: 'Drag to see more scene or more text',
  escena: 'Scene',
  inicioDeLaPartida: 'Start of the game',
  anfitrion: 'Host',
  lectura: 'Reading',
  vista: 'View',
  voz: 'Voice',
  compartirLaHistoria: 'Share the story',
  pantalla: 'Screen',
  tamanoDelTexto: 'Text size',
  textoMasPequeno: 'Smaller text',
  textoMasGrande: 'Bigger text',
}
